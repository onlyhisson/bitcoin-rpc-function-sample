const CronJob = require("cron").CronJob;
const Big = require("big.js");

const { getConnection } = require("../dao");
const { updateUnspentTxOutputs } = require("../dao/tx_output.dao");

const { debugLog } = require("../util");
const { getCacheInstance, UNSPENT_OUTPUTS } = require("../util/cache");
const { wallet, transaction } = require("../util/rpc");
const { getWalletBalance } = wallet;
const { getUnspentTxOutput } = transaction;

const { resetUnspentOutputs } = require("./common");

const cronCache = getCacheInstance();
const TZ = process.env.TIMEZONE;

const WALLET_NAME = "wallet1"; // 임시
const ONCE_OUTPUT_CNT = 10;
let utxoQueue = [];

// 큐에 쌓은 output 이 mempool 등록 및 confirmed 상태인지 확인
const spentJob = new CronJob(" 30 * * * * *", checkOutputSpent, null, true, TZ);

// unspent 상태인 tx의 output 들을 큐에 쌓음 - 잔액 개념
// 큐에 데이터 쌓여 있을 경우 stop, 비워지면 start
const pushQueueUtxoJob = new CronJob(
  " * * * * * *",
  updateUnspentOutputs,
  null,
  true,
  TZ
);

// uxto 조회 및 큐에 쌓음
async function updateUnspentOutputs() {
  try {
    if (utxoQueue.length > 0) {
      return;
    }
    await resetUnspentOutputs(); // db 에서 unspent 상태의 tx output 큐에 쌓음

    utxoQueue = cronCache.get(UNSPENT_OUTPUTS);
    utxoId = utxoQueue.map((el) => el.id); // unspent 상태의 tx output 키값

    // db 상 utxo 잔액 합
    const balance = utxoQueue.reduce(reduceSumBigAmount, 0);

    const {
      mine: { trusted, untrusted_pending, immature },
    } = await getWalletBalance(WALLET_NAME);

    /*
    console.log();
    debugLog("UTXO Unspent Output Count", utxoId.length, 30);
    debugLog("UTXO Unspent Output Sum", `${balance} BTC`, 30);
    debugLog(
      "UTXO RPC Wallet",
      `${new Big(trusted).toFixed(8)} BTC [ ${WALLET_NAME} ] `,
      30
    );
    */
  } catch (err) {
    console.log("updateUnspentOutputs ERROR : ", err);
  }
}

// bitcoin cli 명령어로 해당 output 상태 조회 및 db 업데이트
async function checkOutputSpent() {
  let conn = null;

  try {
    if (utxoQueue.length < 1) {
      return;
    }
    pushQueueUtxoJob.stop();

    const qLen = utxoQueue.length;
    const uxtos =
      qLen > ONCE_OUTPUT_CNT ? utxoQueue.slice(0, ONCE_OUTPUT_CNT) : utxoQueue;

    conn = await getConnection();
    await conn.beginTransaction();
    const pSpentOutputs = uxtos.map(async (uxto) => {
      const { id, txid, voutNo } = uxto;
      const utxoInfo = await getUnspentTxOutput(uxto); // spent 되면 null return
      return utxoInfo === null ? id : null;
    });

    let spentOutputIds = await Promise.all(pSpentOutputs);
    spentOutputIds = spentOutputIds.filter((el) => el !== null);

    // spent 처리 DB 업데이트
    if (spentOutputIds.length > 0) {
      await updateUnspentTxOutputs(conn, {
        isSpent: 1, // 1 : spent status
        outputs: spentOutputIds,
      });
      debugLog("UTXO Spent Output Ids Updated", spentOutputIds, 30);
    }

    await conn.commit(); // 트랜잭션 커밋

    // 에러없는 경우 큐에서 처리한 utxo는 제거
    if (qLen > ONCE_OUTPUT_CNT) {
      utxoQueue = utxoQueue.slice(ONCE_OUTPUT_CNT, qLen);
    } else {
      utxoQueue = [];
    }
  } catch (err) {
    console.log(err);
    await conn.rollback(); // 트랜잭션 롤백
  } finally {
    if (conn) {
      await conn.release();
    }

    if (utxoQueue.length === 0) {
      pushQueueUtxoJob.start();
    }
  }
}

// amount 합 리듀스
function reduceSumBigAmount(pOutput, cOutput) {
  const x =
    typeof pOutput === "object" ? new Big(pOutput.amount) : new Big(pOutput);
  const y = new Big(cOutput.amount);
  return x.plus(y).toFixed(8);
}

module.exports = {
  spentJob,
  pushQueueUtxoJob,
};
