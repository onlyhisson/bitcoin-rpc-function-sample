const express = require("express");
const router = express.Router();
const controller = require("../controllers/tx.controller");

/**
 * @swagger
 *  tags:
 *   - name: Transactions
 *     description: 트랜잭션 정보 조회
 */

/**
 * @swagger
 * /btc/tx/{txid}:
 *   get:
 *     summary: 트랜잭션 조회
 *     description: 트랜잭션 상세 조회
 *     tags: [Transactions]
 *     parameters:
 *       - name: txid
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: ca8381ba61c290f44dae1c6ec3d522423f09229d2191c1fde020f694906a36c8
 *     responses:
 *       200:
 *         description: 트랜잭션 상세 정보
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
 *                    txidInfo:
 *                      type: object
 *                      example:
 *                        txid: ca8381ba61c290f44dae1c6ec3d522423f09229d2191c1fde020f694906a36c8
 *                        hash: ace5055b3230b00c9ac3604e317c4e25a26271119fbb5a91b275b790ddc501fa
 *                        version: 2
 *                        size: 370
 *                        vsize: 208
 *                        weight: 832
 *                        locktime: 0
 *                        vin: [...]
 *                        vout: [...]
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
router.get("/:txid", controller.findOneByTxid);

// 해당
/**
 * @swagger
 * /btc/tx/inout/{txid}:
 *   get:
 *     summary: 트랜잭션의 input, output 정보 조회
 *     description: 트랜잭션의 input, output 정보 조회
 *     tags: [Transactions]
 *     parameters:
 *       - name: txid
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: ca8381ba61c290f44dae1c6ec3d522423f09229d2191c1fde020f694906a36c8
 *     responses:
 *       200:
 *         description: 트랜잭션 상세 정보, coinbase tx 인 경우 다름 530cb8316d620d1516d2c957ca65de0e5e2ae88a216c343433fa23fe6a01703c
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
 *                    txidInfo:
 *                      type: object
 *                      example:
 *                        txid: "ca8381ba61c290f44dae1c6ec3d522423f09229d2191c1fde020f694906a36c8"
 *                        fee: "0.00002000"
 *                        input: [
 *                          {no: 0, amount: "0.00012000", "address": "bc1qwscpldljs6r99pw3lth6vyu956vghepdcvf6zx"},
 *                          {no: 0, amount: "0.00021000", "address": "bc1qwscpldljs6r99pw3lth6vyu956vghepdcvf6zx"}
 *                        ]
 *                        output: [
 *                          {no: 0, amount: "0.00012000", "address": "bc1q2nvzu334xz7r30fse82fwwfqr6aetctx6gtsk4"},
 *                          {no: 0, amount: "0.00019000", "address": "bc1qwscpldljs6r99pw3lth6vyu956vghepdcvf6zx"}
 *                        ]
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
router.get("/inout/:txid", controller.findTxInoutByTxid);

module.exports = router;
