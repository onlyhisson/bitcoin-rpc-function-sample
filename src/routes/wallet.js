const express = require("express");
const router = express.Router();
const controller = require("../controllers/wallet.controller");

/**
 * @swagger
 * tags:
 *   - name: Wallets
 *     description: 지갑
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Wallet:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         type:
 *           type: integer
 *         desc:
 *           type: string
 *         created_at:
 *           type: integer
 *     WalletForm:
 *       required:
 *         - name
 *         - desc
 *         - passPhase
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: 지갑 이름
 *           example: test100
 *         desc:
 *           type: string
 *           description: 지갑 설명
 *           example: 실테스트
 *         passPhase:
 *           type: string
 *           description: 지갑 암호화 문장
 *           example: flock bleak bicycle comic palace coral describe enough client symptom arch journey
 *     AddressForm:
 *       required:
 *         - label
 *       type: object
 *       properties:
 *         label:
 *           type: string
 *           description: 지갑의 주소에 라벨, 지갑별 중복X
 *           example: walletlabel
 *     Balance:
 *       type: object
 *       properties:
 *         walletId:
 *           type: integer
 *           description: 지갑 ID
 *         addressId:
 *           type: integer
 *           description: 주소 ID
 *         label:
 *           type: string
 *           description: 라벨명
 *         address:
 *           type: string
 *           description: 주소
 *         amount:
 *           type: integer
 *           description: 잔액
 *         desc:
 *           type: string
 *           description: 지갑 설명
 */

/**
 * @swagger
 * /btc/wallet:
 *  post:
 *    summary: 지갑 등록 - 관리자
 *    description: 지갑을 등록
 *    tags: [Wallets]
 *    requestBody:
 *      description: 지갑 등록시 지갑 이름, 암호화 문자열, 지갑 설명 필요
 *      required: true
 *      content:
 *        application/x-www-form-urlencoded:
 *          schema:
 *            $ref: '#/components/schemas/WalletForm'
 *    responses:
 *       200:
 *         description: 등록한 지갑 정보
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
 *                    wallet:
 *                      type: object
 *                      example:
 *                       id: 1
 *                       name: 지갑명
 *                       desc: 지갑 설명
 *                       passPhase: 지갑 암호화 문구
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
router.post("/", controller.post);

module.exports = router;
