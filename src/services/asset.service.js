const Big = require("big.js");
const {
  validateCoinAmount,
  isNull,
  debugLog,
  getFormatUnixTime,
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

const FEE = "0.00001551"; // 임시, 출금시 tx의 output 개수에 따라?
const MIN_AMOUNT = "0.00001000"; // 출금 가능 최소 개수

async function createWithdrawalCoinReq(params) {
  let conn = null;
  const updatedAt = getFormatUnixTime();

  try {
    const { addressId, toAddress } = params;

    // 유효성 : null 확인
    if (isNull(addressId) || isNull(toAddress) || !Array.isArray(toAddress)) {
      throw { message: `invalid parameter` };
    }

    // 유효성 : 출금 숫자 형식(지리수, 최소금액), 유효하지 않으면 throw error
    // 최소 출금액은 주소 단위로 적용됨
    const toAddrObjs = toAddress.map((el) => {
      const newAmt = validateCoinAmount(el.amount, {
        decimalCnt: 8,
        minAmt: MIN_AMOUNT,
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

    conn = await getConnection();

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
      .minus(FEE) // 수수료
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
      fee: FEE,
      updatedAt,
    });
    const { insertId } = insReqRes;

    await insWithdrawalCoinToAddrs(conn, { reqId: insertId, toAddrObjs });

    await conn.commit(); // 트랜잭션 커밋

    return {
      from: address,
      to: toAddress,
      amount: totalReqAmt,
      freezeAmt,
      fee: FEE,
      willBalance: newBalanceFixed,
    };
  } catch (err) {
    await conn.rollback(); // 트랜잭션 롤백
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

// ################################################
// FUNCTION
// ################################################

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

async function getTxFeefromRawTxSize(conn, params) {
  // raw tx
  // signed row tx
}

module.exports = {
  createWithdrawalCoinReq,
  confirmWithdrawalCoinReq,
  getAddressBalance,
};
