const express = require("express");
const router = express.Router();
const controller = require("../controllers/block.controller");

/**
 * @swagger
 *  tags:
 *   - name: Blocks
 *     description: 블록
 */

/**
 * @swagger
 * /btc/blockinfo:
 *   get:
 *     summary: 블록체인 정보
 *     description: 블록체인 정보
 *     tags: [Blocks]
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: block
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
router.get("/blockinfo", controller.get);

/**
 * @swagger
 * /btc/lastblock:
 *   get:
 *     summary: 마지막 블록 데이터 조회
 *     description: 마지막 블록 데이터 조회
 *     tags: [Blocks]
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: block
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
router.get("/lastblock", controller.findLastOne);

/**
 * @swagger
 * /btc/blocks/{blockNo}:
 *  get:
 *    summary: 특정 블록 넘버 정보 조회
 *    description: 마지막 블록 데이터 조회
 *    tags: [Blocks]
 *    parameters:
 *      - in: path
 *        name: blockNo
 *        required: true
 *        description: 특정 블록 넘버
 *        schema:
 *          type: integer
 *        example: 1
 *    responses:
 *      200:
 *        description: 특정 블록 정보 상세
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                success:
 *                  type: boolean
 *                data:
 *                  type: object
 */
router.get("/blocks/:blocknum", controller.findOneByBlockNum);

module.exports = router;
