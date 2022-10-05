const { executeCommand } = require("..");
const { BITCOIN_CMD, RPC_OPTION } = require("../../static");

/**
 * 트랜잭션 raw 데이터 조회
 */
async function getRawTransaction(txid) {
  try {
    const params = [...RPC_OPTION, `getrawtransaction`, txid];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return cmdResult;
  } catch (err) {
    throw err;
  }
}

/**
 * 트랜잭션 raw 데이터 디코드 데이터
 */
async function getDecodeRawTransaction(rawData) {
  try {
    const params = [...RPC_OPTION, `decoderawtransaction`, rawData];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getRawTransaction,
  getDecodeRawTransaction,
};
