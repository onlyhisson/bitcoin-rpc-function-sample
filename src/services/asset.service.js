const Big = require("big.js");

const { getConnection } = require("../db");
const { getWalletInfos, findWalletAddress } = require("../db/wallet");
const {
  findUnspentTxOutputs,
  updateUnspentTxOutputs,
} = require("../db/tx_output");
const {
  findWithdrawalCoinReq,
  insWithdrawalCoinReq,
  insWithdrawalCoinToAddrs,
} = require("../db/assets");
const { getLastMempoolInfo } = require("../db/block");

const {
  validateCoinAmount,
  validateFeeAmount,
  isNull,
  debugLog,
  getFormatUnixTime,
  satoshiToBtc,
} = require("../util");
const { getCacheInstance, MEMPOOL_INFO_LAST } = require("../util/cache");
const { validateAddress } = require("../util/rpc/util");
const { getBlockCount, getMempoolInfo } = require("../util/rpc/block");
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
const cronCache = getCacheInstance();

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
  const createdAt = getFormatUnixTime();
  //const passPhase = process.env.PW_PHASE;

  try {
    const { addressId, fee, toAddresses, passPhase } = params;

    // ############################# 파라미터 유효성 검사 시작

    // 유효성 : null 확인
    if (
      isNull(addressId) ||
      isNull(fee) ||
      isNull(passPhase) ||
      isNull(toAddresses) ||
      !Array.isArray(toAddresses)
    ) {
      throw { message: `invalid parameter` };
    }
    // 유효성 : 최소 수수료, newFee 소수점 자리수 맞춤 0.01 -> 0.00000001
    const newFee = await verifyMinFee(fee);
    // 유효성 : 출금 숫자 형식(지리수, 최소금액) 최소 출금액은 주소 단위로 적용됨
    const txOutputs = verifyMinWithdrawalAmount(toAddresses);
    // 유효성 : 유효한 BTC 주소
    await verifyValidBtcAddress(toAddresses);

    // ############################# 파라미터 유효성 검사 끝

    conn = await getConnection();

    const lastBlockNum = await getBlockCount();
    const walletInfo = await getWalletInfoByAddressId(conn, addressId);
    if (!walletInfo) {
      throw { message: "지갑 정보가 없습니다." };
    }
    // 출금 주소 및 지갑 이름(RPC 서버 요청시 필요)
    const { walletName, address } = walletInfo;

    // 출금 요청 금액 합, 수수료 제외
    const amount = txOutputs.reduce(reduceSumBigAmount, 0);

    // 출금액 + 수수료에 따른 utxo 선택 알고리즘 필요
    // 현재는 모든 utxo 조회
    const utxos = await findUnspentTxOutputs(conn, { address });
    if (utxos.length < 1) {
      // main net 정보를 db 에 저장하기 까지 스케쥴러 시간 차이 1분 이내
      throw { message: "이전 전송이 아직 완료되지 않았습니다." };
    }

    // 요청 성공시 잔액 리턴
    const newBalance = verifyAddressBalance({ utxos, fee: newFee, amount });

    const chkEquals = new Big(newBalance).eq(0); // 이체 후 잔액 여부
    if (!chkEquals) {
      const output = {
        address,
        amount: newBalance,
        voutNo: txOutputs.length,
      };
      // 잔액은 from address로 다시 보내도록 outputs 마지막에 포함한다.
      txOutputs.push(output);
    }

    await conn.beginTransaction(); // 트랜잭션 시작

    const rawSignedTxInfo = await getRawSignedTxInfo({
      walletName,
      passPhase,
      utxos,
      txOutputs,
    });
    const { hex, ...insParams } = rawSignedTxInfo;
    console.log("rawSignedTxInfo : ", rawSignedTxInfo);
    console.log("insParams : ", insParams);

    // *********** 실제 mempool에 tx 업로드 롤백X, 이후 결과에 따라 DB 처리
    const unconfirmedTx = await sendRawTransaction(hex);
    console.log("unconfirmedTx : ", unconfirmedTx);

    // 요청 정보 저장
    const { insertId } = await insWithdrawalCoinReq(conn, {
      addrId: addressId,
      fee: newFee,
      status: 2,
      startBlockNo: lastBlockNum,
      createdAt,
      ...insParams,
    });
    await insWithdrawalCoinToAddrs(conn, { reqId: insertId, txOutputs });

    // unspent => spent 처리(스케쥴러로 처리시 1분 이내 시간 동안 오차 발생)
    const spentOutputIds = utxos.map((el) => el.id);
    console.log("spentOutputIds : ", spentOutputIds);
    await updateUnspentTxOutputs(conn, {
      isSpent: 1, // 1 : spent status
      outputs: spentOutputIds,
    });

    await conn.commit(); // 트랜잭션 커밋

    return {
      from: address,
      to: toAddresses,
      amount,
      fee: newFee,
      balance: newBalance,
    };
  } catch (err) {
    // 파라미터 유효성 검증 시 에러 나면 conn === null 일수 있음
    if (conn) {
      await conn.rollback(); // 트랜잭션 롤백
    }
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
// Validation FUNCTION
// #########################################################################

async function verifyMinFee(fee) {
  try {
    let minTxFee = null;
    const mempoolInfoCache = cronCache.get(MEMPOOL_INFO_LAST);

    if (mempoolInfoCache) {
      const { feeMin: satoshiFeeMin } = mempoolInfoCache;
      minTxFee = satoshiToBtc(satoshiFeeMin);
    } else {
      // 캐싱된 mempool 데이터 없으면 rpc 서버 조회
      const mempoolInfoRpc = await getMempoolInfo();
      const { mempoolminfee: btcFeeMin } = mempoolInfoRpc;
      minTxFee = new Big(btcFeeMin).toFixed(8);
    }

    if (!minTxFee) {
      throw {
        message:
          "It is not exist that mempool information for fee validation. " +
          "check mempool job",
      };
    }

    const newFee = validateFeeAmount(fee, {
      minAmt: minTxFee,
    });

    return newFee;
  } catch (err) {
    throw err;
  }
}

function verifyMinWithdrawalAmount(toAddressInfos) {
  try {
    const toAddrObjs = toAddressInfos.map((el, idx) => {
      const newAmt = validateCoinAmount(el, {
        minAmt: MIN_OUT_AMT,
      });
      return {
        address: el.address,
        amount: newAmt,
        voutNo: idx,
      };
    });
    return toAddrObjs;
  } catch (err) {
    throw err;
  }
}

async function verifyValidBtcAddress(toAddressInfos) {
  try {
    const pIsBtcAddr = toAddressInfos.map(async (el) => {
      return await validateAddress(el.address);
    });
    const isBtcAddrs = await Promise.all(pIsBtcAddr);
    const invalidBtcAddr = isBtcAddrs.filter((el) => !el.isvalid);
    if (invalidBtcAddr.length > 0) {
      throw { message: "유효한 BTC 지갑 주소가 아닙니다." };
    }
  } catch (err) {
    throw err;
  }
}

function verifyAddressBalance(params) {
  try {
    const {
      utxos, // 출금 주소의 UTXO
      fee, // 출금 수수료
      amount, // 출금액 합
    } = params;
    const balance = utxos.reduce(reduceSumBigAmount, 0); // 잔액 개념

    const newBalance = new Big(balance).minus(fee).minus(amount);
    const newBalanceFixed = newBalance.toFixed(8);

    debugLog("UTXO Amount 합", balance, 20);
    debugLog("수수료", fee, 18);
    debugLog("출금 요청한 금액", amount, 14);
    debugLog("츨금 완료시 잔액", newBalanceFixed, 14);

    const chkMinus = newBalance.gte(0); // 오른쪽보다 크거나 같은가
    if (!chkMinus) {
      throw { message: `잔액이 부족합니다.(${newBalanceFixed})` };
    }

    return newBalanceFixed;
  } catch (err) {
    throw err;
  }
}

// #########################################################################
// FUNCTION
// #########################################################################

async function getRawSignedTxInfo(params) {
  try {
    console.log("getRawSignedTxInfo params : ", params);

    const { walletName, passPhase, txOutputs, utxos } = params;

    const inputTotalAmt = utxos.reduce(reduceSumBigAmount, 0);
    const ouputTotalAmt = txOutputs.reduce(reduceSumBigAmount, 0);

    // raw taransaction 정보 생성
    const rawTx = await createRawTransaction({ utxos, to: txOutputs });
    // 지갑 인증
    await authWalletPassPhrase(walletName, passPhase);
    // 지갑 정보로 서명
    const { hex, complete } = await signRawTxWithWallet(walletName, rawTx);
    if (!complete) {
      throw { message: "sign raw transaction with wallet failed" };
    }

    // mempool acceptance tests
    // 최종적으로 잔액이 맞지 않는 경우 여기서 에러
    const memPoolTest = await testMemPoolAccept(`[\"${hex}\"]`);
    const { txid, wtxid, allowed, vsize, fees } = memPoolTest;
    if (!allowed) {
      throw { message: "mempool accept test failed" };
    }
    console.log("memPoolTest : ", memPoolTest);

    console.log("txid : ", txid);
    return {
      hex,
      txid,
      size: hex.length / 2,
      vsize,
      inputCnt: utxos.length,
      outputCnt: txOutputs.length,
      inputTotalAmt,
      ouputTotalAmt,
    };
  } catch (err) {
    throw err;
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

    return {
      walletId: wallet_id,
      walletName: name,
      address,
      startBlockNo: start_block_no,
      label,
    };
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

// 수정 필요, freezeAmt 없음, 출금 요청 상태 없앰
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
  getAddressBalance,
  getWithdrawalCoinFee,
};
