require("dotenv").config({ path: "./.env" });

const NodeCache = require("node-cache");
const cronCache = new NodeCache();

const { getConnection } = require("../db");
const { getWalletList } = require("../db/wallet");
const { debugLog } = require("../util");

const WALLET_LIST = "walletList";

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

// 초기화
async function initCron() {
  try {
    const walletList = cronCache.get(WALLET_LIST);
    if (walletList === undefined) {
      await setWalletList();
    }
  } catch (err) {
    console.log("Cron initialation ERROR : ", err);
  }
}

// 웰렛 변경 될 경우 reset
async function resetCron() {
  try {
    await setWalletList();
    const walletList = cronCache.get(WALLET_LIST);
    console.log("resetCron walletList : ", walletList);
  } catch (err) {
    console.log("Cron reset ERROR : ", err);
  }
}

initCron();

module.exports = {
  initCron,
  resetCron,
  cronCache,
};
