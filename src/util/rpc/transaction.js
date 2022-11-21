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
 * raw transaction 생성
 */
async function createRawTransaction(params) {
  try {
    const {
      utxos, // [{txid, vout_no}, ...]
      to, // 반드시 출금 외 나머지 잔액을 from 주소로 보내는 정보 있어야함
    } = params;

    const fParams = utxos.map(
      (el) => `{\"txid\": \"${el.txid}\",\"vout\":${el.vout_no}}`
    );
    const tParams = to.map((el) => `{\"${el.addr}\":${el.amount}}`);
    //const fCmdParam = `"[${txidData}]" `;
    //const toCmdParam = `"[{\"${to}\":${amount}}]"`;
    const fCmdParam = `[${fParams.join(",")}]`;
    const toCmdParam = `[${tParams.join(",")}]`;
    const params = [
      ...RPC_OPTION,
      `createrawtransaction`,
      fCmdParam,
      toCmdParam,
    ];
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

/**
 * 트랜잭션 생성
 */
/*
async function createRawTransaction(params) {
  const { from, to } = params;
  try {
    const params = [...RPC_OPTION, `createrawtransaction`, from, to];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return cmdResult;
  } catch (err) {
    throw err;
  }
}
*/

/**
 * 해당 트랜잭션이 mempool 에 accept 가능한지 확인
 */
async function testMemPoolAccept(signedRawTx) {
  try {
    const params = [...RPC_OPTION, `testmempoolaccept`, signedRawTx];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return cmdResult.length > 0 ? JSON.parse(cmdResult)[0] : null;
  } catch (err) {
    throw err;
  }
}

/**
 * 해당 트랜잭션이 mempool 에 accept 가능한지 확인
 */
async function sendRawTransaction(signedRawTx) {
  try {
    const params = [...RPC_OPTION, `sendrawtransaction`, signedRawTx];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return cmdResult;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getRawTransaction,
  getDecodeRawTransaction,
  createRawTransaction,
  getUnspentTxOutput,
  testMemPoolAccept,
  sendRawTransaction,
};
