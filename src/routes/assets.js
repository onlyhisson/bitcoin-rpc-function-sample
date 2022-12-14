const express = require("express");
const router = express.Router();

const controller = require("../controllers/asset.controller");

/**
 * @swagger
 *  tags:
 *   - name: Assets
 *     description: 출금, 잔액
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     toAddressItem:
 *       description: 출금 주소 & 금액
 *       requird:
 *       - address
 *       - amount
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *           example: bc1q2nvzu334xz7r30fse82fwwfqr6aetctx6gtsk4
 *         amount:
 *           type: string
 *           example: 0.00010000
 *     WithdrawalForm:
 *       required:
 *         - passPhase
 *         - fee
 *         - toAddresses
 *       type: object
 *       properties:
 *         passPhase:
 *           type: string
 *           desc: 지갑 암호 키
 *           example: flock bleak bicycle comic palace coral describe enough client symptom arch journey
 *         fee:
 *           type: string
 *           desc: 출금 요청 수수료
 *           example: 0.00005000
 *         toAddresses:
 *           type: array
 *           description: 받는 주소
 *           items:
 *             $ref: '#/components/schemas/toAddressItem'
 *
 */

/**
 * @swagger
 * /btc/assets/coin/address/{addressId}/withdraw/fee:
 *   get:
 *     summary: 출금 요청 수수료 - 사용자
 *     description: 사용자의 출금 요청건 수수료
 *     tags: [Assets]
 *     parameters:
 *       - name: addressId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         example: 7
 *       - name: toAddresses
 *         in: query
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/toAddressItem'
 *     responses:
 *       200:
 *         description: 출금 요청 건 수수료 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                  type: object
 *                  properties:
 *                    reqInfo:
 *                      type: object
 *                      example:
 *                        minFeePerTx: 0.00001002
 *                        averageFeeTxSize: 0.00007315
 *                        averageFeePerTx: 0.00008984
 *
 *       500:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: error message
 */
router.get(
  "/coin/address/:addressId/withdraw/fee",
  controller.getWithdrawalCoinFee
);

/**
 * @swagger
 * /btc/assets/coin/address/{addressId}/withdraw:
 *   post:
 *     summary: 출금 요청 - 사용자
 *     description: 사용자의 출금 요청 정보 저장
 *     tags: [Assets]
 *     parameters:
 *       - name: addressId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         example: 7
 *     requestBody:
 *       description: 출금 주소 & 금액 1개 이상
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WithdrawalForm'
 *     responses:
 *       200:
 *         description: 출금 요청 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                  type: object
 *                  properties:
 *                    reqInfo:
 *                      type: object
 *                      example:
 *                        from: bc1q2nvzu334xz7r30fse82fwwfqr6aetctx6gtsk4
 *                        to: bc1qkp84yne4jumksnl8rndhvtp8zv0xurkzr4456u
 *                        amount: 0.00010000
 *                        fee: 0.00001551
 *                        balance: 0.00015286
 *
 *       500:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: error message
 */
router.post(
  "/coin/address/:addressId/withdraw",
  controller.createWithdrawalCoinReq
);

/**
 * @swagger
 * /btc/assets/address/{addressId}/balance:
 *   get:
 *     summary: 잔액 확인
 *     description: 현재 출금 가능 금액, 출금 요청 상태에 따른 금액 정보
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         description: 주소 ID
 *         schema:
 *           type: integer
 *         example: 7
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: object
 *                       example:
 *                         unconfirmedAmt: mempool에 등록 상태
 *                         availableAmt: 출금 가능 잔액 A
 *                         freezeAmt: 출금 요청 상태 금액 B
 *                         total: 메인넷 실 잔액 A + B
 *       500:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: error message
 */
router.get("/address/:addressId/balance", controller.getAddressBalance);

module.exports = router;
