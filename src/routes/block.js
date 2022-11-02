const express = require("express");
const router = express.Router();
const controller = require("../controllers/block.controller");

/**
 * @swagger
 * tags:
 *   - name: Block
 *     description: Block
 */

/**
 * @swagger
 * /block:
 *   get:
 *     description: Block to the application
 *     tags: [Block]
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: block
 */
router.get("/", controller.get);

/**
 * @swagger
 * /block/last:
 *   get:
 *     description: 마지막 블록 데이터 조회
 *     tags: [Block]
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: block
 */
router.get("/last", controller.lastOne);

/**
 * @swagger
 * /block/{block_no}:
 *  get:
 *    summary: "특정 블록 넘버 정보 조회"
 *    description: 마지막 블록 데이터 조회
 *    tags: [Block]
 *    parameters:
 *      - in: path
 *        name: block_no
 *        required: true
 *        description: 특정 블록 넘버
 *        schema:
 *          type: string
 *    responses:
 *      "200":
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
