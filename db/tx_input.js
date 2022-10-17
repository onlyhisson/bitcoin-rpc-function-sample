const { debugLog } = require("../util");

// 해당 트랜잭션의 input 정보 저장
async function saveTxInputInfo(conn, params) {
  const { txId, prevTxid, voutNo } = params;
  const qry =
    "INSERT INTO tx_input (txid_id, prev_txid, vout_no) VALUES ( ?, ?, ? );";
  return new Promise(async (resolve, reject) => {
    try {
      await conn.execute(qry, [txId, prevTxid, Number(voutNo)]);
      resolve(true);
    } catch (err) {
      debugLog("TX saveTxInputInfo ERROR - params", params, 20);
      reject(err);
    }
  });
}

// 해당 트랜잭션의 input 정보 저장 - bulk insert
async function saveTxInputInfos(conn, params) {
  let paramArr = [];
  params.forEach((el) => {
    const { txId, prevTxid, voutNo } = el;
    paramArr = [...paramArr, txId, prevTxid, voutNo];
  });

  let qry = "INSERT INTO tx_input (txid_id, prev_txid, vout_no)";
  for (let i = 0; i < params.length; i++) {
    qry += i === 0 ? " VALUES ( ?, ?, ? ) " : ", (?, ?, ?) ";
  }
  return new Promise(async (resolve, reject) => {
    try {
      await conn.execute(qry, paramArr);
      resolve(true);
    } catch (err) {
      debugLog("TX saveTxInputInfo ERROR - params", params, 20);
      reject(err);
    }
  });
}

// 해당 트랜잭션의 input 정보 조회
async function findTxInputByTxidId(conn, params) {
  const { txidId } = params;
  const qry = "SELECT * FROM btc_wallet_dev.tx_input WHERE txid_id = ? ";
  return new Promise(async (resolve, reject) => {
    try {
      const [rows] = await conn.execute(qry, [txidId]);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  saveTxInputInfo,
  saveTxInputInfos,
  findTxInputByTxidId,
};
