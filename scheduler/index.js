require("dotenv").config({ path: "./.env" });

const NodeCache = require("node-cache");
const cronCache = new NodeCache();

const { getConnection } = require("../db");
const { getWalletList } = require("../db/wallet");
const { findUnspentTxOutputs } = require("../db/tx_output");
const { debugLog } = require("../util");

const WALLET_LIST = "walletList";
const UNSPENT_OUTPUTS = "unspentOutputs";

// 관리 지갑 주소 조회 및 캐싱
async function setWalletList() {
  let conn = null;
  try {
    conn = await getConnection();
    const walletObjs = await getWalletList(conn, {});
    const wallets = walletObjs.map((el) => el.address);
    //debugLog("Set Wallet", wallets, 20);
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
    const utxos = cronCache.get(UNSPENT_OUTPUTS);
    if (walletList === undefined) {
      await setWalletList();
    }
    if (utxos === undefined) {
      await setUnspentOutput();
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
    console.log("reset wallet list : ", walletList);
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

initCron();

module.exports = {
  cronCache,
  initCron,
  resetWalletList,
  resetUnspentOutputs,
  UNSPENT_OUTPUTS,
};
