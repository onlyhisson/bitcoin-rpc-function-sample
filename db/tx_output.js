const { debugLog } = require("../util");

// 해당 트랜잭션의 output 정보 저장
async function saveTxOutputInfo(conn, params) {
  const { txId, amount, address, voutNo } = params;
  const qry =
    "INSERT INTO tx_output (txid_id, amount, address, vout_no) VALUES ( ?, ?, ?, ?);";
  return new Promise(async (resolve, reject) => {
    try {
      await conn.execute(qry, [txId, amount, address, voutNo]);
      resolve(true);
    } catch (err) {
      debugLog("TX saveTxOutputInfo ERROR - params", params, 20);
      reject(err);
    }
  });
}

async function findTxOutputByTxidId(conn, params) {
  const { txidId } = params;
  const qry = "SELECT * FROM btc_wallet_dev.tx_output WHERE txid_id = ? ";
  return new Promise(async (resolve, reject) => {
    try {
      const [rows] = await conn.execute(qry, [txidId]);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { saveTxOutputInfo, findTxOutputByTxidId };
