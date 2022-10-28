require("dotenv").config({ path: "../.env" });
const Big = require("big.js");
const CronJob = require("cron").CronJob;

const { debugLog } = require("../util");
const { wallet, transaction } = require("../util/rpc");
const { getUnspentTxOutput } = transaction;
const { getWalletBalance } = wallet;
const { getConnection } = require("../db");
const { updateUnspentTxOutputs } = require("../db/tx_output");

const { cronCache, resetUnspentOutputs, UNSPENT_OUTPUTS } = require(".");

const WALLET_NAME = "wallet1"; // 임시
const ONCE_OUTPUT_CNT = 10;
let utxoQueue = [];

const spentJob = new CronJob(
  " * * * * * *",
  checkOutputSpent,
  null,
  true,
  "Asia/Seoul"
);

const updateUtxoJob = new CronJob(
  " */10 * * * * *",
  updateUnspentOutputs,
  null,
  true,
  "Asia/Seoul"
);

spentJob.start();
updateUtxoJob.start();

// uxto 업데이트
async function updateUnspentOutputs() {
  try {
    if (utxoQueue.length > 0) {
      return;
    }
    await resetUnspentOutputs();
    utxoQueue = cronCache.get(UNSPENT_OUTPUTS);
    const balance = utxoQueue.reduce(reduceSumBigAmount, 0);
    utxoId = utxoQueue.map((el) => el.id);

    const {
      mine: { trusted, untrusted_pending, immature },
    } = await getWalletBalance(WALLET_NAME);

    console.log();
    debugLog("UTXO Unspent Output Ids", utxoId, 30);
    debugLog("UTXO Unspent Output Sum", `${balance} BTC`, 30);
    debugLog(
      "UTXO RPC Server Wallet",
      `${trusted} BTC [ ${WALLET_NAME} ] `,
      30
    );
  } catch (err) {
    console.log("updateUnspentOutputs ERROR : ", err);
  }
}

async function checkOutputSpent() {
  let conn = null;

  try {
    if (utxoQueue.length < 1) {
      return;
    }
    updateUtxoJob.stop();

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
      updateUtxoJob.start();
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
