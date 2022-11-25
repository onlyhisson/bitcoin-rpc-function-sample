const { getConnection } = require("../dao");
const { getAddressList } = require("../dao/wallet.dao");
const { findUnspentTxOutputs } = require("../dao/tx_output.dao");
const { debugLog, wait } = require("../util");
const {
  ADDRESS_LIST,
  UNSPENT_OUTPUTS,
  getCacheInstance,
} = require("../util/cache");

const cronCache = getCacheInstance();

// 관리 지갑 주소 조회 및 캐싱
async function setAddressList() {
  let conn = null;
  try {
    conn = await getConnection();
    const addrObjs = await getAddressList(conn, {});
    const addresses = addrObjs.map((el) => el.address);
    debugLog("Set Wallet", `[ ${addresses.length} ]`, 20);
    cronCache.set(ADDRESS_LIST, addresses, 0);
  } catch (err) {
    throw err;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

// Unspent 트랜잭션 output 조회
async function setUnspentOutput() {
  let conn = null;
  try {
    conn = await getConnection();
    const utxoObjs = await findUnspentTxOutputs(conn, {});
    const utxos = utxoObjs.map((el) => ({
      id: el.id,
      txid: el.txid,
      voutNo: el.vout_no,
      amount: el.amount,
    }));
    cronCache.set(UNSPENT_OUTPUTS, utxos, 0);
  } catch (err) {
    throw err;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

// 초기화
async function initCron() {
  try {
    const addresses = cronCache.get(ADDRESS_LIST);
    if (addresses === undefined) {
      await setAddressList();
    }

    const utxos = await cronCache.get(UNSPENT_OUTPUTS);
    if (utxos === undefined) {
      await setUnspentOutput();
    }
  } catch (err) {
    debugLog("Cron initialation ERROR", err, 20);
  }
}

// 웰렛 변경 될 경우 reset
async function resetAddressList() {
  try {
    await setAddressList();
    debugLog("Reset Address Data", "", 20);
  } catch (err) {
    debugLog("Reset Address Data ERROR", err, 20);
    throw err;
  }
}

async function resetUnspentOutputs() {
  try {
    await setUnspentOutput();
  } catch (err) {
    debugLog("Reset unspent tx outputs ERROR", err, 20);
    throw err;
  }
}

module.exports = {
  ADDRESS_LIST,
  UNSPENT_OUTPUTS,
  initCron,
  resetAddressList,
  resetUnspentOutputs,
};
