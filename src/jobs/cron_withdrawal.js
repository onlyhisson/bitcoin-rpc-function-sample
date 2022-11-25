const CronJob = require("cron").CronJob;

const { getConnection } = require("../dao");
const { findByTxid } = require("../dao/block_tx.dao");
const {
  findWithdrawalCoinReq,
  updateWithdrawalCoinReqById,
} = require("../dao/assets.dao");

const { debugLog, getFormatUnixTime } = require("../util");

const TZ = process.env.TIMEZONE;

// 출금 신청 db 업데이트, unconfirmed -> confirmed
const withdrawalReqJob = new CronJob(
  " 40 * * * * *",
  withdrawalReq,
  null,
  true,
  TZ
);

async function withdrawalReq() {
  let conn = null;
  const updatedAt = getFormatUnixTime();

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
        updatedAt,
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

module.exports = {
  withdrawalReqJob,
};
