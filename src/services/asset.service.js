const Big = require("big.js");
const { validateCoinAmount, isNull, debugLog } = require("../util");
const { getConnection } = require("../db");
const { getWalletInfos, findWalletAddress } = require("../db/wallet");
const { findUnspentTxOutputs } = require("../db/tx_output");
const {
  findWithdrawalCoinReq,
  saveWithdrawalCoinReq,
  updateWithdrawalCoinReqById,
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
const MIN_AMOUNT = "0.00000500"; // 출금 가능 최소 개수

async function createWithdrawalCoinReq(params) {
  let conn = null;

  try {
    const { addressId, toAddress, amount } = params;

    // 출금 숫자 유효성 확인
    const newAmt = validateCoinAmount(amount, {
      decimalCnt: 8,
      minAmt: MIN_AMOUNT,
    });

    const { isvalid: isBtcAddr } = await validateAddress(toAddress);
    if (!isBtcAddr) {
      throw { message: "유효한 BTC 지갑 주소가 아닙니다." };
    }

    if (
      isNull(addressId) ||
      isNull(amount) ||
      isNull(toAddress) ||
      isNull(newAmt)
    ) {
      throw { message: `invalid parameter` };
    }

    // 파라미터 유효성 검사 끝

    conn = await getConnection();

    // 주소 ID 로 주소 정보 조회
    const addressInfos = await findWalletAddress(conn, { addressId });
    if (addressInfos.length < 1) {
      throw { message: "지갑 주소 정보가 없습니다." };
    }
    const { id, wallet_id: walletId, label, address } = addressInfos[0];

    const walletInfos = await getWalletInfos(conn, { walletId });
    if (walletInfos.length < 1) {
      throw { message: "지갑 정보가 없습니다." };
    }
    const { name: walletName } = walletInfos[0];

    // 향후 RPC 서버에서 DB 조회로 전환 필요할 듯
    // 실제 네트워크 잔액 조회
    const balanceInfo = await getWalletBalances(walletName);
    const walletAddresses = balanceInfo.map((el) => el[0]);
    const addrBalanceInfo = walletAddresses.filter((el) => el[0] === address);
    if (addrBalanceInfo.length < 1) {
      throw { message: "지갑 잔액 정보가 없습니다." };
    }

    // 실제 네트워크 잔액 정보
    const [rpcAddr, balance, rpcLabel] = addrBalanceInfo[0];

    // 요청 중인 건의 비트코인 개수는 일단 출금할 수 있는 금액에서 뺀다.
    // bitcoin-cli 에서 출금을 위해 rawtransaction을 생성할시 잔액이 맞지 않으면
    // 트랜잭션 생성 후 유효성을 확인할 수 있기 때문에 최종적으로 사고가 나지는 않는다
    // 요청 상태인 row 조회, unconfirmed 상태에서 rpc 서버 잔액 조회시 차감되어 있음
    const reqs = await findWithdrawalCoinReq(conn, {
      addrId: addressId,
      status: 1 /* 요청중 */,
    });
    const freezeAmt = reqs.reduce(reduceSumBigAmountAndFee, 0);

    const newBalance = new Big(balance)
      .minus(FEE) // 수수료
      .minus(newAmt) // 출금액
      .minus(freezeAmt); // 출금 요청 상태 금액
    const newBalanceFixed = newBalance.toFixed(8);

    debugLog("실제 네트워크 잔액", balance, 19);
    debugLog("해당주소 요청 잔액", freezeAmt, 19);
    debugLog("출금요청한 금액", newAmt, 20);

    const chkMinus = newBalance.gte(0); // 오른쪽보다 크거나 같은가
    if (!chkMinus) {
      throw { message: `잔액이 부족합니다.(${newBalanceFixed})` };
    }

    // 요청 정보 저장
    await saveWithdrawalCoinReq(conn, {
      addrId: addressId,
      toAddress,
      amount: newAmt,
      fee: FEE,
    });

    return {
      label,
      from: address,
      to: toAddress,
      amount: newAmt,
      freezeAmt,
      fee: FEE,
      willBalance: newBalanceFixed,
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

async function confirmWithdrawalCoinReq(id) {
  let conn = null;

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

module.exports = { createWithdrawalCoinReq, confirmWithdrawalCoinReq };
