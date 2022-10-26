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

/**
 * 완료 X
 */
async function createRawTransaction(sendInfo) {
  try {
    const { txids, to, amount } = sendInfo;
    let txidData = "";
    txids.forEach((el, idx) => {
      if (idx === 0) {
        txidData += `{\"txid\": \"${el.txid}\",\"vout\": ${el.vout},\"sequence\":1 }`;
      } else {
        txidData += `,{\"txid\": \"${el.txid}\",\"vout\": ${el.vout},\"sequence\":1 }`;
      }
    });
    const fData = `"[${txidData}]" `;
    const tData = `"[{\"${to}\":${amount}}]"`;
    const params = [...RPC_OPTION, `createrawtransaction`, fData, tData];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return cmdResult;
  } catch (err) {
    throw err;
  }
}

/**
 * 트랜잭션 output spent 확인
 */
async function getUnspentTxOutput(outputInfo) {
  try {
    const { txid, voutNo } = outputInfo;
    const params = [...RPC_OPTION, `gettxout`, txid, voutNo];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return cmdResult.length > 0 ? JSON.parse(cmdResult) : null;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getRawTransaction,
  getDecodeRawTransaction,
  createRawTransaction,
  getUnspentTxOutput,
};
