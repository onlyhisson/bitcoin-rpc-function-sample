require("dotenv").config({ path: "../.env" });
const CronJob = require("cron").CronJob;

const { debugLog } = require("../util");

const { getConnection } = require("../db");
const { saveBlockInfo, getDbLastBlockInfo } = require("../db/block");
const { saveTxidInfos } = require("../db/block_tx");

const { block } = require("../util/rpc");
const { getBlockCount, getBlockHash, getBlock } = block;

// cron func
async function blockTxid() {
  let conn = null;
  let updateBlockNum = 758450;

  const now = new Date().getTime();
  const createdAt = Math.round(now / 1000);

  console.log("");
  debugLog("Block TX Start", "", 20);

  try {
    conn = await getConnection();

    const rows = await getDbLastBlockInfo(conn);
    if (rows.length > 0) {
      const { block_no: dbLastBlockNum } = rows[0];
      if (updateBlockNum <= dbLastBlockNum) {
        updateBlockNum = dbLastBlockNum + 1;
      }
    }

    const lastBlock = Number(await getBlockCount());

    debugLog("Block TX", `main net last block number (no.${lastBlock})`, 20);

    if (updateBlockNum > lastBlock) {
      debugLog("Block TX End", "last block info already updated", 20);
      return;
    }

    debugLog("Block TX", `update block number (no.${updateBlockNum})`, 20);

    const blockHash = await getBlockHash(updateBlockNum); // 특정 블록 해시값
    const blockInfo = await getBlock(blockHash); // 특정 블록 정보
    const { height: blockNum, time, nTx, tx } = blockInfo;

    await conn.beginTransaction(); // 트랜잭션 시작

    // 블록 정보 저장
    await saveBlockInfo(conn, { blockNum, nTx, time, createdAt });

    const txParams = tx.map((el) => ({ txid: el, blockNum, createdAt }));

    // 각 블록의 txid 저장
    await saveTxidInfos(conn, txParams);

    await conn.commit(); // 트랜잭션 커밋
    debugLog("Block TX End", `last block info update succeed`, 20);
  } catch (err) {
    debugLog("Block TX ERROR blockTxid", err, 20);
    await conn.rollback(); // 트랜잭션 롤백
  } finally {
    if (conn) {
      await conn.release();
    }
  }
}

// 블록 정보 저장
const blockTxidJob = new CronJob(
  " */10 * * * * *",
  blockTxid,
  null,
  true,
  "Asia/Seoul"
);

blockTxidJob.start();
