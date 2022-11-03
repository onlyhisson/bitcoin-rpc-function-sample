/**
 * [ 전역 데이터 관리 ]
 * 지갑 주소 목록 - 블록이 생성됨에 따라 처리되는 트랜잭션 모니터링
 * 트랜잭션의 outputs - 잔액 개념, 사용자의 출금요청 처리 상태 변경
 * 각 스케쥴러 start or stop - 새로운 지갑 목록을 캐싱해야 할 시
 */

const NodeCache = require("node-cache");
let cronCache = null;

const BLOCK_JOB_START = "blockJobStart";
const BLOCK_JOB_STOP = "blockJobStop";
const TX_JOB_START = "txJobStart";
const TX_JOB_STOP = "txJobStop";
const WALLET_LIST = "walletList";
const UNSPENT_OUTPUTS = "unspentOutputs";

function getCacheInstance() {
  if (!cronCache) {
    cronCache = new NodeCache();
    return cronCache;
  } else {
    return cronCache;
  }
}

module.exports = {
  getCacheInstance,
  WALLET_LIST,
  UNSPENT_OUTPUTS,
  BLOCK_JOB_START,
  BLOCK_JOB_STOP,
  TX_JOB_START,
  TX_JOB_STOP,
};
