const express = require("express");
const router = express.Router();
const controller = require("../controllers/wallet.controller");

/**
 * @swagger
 * tags:
 *   - name: Wallet
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
 *         - walletId
 *         - label
 *         - type
 *       type: object
 *       properties:
 *         walletId:
 *           type: integer
 *           description: 지갑 키값
 *           example: 1
 *         label:
 *           type: string
 *           description: 지갑의 주소에 라벨, 지갑별 중복X
 *           example: walletlabel
 *         type:
 *           type: integer
 *           description: 주소 타입 (bech32 || p2sh-segwit || legacy)
 *           example: bech32
 */

/**
 * @swagger
 * /wallet:
 *   get:
 *     description: 지갑 정보 조회
 *     tags: [Wallet]
 *     produces:
 *       - application/json
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
 *                  type: object
 *                  properties:
 *                    walletList:
 *                      type: array
 *                      items:
 *                        $ref: '#/components/schemas/Wallet'
 *                      example:
 *                        - id: 1
 *                          name: wallet1
 *                          type: 0
 *                          desc: 실테스트 지갑
 *                          created_at: 1667267724
 *                        - id: 2
 *                          name: wallet2
 *                          type: 1
 *                          desc: 외부 앱 테스트 지갑
 *                          created_at: 1667267888
 *       500:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/ERROR'
 *             example:
 *               success: false
 *               message: error message
 */
router.get("/", controller.get);

/**
 * @swagger
 * /wallet:
 *  post:
 *    summary: "지갑 등록"
 *    description: "POST 방식으로 지갑을 등록"
 *    tags: [Wallet]
 *    requestBody:
 *      description: 지갑 등록시 지갑 이름, 암호화 문자열, 지갑 설명 필요
 *      required: true
 *      content:
 *        application/x-www-form-urlencoded:
 *          schema:
 *            $ref: '#/components/schemas/AddressForm'
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
 *               $ref: '#/components/schemas/ERROR'
 *             example:
 *               success: false
 *               message: error message
 */
router.post("/", controller.post);

// 지갑 주소 추가
/**
 * @swagger
 * /wallet/address:
 *  post:
 *    summary: "지갑 주소 등록"
 *    description: "해당 지갑에 주소를 추가한다"
 *    tags: [Wallet]
 *    requestBody:
 *      description: 지갑 등록시 지갑 이름, 암호화 문자열, 지갑 설명 필요
 *      required: true
 *      content:
 *        application/x-www-form-urlencoded:
 *          schema:
 *            $ref: '#/components/schemas/AddressForm'
 *    responses:
 *       200:
 *         description: 추가한 지갑의 주소 정보
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
 *                    addressInfo:
 *                      type: object
 *                      example:
 *                       id: 1
 *                       label: labelname
 *                       address: bc1qr8f4cahr3agwea2duph0wfhpw524lzck8t4tvs
 *                       type: bech32
 *       500:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/ERROR'
 *             example:
 *               success: false
 *               message: error message
 */
router.post("/address", controller.createAddress);

// 지갑 + 라벨 정보로 주소 조회
router.get("/label", controller.findAddressesByWalletLabel);

// 지갑 정보로 각 주소 잔액 조회
router.get("/balances/:walletId", controller.findBalancesByWallet);

module.exports = router;
