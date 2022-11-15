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
 *     WithdrawalForm:
 *       required:
 *         - addressId
 *         - toAddress
 *         - amount
 *       type: object
 *       properties:
 *         addressId:
 *           type: integer
 *           description: 주소 ID
 *           example: 7
 *         toAddress:
 *           type: string
 *           description: 받는 주소
 *           example: bc1qkp84yne4jumksnl8rndhvtp8zv0xurkzr4456u
 *         amount:
 *           type: integer
 *           description: 출금액, 소수점 8자리 까지
 *           example: 0.0001
 */

/**
 * @swagger
 * /assets/withdraw/coin:
 *   post:
 *     summary: 출금 요청 - 사용자
 *     description: 사용자의 출금 요청 정보 저장, 최소 0.00000500 BTC 이상
 *     tags: [Assets]
 *     requestBody:
 *       description: 출금 요청 정보 등록
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
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
 *                        label: label2
 *                        from: bc1q2nvzu334xz7r30fse82fwwfqr6aetctx6gtsk4
 *                        to: bc1qkp84yne4jumksnl8rndhvtp8zv0xurkzr4456u
 *                        amount: 0.00010000
 *                        freezeAmt: 0.00004202
 *                        fee: 0.00001551
 *                        willBalance: 0.00015286
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
router.post("/withdraw/coin", controller.createWithdrawalCoinReq);

/**
 * @swagger
 * /assets/withdraw/coin/{reqId}:
 *   patch:
 *     summary: 출금 승인 - 관리자
 *     description: 출금 요청을 승인, raw transaction 이 생성되고 바로 mempool에 전달
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: reqId
 *         required: true
 *         description: 출금 요청건 ID
 *         schema:
 *           type: integer
 *         example: 1
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
 *                     txid:
 *                       type: string
 *                       example: f70f27e87695b31236b720558393925cfcd75d50046012f460df590f174ec765
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
router.patch("/withdraw/coin/:id", controller.confirmWithdrawalCoinReq);

/**
 * @swagger
 * /assets/address/{addrId}/balance:
 *   get:
 *     summary: 잔액 확인
 *     description: 현재 출금 가능 금액, 출금 요청 상태에 따른 금액 정보
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: addrId
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
router.get("/address/:addrId/balance", controller.getAddressBalance);

module.exports = router;
