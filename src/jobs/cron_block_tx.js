const CronJob = require("cron").CronJob;

const { getConnection } = require("../dao");
const { insBlockInfo, getDbLastBlockInfo } = require("../dao/block.dao");
const { insTxidInfos } = require("../dao/block_tx.dao");

const { debugLog, getFormatUnixTime } = require("../util");
const { block } = require("../util/rpc");
const { getBlockCount, getBlockHash, getBlock } = block;

const TZ = process.env.TIMEZONE;

const blockTxidJob = new CronJob(" 0 * * * * *", blockTxid, null, true, TZ);

// cron func
async function blockTxid() {
  let conn = null;
  let updateBlockNum = 759345;

  const createdAt = getFormatUnixTime();

  try {
    conn = await getConnection();

    const lastBlockInfo = await getDbLastBlockInfo(conn);
    if (lastBlockInfo.length > 0) {
      const { block_no: dbLastBlockNum } = lastBlockInfo[0];
      if (updateBlockNum <= dbLastBlockNum) {
        updateBlockNum = dbLastBlockNum + 1;
      }
    }

    const lastBlock = Number(await getBlockCount());

    if (updateBlockNum > lastBlock) {
      //debugLog("Block TX End", "last block info already updated", 20);
      return;
    }

    const blockHash = await getBlockHash(updateBlockNum); // 특정 블록 해시값
    const blockInfo = await getBlock(blockHash); // 특정 블록 정보
    const { height: blockNum, time, nTx, tx } = blockInfo;

    await conn.beginTransaction(); // 트랜잭션 시작

    // 블록 정보 저장
    await insBlockInfo(conn, { blockNum, nTx, time, createdAt });

    const txParams = tx.map((el) => ({ txid: el, blockNum, createdAt }));

    // 각 블록의 txid 저장
    await insTxidInfos(conn, txParams);

    await conn.commit(); // 트랜잭션 커밋

    console.log("");
    debugLog("Block TX Start", "", 20);
    //debugLog("Block TX", `Wallet Address Count [ ${walletList.length} ]`, 20);
    debugLog("Block TX", `main net last block number no [ ${lastBlock} ]`, 20);
    debugLog("Block TX", `update block number no [ ${updateBlockNum} ]`, 20);
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

module.exports = {
  blockTxidJob,
};
