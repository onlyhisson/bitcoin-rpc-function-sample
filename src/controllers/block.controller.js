const { block, transaction, wallet } = require("../util/rpc");
const { getBlockChainInfo, getBlockCount, getBlockHash, getBlock } = block;
const { isNull } = require("../util");

async function get(req, res, next) {
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
}

async function lastOne(req, res, next) {
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
}

async function findOneByBlockNum(req, res, next) {
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
}

module.exports = {
  get,
  lastOne,
  findOneByBlockNum,
};
