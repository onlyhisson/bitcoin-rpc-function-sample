const express = require("express");
const router = express.Router();
const Big = require("big.js");
const { validateCoinAmount, isNull, debugLog } = require("../util");
const { getConnection } = require("../db");
const { getWalletInfos, findWalletAddress } = require("../db/wallet");
const {
  findWithdrawalCoinReq,
  saveWithdrawalCoinReq,
} = require("../db/assets");
const { validateAddress } = require("../util/rpc/util");
const { getWalletBalances } = require("../util/rpc/wallet");

const FEE = "0.00001551"; // 임시

router.post("/withdraw/coin", async function (req, res) {
  let conn = null;

  try {
    const { addressId, toAddress, amount } = req.body;

    const newAmt = validateCoinAmount(amount); // 출금 숫자 유효성 확인

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
    debugLog("출금요청중 잔액", freezeAmt, 20);
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

    res.json({
      success: true,
      data: {
        label,
        address: {
          from: address,
          to: toAddress,
        },
        amount: newAmt,
        freezeAmt,
        fee: FEE,
        willBalance: newBalanceFixed,
      },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);
    res.json({
      success: false,
      message: err.message ? err.message : "error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

function reduceSumBigAmountAndFee(prev, cur) {
  const { amount, fee } = cur;
  const x = new Big(amount).plus(fee).toFixed(8);
  return new Big(x).plus(prev).toFixed(8);
}

module.exports = router;
