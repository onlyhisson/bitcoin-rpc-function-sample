const { executeCommand } = require("../");
const { BITCOIN_CMD, RPC_OPTION } = require("../../static");

/**
 * 블록 체인 정보
 */
async function getBlockChainInfo() {
  try {
    const params = [...RPC_OPTION, `getblockchaininfo`];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

/**
 * 마지막 블록 넘버
 */
async function getBlockCount() {
  try {
    const params = [...RPC_OPTION, `getblockcount`];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});

    return cmdResult;
  } catch (err) {
    throw err;
  }
}

/**
 * 특정 블록 해시 정보
 */
async function getBlockHash(num) {
  try {
    const params = [...RPC_OPTION, `getblockhash`, num];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});

    return cmdResult;
  } catch (err) {
    throw err;
  }
}

/**
 * 특정 블록 전체 정보
 */
async function getBlock(hash) {
  try {
    const params = [...RPC_OPTION, `getblock`, hash];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});

    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

/**
 * mempool 정보(전체 수수료, 최소 수수료, tx 개수, bytes, 메모리 사용..)
 */
async function getMempoolInfo() {
  try {
    const params = [...RPC_OPTION, `getmempoolinfo`];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});

    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getBlockChainInfo,
  getBlockCount,
  getBlockHash,
  getBlock,
  getMempoolInfo,
};
