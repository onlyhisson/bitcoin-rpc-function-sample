const express = require("express");
const router = express.Router();
const { isNull } = require("../util");
const { block, transaction, wallet } = require("../util/rpc");
const { getRawTransaction, getDecodeRawTransaction } = transaction;

router.get("/:txid", async function (req, res) {
  try {
    const { txid } = req.params;

    if (isNull(txid)) {
      throw { message: `invalid parameter` };
    }

    const rawTxidData = await getRawTransaction(txid); // 트랙잭션 raw 데이터 조회
    const decodeRawTxidData = await getDecodeRawTransaction(rawTxidData); // 디코딩

    res.json({
      success: true,
      data: { txid: decodeRawTxidData },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);

    res.json({
      success: false,
      message: err.message ? err.message : "error",
    });
  }
});

module.exports = router;
