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
 *         - walletId
 *         - label
 *         - type
 *       type: object
 *       properties:
 *         walletId:
 *           type: integer
 *           description: 지갑 ID
 *           example: 1
 *         label:
 *           type: string
 *           description: 지갑의 주소에 라벨, 지갑별 중복X
 *           example: walletlabel
 *         type:
 *           type: string
 *           description: 주소 타입, bech32로 고정 예정 (bech32 || p2sh-segwit || legacy)
 *           example: bech32
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
 * /wallets:
 *   get:
 *     summary: 지갑 정보 조회
 *     description: DB 데이터 기준, RPC 서버의 전부 혹은 일부 지갑
 *     tags: [Wallets]
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
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: error message
 */
router.get("/", controller.get);

/**
 * @swagger
 * /wallets:
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
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: error message
 */
router.post("/", controller.post);

// 지갑 주소 추가
/**
 * @swagger
 * /wallets/address:
 *  post:
 *    summary: 지갑 주소 등록
 *    description: 해당 지갑에 주소를 추가하고 새로 생성된 지갑 주소 리턴
 *    tags: [Wallets]
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
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: error message
 */
router.post("/address", controller.createAddress);

/**
 * @swagger
 * /wallets/{walletId}/label/{label}:
 *   get:
 *     summary: 지갑과 라벨로 주소 조회
 *     description: 비트코인 클라이언트 프로그램의 기능, 라벨은 태그 개념
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         description: 잔액 조회할 지갑의 ID
 *         schema:
 *           type: integer
 *         example: 6
 *       - in: path
 *         name: label
 *         required: true
 *         description: 라벨명
 *         schema:
 *           type: string
 *         example: label1
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
 *                     addressInfos:
 *                       type: array
 *                       description: RPC 응답 데이터 포맷
 *                       example:
 *                         - address: bc1q5c5p6frfjf6avs4u74xmuyc9wf29qspa5r54ss
 *                           scriptPubKey: 0014a6281d24699275d642bcf54dbe1305725450403d
 *                           label: array
 *       500:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: error message
 *
 */
router.get("/:walletId/label/:label", controller.findAddressesByWalletLabel);

/**
 * @swagger
 * /wallets/{walletId}/addresses/balance:
 *   get:
 *     summary: 지갑별 각 주소 잔액 조회
 *     description: 지갑별 각 주소 잔액 조회
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         description: 잔액 조회할 지갑의 ID
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
 *                     walletName:
 *                       type: string
 *                       example: wallet1
 *                     balances:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Balance'
 *                       example:
 *                        - walletId: 6
 *                          addressId: 7
 *                          label: label2
 *                          address: bc1q2nvzu334xz7r30fse82fwwfqr6aetctx6gtsk4
 *                          amount: 0.00028988
 *                          desc: rpc 서버 지갑 실테스트
 *                        - walletId: 6
 *                          addressId: 6
 *                          label: label1
 *                          address: bc1q5c5p6frfjf6avs4u74xmuyc9wf29qspa5r54ss
 *                          amount: 0.00027339
 *                          desc: rpc 서버 지갑 실테스트
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
router.get("/:walletId/addresses/balance", controller.findBalancesByWallet);

module.exports = router;
