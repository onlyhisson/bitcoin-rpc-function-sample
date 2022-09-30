require("dotenv").config();

const {
  getBlockChainInfo,
  getBlockCount,
  getBlockHash,
  getBlock,
} = require("./util/rpc");

async function lastestBlockInfo() {
  try {
    const blockChainInfo = await getBlockChainInfo(); // 블록체인정보
    const blockCount = await getBlockCount(); // 블록개수
    const blockHash = await getBlockHash(blockCount); // 특정 블록 해시값
    const blockInfo = await getBlock(blockHash); // 특정 블록 정보
    console.log("blockChainInfo : ", blockChainInfo);
    console.log("blockCount : ", blockCount);
    console.log("blockHash : ", blockHash);
    console.log("blockInfo : ", blockInfo);
  } catch (err) {
    console.error("[ERROR] : ", err);
  }
}

lastestBlockInfo();
