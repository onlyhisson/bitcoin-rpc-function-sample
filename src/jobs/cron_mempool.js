const CronJob = require("cron").CronJob;
const Big = require("big.js");

const { getConnection } = require("../dao");
const { insMempoolInfo } = require("../dao/block.dao");

const { debugLog, getFormatUnixTime, btcToSatoshi } = require("../util");
const { block } = require("../util/rpc");
const { getMempoolInfo } = block;
const { getCacheInstance, MEMPOOL_INFO_LAST } = require("../util/cache");

const cronCache = getCacheInstance();
const TZ = process.env.TIMEZONE;

const mempoolJob = new CronJob(" 10 * * * * *", getMempool, null, true, TZ);

async function getMempool() {
  let conn = null;

  const createdAt = getFormatUnixTime();

  try {
    const mempoolInfo = await getMempoolInfo();
    const {
      size: txCnt,
      bytes,
      usage: memoryUsage,
      maxmempool: memoryMax,
      total_fee: feeTotal,
      mempoolminfee: feeMin, // 1 tx accept 단위
      minrelaytxfee: feeRelay,
    } = mempoolInfo;

    const feePerByte = new Big(feeTotal).div(bytes).toFixed(8);
    const feePerTx = new Big(feeTotal).div(txCnt).toFixed(8);
    const feeTotalFixed = new Big(feeTotal).toFixed(8);

    // 아래 파라미터 순서 중요!!
    const params = {
      time: createdAt,
      txCnt,
      bytes,
      memoryUsage,
      memoryMax,
      feeTotal: feeTotalFixed,
      feeMin: btcToSatoshi(feeMin),
      feeRelay: btcToSatoshi(feeRelay),
      satPerByte: btcToSatoshi(feePerByte),
      satPerTx: btcToSatoshi(feePerTx),
    };

    conn = await getConnection();

    await insMempoolInfo(conn, params);

    // 수수료 조회시 호출되는 DB 조회 줄이기 위해 mempool 정보 캐싱
    cronCache.set(MEMPOOL_INFO_LAST, params, 0);

    console.log();
    debugLog("MEMPOOL updated", JSON.stringify(mempoolInfo), 10);
  } catch (err) {
    debugLog("MEMPOOL ERROR ", err, 10);
  } finally {
    if (conn) {
      await conn.release();
    }
  }
}
