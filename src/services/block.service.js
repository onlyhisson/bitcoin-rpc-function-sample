const { block } = require("../util/rpc");
const { getBlockChainInfo, getBlockCount, getBlockHash, getBlock } = block;
const { isNull } = require("../util");

async function get() {
  try {
    const result = await getBlockChainInfo(); // 블록체인정보
    return result;
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      message: err.message ? err.message : "error",
    };
  }
}

async function findLastOne() {
  try {
    const blockCount = await getBlockCount(); // 블록개수 = 마지막 블록 넘버
    const blockHash = await getBlockHash(blockCount); // 특정 블록 해시값
    const blockInfo = await getBlock(blockHash); // 특정 블록 정보
    return blockInfo;
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      message: err.message ? err.message : "error",
    };
  }
}

async function findOneByBlockNum(blocknum) {
  // 특정 블록 데이터 조회 함수
  try {
    if (isNull(blocknum)) {
      throw { message: `invalid parameter` };
    }

    const blockHash = await getBlockHash(blocknum); // 특정 블록 해시값
    const blockInfo = await getBlock(blockHash); // 특정 블록 정보
    return blockInfo;
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      message: err.message ? err.message : "error",
    };
  }
}

module.exports = {
  get,
  findLastOne,
  findOneByBlockNum,
};
