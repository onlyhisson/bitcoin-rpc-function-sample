const express = require("express");
const router = express.Router();
const controller = require("../controllers/wallet.controller");

// 지갑 정보 조회
router.get("/", controller.get);

// 지갑 추가
router.post("/", controller.post);

// 지갑 주소 추가
router.post("/address", controller.createAddress);

// 지갑 + 라벨 정보로 주소 조회
router.get("/label", controller.findAddressesByWalletLabel);

// 지갑 정보로 각 주소 잔액 조회
router.get("/balances/:walletId", controller.findBalancesByWallet);

module.exports = router;
