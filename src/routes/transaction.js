const express = require("express");
const router = express.Router();
const controller = require("../controllers/tx.controller");

// 트랜잭션 상세 조회
router.get("/:txid", controller.findOneByTxid);

// 해당 txid 의 input, output 정보
router.get("/inout/:txid", controller.findTxInoutByTxid);

module.exports = router;
