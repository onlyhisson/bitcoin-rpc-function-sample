const express = require("express");
const router = express.Router();
const { validateCoinAmount, isNull } = require("../util");
const { getConnection } = require("../db");
const { findWalletAddress } = require("../db/wallet");
const { validateAddress } = require("../util/rpc/util");

const FEE = "0.00001551"; // 임시

router.post("/withdraw/coin", async function (req, res) {
  let conn = null;

  try {
    const { addressId, toAddress, amount } = req.body;

    const newAmt = validateCoinAmount(amount); // 출금 숫자 유효성 확인

    if (
      isNull(addressId) ||
      isNull(amount) ||
      isNull(toAddress) ||
      isNull(newAmt)
    ) {
      throw { message: `invalid parameter` };
    }

    const { isvalid: isBtcAddr } = await validateAddress(toAddress);
    if (!isBtcAddr) {
      throw { message: "유효한 BTC 지갑 주소가 아닙니다." };
    }

    conn = await getConnection();

    const addressInfo = await findWalletAddress(conn, { addressId });
    if (addressInfo.length < 1) {
      throw { message: "지갑 주소 정보가 없습니다." };
    }
    const { id, label, address } = addressInfo[0];

    res.json({
      success: true,
      data: { label, address, amount: newAmt },
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

module.exports = router;
