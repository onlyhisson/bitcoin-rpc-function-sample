const Big = require("big.js");
const {
  validateCoinAmount,
  validateFeeAmount,
  isNull,
  debugLog,
  getFormatUnixTime,
  satoshiToBtc,
} = require("../util");
const { getConnection } = require("../db");
const { getWalletInfos, findWalletAddress } = require("../db/wallet");
const { findUnspentTxOutputs } = require("../db/tx_output");
const {
  findWithdrawalCoinReq,
  insWithdrawalCoinReq,
  updateWithdrawalCoinReqById,
  insWithdrawalCoinToAddrs,
} = require("../db/assets");
const { getLastMempoolInfo } = require("../db/block");
const { validateAddress } = require("../util/rpc/util");
const { getBlockCount } = require("../util/rpc/block");
const {
  authWalletPassPhrase,
  getWalletBalances,
  signRawTxWithWallet,
} = require("../util/rpc/wallet");
const {
  createRawTransaction,
  testMemPoolAccept,
  sendRawTransaction,
} = require("../util/rpc/transaction");

const MIN_OUT_AMT = "0.00001000"; // 최소 출금액

async function getWithdrawalCoinFee(params) {
  let conn = null;

  try {
    const { addressId, toAddresses } = params;

    // 유효성 : null 확인
    if (
      isNull(addressId) ||
      isNull(toAddresses) ||
      !Array.isArray(toAddresses)
    ) {
      throw { message: `invalid parameter` };
    }

    conn = await getConnection();

    const { address } = await getWalletInfoByAddressId(conn, addressId);

    const utxos = await findUnspentTxOutputs(conn, { address });

    // toAddresses.length + 1
    // 출금 주소로 남은 잔액 보내야 하기 때문에(toCnt = 입금 주소 개수 + 출금 주소)
    // 전액 출금 처리시 + 1 할 필요 없으나 현재는 무시한다.
    const fee = await getTxFee(conn, {
      fromCnt: utxos.length,
      toCnt: toAddresses.length + 1,
    });

    return { ...fee };
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function createWithdrawalCoinReq(params) {
  let conn = null;
  const updatedAt = getFormatUnixTime();

  try {
    const { addressId, fee, toAddresses } = params;

    // 유효성 : null 확인
    if (
      isNull(addressId) ||
      isNull(fee) ||
      isNull(toAddresses) ||
      !Array.isArray(toAddresses)
    ) {
      throw { message: `invalid parameter` };
    }

    conn = await getConnection();

    const mempoolInfo = await getLastMempoolInfo(conn);
    if (mempoolInfo.length < 1) {
      throw { message: "mempool info is not exist" };
    }

    // 유효성 : 최소 수수료
    const { tx_min_fee } = mempoolInfo[0];
    const txMinFee = satoshiToBtc(tx_min_fee);
    const newFee = validateFeeAmount(fee, {
      minAmt: txMinFee,
    });

    // 유효성 : 출금 숫자 형식(지리수, 최소금액), 유효하지 않으면 throw error
    // 최소 출금액은 주소 단위로 적용됨
    const toAddrObjs = toAddresses.map((el) => {
      const newAmt = validateCoinAmount(el, {
        minAmt: MIN_OUT_AMT,
      });
      return {
        address: el.address,
        amount: newAmt,
      };
    });

    // 유효성 : BTC 지갑 주소
    const pIsBtcAddr = toAddrObjs.map(async (el) => {
      return await validateAddress(el.address);
    });
    const isBtcAddrs = await Promise.all(pIsBtcAddr);
    const invalidBtcAddr = isBtcAddrs.filter((el) => !el.isvalid);
    if (invalidBtcAddr.length > 0) {
      throw { message: "유효한 BTC 지갑 주소가 아닙니다." };
    }

    // ##############################################
    // 파라미터 유효성 검사 끝
    // ##############################################

    const { walletName, address, label } = await getWalletInfoByAddressId(
      conn,
      addressId
    );

    const {
      unconfirmedAmt, // 승인 O, tx가 mempool 에 있음
      freezeAmt, // 출금 요청 상태의 잔액
      availableAmt, // 출금 가능 금액, total - freezeAmt
      total, // availableAmt + freezeAmt, 실제 네트워크 잔액
    } = await getAddressBalanceInfos(conn, addressId);

    const totalReqAmt = toAddrObjs.reduce(reduceSumBigAmount, 0);
    const newBalance = new Big(availableAmt)
      .minus(newFee) // 수수료
      .minus(totalReqAmt) // 출금액
      .minus(freezeAmt); // 출금 요청 상태 금액
    const newBalanceFixed = newBalance.toFixed(8);

    debugLog("실제 네트워크 잔액", total, 19);
    debugLog("요청 대기중 잔액", freezeAmt, 20);
    debugLog("출금요청한 금액", totalReqAmt, 20);

    const chkMinus = newBalance.gte(0); // 오른쪽보다 크거나 같은가
    if (!chkMinus) {
      throw { message: `잔액이 부족합니다.(${newBalanceFixed})` };
    }

    await conn.beginTransaction(); // 트랜잭션 시작

    // 요청 정보 저장
    const insReqRes = await insWithdrawalCoinReq(conn, {
      label,
      addrId: addressId,
      toAddrCnt: toAddrObjs.length,
      amount: totalReqAmt,
      fee: newFee,
      updatedAt,
    });
    const { insertId } = insReqRes;

    await insWithdrawalCoinToAddrs(conn, { reqId: insertId, toAddrObjs });

    await conn.commit(); // 트랜잭션 커밋

    return {
      from: address,
      to: toAddresses,
      amount: totalReqAmt,
      freezeAmt,
      fee: newFee,
      willBalance: newBalanceFixed,
    };
  } catch (err) {
    console.error("[ERROR] : ", err);
    await conn.rollback(); // 트랜잭션 롤백
    throw {
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function confirmWithdrawalCoinReq(id) {
  let conn = null;
  const updatedAt = getFormatUnixTime();

  try {
    const passPhase = process.env.PW_PHASE;

    if (isNull(id) || isNull(passPhase)) {
      throw { message: `invalid parameter` };
    }

    conn = await getConnection();

    const reqs = await findWithdrawalCoinReq(conn, {
      id,
      status: 1 /* 요청중 */,
    });
    if (reqs.length < 1) {
      throw { message: "요청 중인 출금 건 없음" };
    }

    const lastBlockNum = await getBlockCount();

    const txid = await sendCoin({
      walletId: reqs[0].wallet_id,
      fromAddr: reqs[0].address,
      toAddr: reqs[0].to_addr,
      amount: reqs[0].amount,
      fee: reqs[0].fee,
    });

    const params = {
      reqId: id,
      status: 2,
      txid,
      lastBlockNum,
      updatedAt,
    };
    await updateWithdrawalCoinReqById(conn, params);

    return txid;
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

// 지갑 잔액 by 지갑 아이디
async function getAddressBalance(addrId) {
  let conn = null;

  try {
    const passPhase = process.env.PW_PHASE;

    if (isNull(addrId) || isNull(passPhase)) {
      throw { message: `invalid parameter` };
    }

    conn = await getConnection();

    const { unconfirmedAmt, availableAmt, freezeAmt, total } =
      await getAddressBalanceInfos(conn, addrId);

    return {
      unconfirmedAmt, // mempool 에 있는 금액(unconfirmed)
      availableAmt, // 출금 가능액 A
      freezeAmt, // 출금 요청 상태인 금액 B
      total, // 실제 메인넷 잔액 A + B
    };
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

// #########################################################################
// FUNCTION
// #########################################################################

async function sendCoin(sendInfo) {
  let conn = null;

  try {
    conn = await getConnection();
    console.log("sendInfo : ", sendInfo);

    const { walletId, fromAddr, toAddr, amount, fee } = sendInfo;
    const walletInfos = await getWalletInfos(conn, { walletId });
    if (walletInfos.length < 1) {
      throw { message: "지갑 정보가 없습니다." };
    }
    const { name: wallletName } = walletInfos[0];

    const outputs = await findUnspentTxOutputs(conn, { address: fromAddr });
    if (outputs.length < 1) {
      throw { message: "이전 전송이 아직 완료되지 않았습니다." };
    }
    const outputObjs = outputs.map(
      (el) => `{\"txid\": \"${el.txid}\",\"vout\":${el.vout_no}}`
    );
    const opsTotalAmt = outputs.reduce(reduceSumBigAmount, 0);
    const balance = new Big(opsTotalAmt).minus(fee).minus(amount).toFixed(8);
    console.log("walletInfos : ", walletInfos);
    console.log("outputs : ", outputs);
    console.log("opsTotalAmt : ", opsTotalAmt);
    console.log("balance : ", balance);

    // 여러 tx -> 하나의 tx
    const from = `[${outputObjs.join(",")}]`;
    // 이체 후 잔액은 자신의 주소로
    const to = `[{\"${toAddr}\":${amount}},{\"${fromAddr}\":${balance}}]`;
    // raw taransaction 정보 생성
    const rawTx = await createRawTransaction({ from, to });
    // 지갑 인증
    await authWalletPassPhrase(wallletName, process.env.PW_PHASE);
    // 지갑 정보로 서명
    const { hex, complete } = await signRawTxWithWallet(wallletName, rawTx);
    if (!complete) {
      throw { message: "sign raw transaction with wallet failed" };
    }

    console.log("hex : ", hex);

    // mempool acceptance tests
    // 이전에 잔액 확인을 하지만 여기서 최종적으로 잔액이 맞지 않는 경우 에러
    const memPoolTest = await testMemPoolAccept(`[\"${hex}\"]`);
    console.log("memPoolTest : ", memPoolTest);

    const { txid, wtxid, allowed, vsize, fees } = memPoolTest;
    if (!allowed) {
      throw { message: "mempool accept test failed" };
    }

    const sendTx = await sendRawTransaction(hex);

    console.log("txid : ", txid);
    console.log("sendTx : ", sendTx);

    return txid;
  } catch (err) {
    console.log(err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

async function getWalletInfoByAddressId(conn, addrId) {
  try {
    const addresses = await findWalletAddress(conn, { addressId: addrId });
    if (addresses.length < 1) {
      throw { message: "주소 정보 없음" };
    }

    const { wallet_id, address, start_block_no, label } = addresses[0];
    const wallets = await getWalletInfos(conn, { walletId: wallet_id });
    if (wallets.length < 1) {
      throw { message: "지갑 정보 없음" };
    }
    const { name } = wallets[0];

    return { walletName: name, address, startBlockNo: start_block_no, label };
  } catch (err) {
    throw err;
  }
}

async function getAddressBalanceByWalletAndAddress(walletName, address) {
  try {
    const balanceInfo = await getWalletBalances(walletName);
    const walletAddresses = balanceInfo.map((el) => el[0]);
    const addrBalanceInfo = walletAddresses.filter((el) => el[0] === address);
    if (addrBalanceInfo.length < 1) {
      throw { message: "지갑 잔액 정보가 없습니다." };
    }
    return addrBalanceInfo[0];
  } catch (err) {
    throw err;
  }
}

// here
async function getAddressBalanceInfos(conn, addrId) {
  try {
    const { walletName, address, startBlockNo } =
      await getWalletInfoByAddressId(conn, addrId);

    const [rpcAddr, rpcBalance, rpcLabel] =
      await getAddressBalanceByWalletAndAddress(walletName, address);

    const reqs = await findWithdrawalCoinReq(conn, {
      addrId,
      status: 1 /* 요청중 */,
    });
    const unconfirmedReqs = await findWithdrawalCoinReq(conn, {
      addrId,
      status: 2 /* 승인됨, unconfirmed */,
    });
    const reqAmt = reqs.reduce(reduceSumBigAmountAndFee, 0);
    const unconfirmedAmt = unconfirmedReqs.reduce(reduceSumBigAmountAndFee, 0);
    const availableAmt = new Big(rpcBalance).minus(reqAmt).toFixed(8);
    return {
      unconfirmedAmt, // mempool 에 있는 금액(unconfirmed)
      availableAmt, // 출금 가능액 A
      freezeAmt: reqAmt, // 출금 요청 상태인 금액 B
      total: rpcBalance, // 실제 메인넷 잔액 A + B
    };
  } catch (err) {
    throw err;
  }
}

function reduceSumBigAmount(prev, cur) {
  const { amount } = cur;
  const x = new Big(amount).toFixed(8);
  return new Big(x).plus(prev).toFixed(8);
}

function reduceSumBigAmountAndFee(prev, cur) {
  const { amount, fee } = cur;
  const x = new Big(amount).plus(fee).toFixed(8);
  return new Big(x).plus(prev).toFixed(8);
}

// fromCnt: (A) utxo 개수
// toCnt:  (B) 출금 주소 개수 - 자신 주소 포함(최소 2개 이상)
async function getTxFee(conn, { fromCnt, toCnt }) {
  try {
    const mempoolLast = await getLastMempoolInfo(conn);
    if (mempoolLast.length < 1) {
      throw { message: "mempool info is not exist" };
    }

    const {
      tx_min_fee: minFeePerTx, // 트랜잭션 최소 수수료
      fee_per_byte: feePerByte, // 바이트당 수수료
      fee_per_tx: averageFeePerTx, // 트랜잭션당 수수료
    } = mempoolLast[0];

    // (A) * 146 + (B) * 33 + 10 = P2SH/P2PKH 트랜잭션 사이즈
    // 계산식 정확X, 1자리수에서 2배 이내로 차이
    const txBytes = fromCnt * 146 + toCnt * 33 + 10; // 트랜잭션 사이즈
    const feeTxBytes = satoshiToBtc(txBytes * feePerByte); // tx size에 따른 수수료

    console.log(`${fromCnt} * 146 + ${toCnt} * 33 + 10 = ${txBytes}`);
    console.log(`${txBytes} * ${feePerByte} = ${feeTxBytes}BTC`);

    return {
      minFeePerTx: satoshiToBtc(minFeePerTx),
      averageFeeTxSize: feeTxBytes, // 요청건 tx 사이즈 대비 수수료
      averageFeePerTx: satoshiToBtc(averageFeePerTx),
    };
  } catch (err) {
    throw err;
  }
}

module.exports = {
  createWithdrawalCoinReq,
  confirmWithdrawalCoinReq,
  getAddressBalance,
  getWithdrawalCoinFee,
};
