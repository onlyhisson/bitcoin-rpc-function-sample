const express = require("express");
const router = express.Router();

const controller = require("../controllers/asset.controller");

// 출금 요청 - 사용자
router.post("/withdraw/coin", controller.createWithdrawalCoinReq);

// 출금 승인 - 관리자
router.patch("/withdraw/coin/:id", controller.confirmWithdrawalCoinReq);

module.exports = router;
