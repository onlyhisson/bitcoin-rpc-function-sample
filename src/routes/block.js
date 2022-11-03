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
 * /blocks:
 *   get:
 *     description: 블록체인 정보
 *     tags: [Blocks]
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: block
 *       400:
 *         description: Invalid request
 */
router.get("/", controller.get);

/**
 * @swagger
 * /blocks/last:
 *   get:
 *     description: 마지막 블록 데이터 조회
 *     tags: [Blocks]
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: block
 */
router.get("/last", controller.findLastOne);

/**
 * @swagger
 * /blocks/{blockNo}:
 *  get:
 *    summary: 특정 블록 넘버 정보 조회
 *    description: 마지막 블록 데이터 조회
 *    tags: [Blocks]
 *    parameters:
 *      - in: path
 *        name: block_no
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
router.get("/:blocknum", controller.findOneByBlockNum);

module.exports = router;
