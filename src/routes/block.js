const express = require("express");
const router = express.Router();

const { block, transaction, wallet } = require("../util/rpc");
const { getBlockChainInfo, getBlockCount, getBlockHash, getBlock } = block;
const { isNull } = require("../util");

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

router.get("/", async function (req, res) {
  try {
    const blockChainInfo = await getBlockChainInfo(); // 블록체인정보
    res.json({
      success: true,
      data: {
        blockChainInfo,
      },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);
    res.json({
      success: false,
      messgage: "error",
    });
  }
});

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
router.get("/last", async function (req, res) {
  try {
    const blockCount = await getBlockCount(); // 블록개수 = 마지막 블록 넘버
    const blockHash = await getBlockHash(blockCount); // 특정 블록 해시값
    const blockInfo = await getBlock(blockHash); // 특정 블록 정보
    res.json({
      success: true,
      data: {
        blockInfo,
      },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);
    res.json({
      success: false,
      messgage: "error",
    });
  }
});

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
router.get("/:blocknum", async function (req, res) {
  // 특정 블록 데이터 조회 함수
  try {
    const { blocknum } = req.params;

    if (isNull(blocknum)) {
      throw { message: `invalid parameter` };
    }

    const blockHash = await getBlockHash(blocknum); // 특정 블록 해시값
    const blockInfo = await getBlock(blockHash); // 특정 블록 정보
    res.json({
      success: true,
      data: {
        blockInfo,
      },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);
    res.json({
      success: false,
      messgage: "error",
    });
  }
});

module.exports = router;
