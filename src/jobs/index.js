const { getConnection } = require("../db");
const { getAddressList } = require("../db/wallet");
const { findUnspentTxOutputs } = require("../db/tx_output");
const { debugLog, wait } = require("../util");
const {
  WALLET_LIST,
  UNSPENT_OUTPUTS,
  getCacheInstance,
} = require("../util/cache");

const cronCache = getCacheInstance();

// 관리 지갑 주소 조회 및 캐싱
async function setWalletList() {
  let conn = null;
  try {
    conn = await getConnection();
    const walletObjs = await getAddressList(conn, {});
    const wallets = walletObjs.map((el) => el.address);
    debugLog("Set Wallet", `[ ${wallets.length} ]`, 20);
    cronCache.set(WALLET_LIST, wallets, 0);
  } catch (err) {
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
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

// 초기화
async function initCron() {
  try {
    const walletList = cronCache.get(WALLET_LIST);
    if (walletList === undefined) {
      await setWalletList();
    }

    const utxos = await cronCache.get(UNSPENT_OUTPUTS);
    if (utxos === undefined) {
      await setUnspentOutput();
    }
    const [cronName] = process.argv.slice(2);
    if (!cronName) {
      return;
    }
  } catch (err) {
    console.log("Cron initialation ERROR : ", err);
  }
}

// 웰렛 변경 될 경우 reset
async function resetWalletList() {
  try {
    await setWalletList();
    const walletList = cronCache.get(WALLET_LIST);
    console.log("reset wallet count : ", walletList.length);
  } catch (err) {
    console.log("reset wallet list ERROR : ", err);
    throw err;
  }
}

async function resetUnspentOutputs() {
  try {
    await setUnspentOutput();
  } catch (err) {
    console.log("reset unspent tx outputs ERROR : ", err);
    throw err;
  }
}

module.exports = {
  WALLET_LIST,
  UNSPENT_OUTPUTS,
  initCron,
  resetWalletList,
  resetUnspentOutputs,
};
