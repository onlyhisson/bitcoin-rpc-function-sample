const CronJob = require("cron").CronJob;
const Big = require("big.js");

const { getConnection } = require("../db");
const { saveMempoolInfo } = require("../db/block");

const { debugLog, getFormatUnixTime, btcToSatoshi } = require("../util");
const { block } = require("../util/rpc");
const { getMempoolInfo } = block;

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

    console.log(mempoolInfo);
    console.log(feePerByte);

    const params = {
      time: createdAt,
      txCnt,
      bytes,
      memoryUsage,
      memoryMax,
      feeTotal,
      feeMin: btcToSatoshi(feeMin),
      feeRelay: btcToSatoshi(feeRelay),
      satPerByte: btcToSatoshi(feePerByte),
    };

    conn = await getConnection();

    await saveMempoolInfo(conn, params);

    debugLog("MEMPOOL updated", params, 10);
  } catch (err) {
    debugLog("MEMPOOL ERROR ", err, 10);
  } finally {
    if (conn) {
      await conn.release();
    }
  }
}
