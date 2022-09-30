const { executeCommand } = require("../");

const RPC_INFO = {
  host: process.env.RPC_HOST,
  port: process.env.RPC_PORT,
  user: process.env.RPC_USER,
  password: process.env.RPC_PASSWORD,
};

const commonParams = [
  `-rpcconnect=${RPC_INFO.host}`,
  `-rpcuser=${RPC_INFO.user}`,
  `-rpcpassword=${RPC_INFO.password}`,
  `-rpcport=${RPC_INFO.port}`,
];

/**
 * 블록 체인 정보
 */
async function getBlockChainInfo() {
  try {
    const params = [...commonParams, `getblockchaininfo`];
    const cmdResult = await executeCommand("bitcoin-cli", params, {});
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
    const params = [...commonParams, `getblockcount`];
    const cmdResult = await executeCommand("bitcoin-cli", params, {});

    return cmdResult;
  } catch (err) {
    throw err;
  }
}

/**
 * 블록 해시 정보
 */
async function getBlockHash(num) {
  try {
    const params = [...commonParams, `getblockhash`, num];
    const cmdResult = await executeCommand("bitcoin-cli", params, {});

    return cmdResult;
  } catch (err) {
    throw err;
  }
}

/**
 * 블록 전체 정보
 */
async function getBlock(hash) {
  try {
    const params = [...commonParams, `getblock`, hash];
    const cmdResult = await executeCommand("bitcoin-cli", params, {});

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
};
