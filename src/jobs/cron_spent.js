const CronJob = require("cron").CronJob;
const Big = require("big.js");

const { getConnection } = require("../db");
const { findByTxid } = require("../db/block_tx");
const { updateUnspentTxOutputs } = require("../db/tx_output");
const {
  findWithdrawalCoinReq,
  updateWithdrawalCoinReqById,
} = require("../db/assets");

const { debugLog } = require("../util");
const {
  getCacheInstance,
  ADDRESS_LIST,
  UNSPENT_OUTPUTS,
} = require("../util/cache");
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
  "Asia/Seoul"
);

// 출금 신청 db 업데이트, unconfirmed -> confirmed
const withdrawalReqJob = new CronJob(
  " 40 * * * * *",
  withdrawalReq,
  null,
  true,
  "Asia/Seoul"
);

async function withdrawalReq() {
  let conn = null;
  try {
    conn = await getConnection();
    const unconfirms = await findWithdrawalCoinReq(conn, {
      status: 2 /* unconfirmed */,
    });

    console.log();
    // 출금 승인후 해당 트랜잭션이 아직 블록체인 블럭에 반영 되지 않은 건수
    // 출금 요청 상태는 카운트 포함 X
    debugLog(
      "Withdrawal Req Unconfirmed count",
      `[ ${unconfirms.length} ]`,
      30
    );

    if (unconfirms.length < 1) {
      return;
    }

    await conn.beginTransaction();

    const pFindTx = unconfirms.map(async (el) => {
      const { id, txid, start_block_no } = el;
      const rows = await findByTxid(conn, { txid, blockNum: start_block_no });
      if (rows.length > 0) {
        const temp = rows[0];
        temp.reqId = id;
        return temp;
      } else {
        return null;
      }
    });
    const findTxs = (await Promise.all(pFindTx)).filter((el) => el !== null);
    const pConfirmedReq = findTxs.map(async (el) => {
      const { reqId, block_no } = el;
      await updateWithdrawalCoinReqById(conn, {
        reqId,
        status: 3 /* confirmed */,
        txBlockNum: block_no,
      });
    });
    await Promise.all(pConfirmedReq);

    await conn.commit(); // 트랜잭션 커밋
  } catch (err) {
    console.log(err);
    await conn.rollback(); // 트랜잭션 커밋
  } finally {
    if (conn) conn.release();
  }
}

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

    console.log();
    debugLog("UTXO Unspent Output Count", utxoId.length, 30);
    debugLog("UTXO Unspent Output Sum", `${balance} BTC`, 30);
    debugLog(
      "UTXO RPC Wallet",
      `${new Big(trusted).toFixed(8)} BTC [ ${WALLET_NAME} ] `,
      30
    );
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
  withdrawalReqJob,
};
