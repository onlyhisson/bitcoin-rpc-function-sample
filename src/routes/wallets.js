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
 * /btc/wallets:
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

// 지갑 주소 추가
/**
 * @swagger
 * /btc/wallets/{walletId}/address:
 *  post:
 *    summary: 지갑 주소 추가
 *    description: 해당 지갑에 주소를 추가하고 새로 생성된 지갑 주소 리턴
 *    tags: [Wallets]
 *    parameters:
 *      - in: path
 *        name: walletId
 *        required: true
 *        description: 잔액 조회할 지갑의 ID
 *        schema:
 *          type: integer
 *        example: 1
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
router.post("/:walletId/address", controller.createAddress);

/**
 * @swagger
 * /btc/wallets/{walletId}/addresses:
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
 *       - in: query
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
router.get("/:walletId/addresses", controller.findAddressesByWalletLabel);

/**
 * @swagger
 * /btc/wallets/{walletId}/addresses/balance:
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
