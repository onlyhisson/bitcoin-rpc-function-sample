const { debugLog } = require("../util");

// 해당 트랜잭션의 output 정보 저장
async function insTxOutputInfo(conn, params) {
  const { txId, amount, address, voutNo } = params;
  const qry =
    "INSERT INTO tx_output (txid_id, amount, address, vout_no) VALUES ( ?, ?, ?, ?);";
  return new Promise(async (resolve, reject) => {
    try {
      await conn.execute(qry, [txId, amount, address, voutNo]);
      resolve(true);
    } catch (err) {
      debugLog("TX insTxOutputInfo ERROR - params", params, 20);
      reject(err);
    }
  });
}

// 해당 트랜잭션의 output 정보 저장 - bulk insert
async function insTxOutputInfos(conn, params) {
  let paramArr = [];
  params.forEach((el) => {
    const { txId, amount, address, voutNo } = el;
    paramArr = [...paramArr, txId, amount, address, voutNo];
  });

  let qry = "INSERT INTO tx_output (txid_id, amount, address, vout_no)";
  for (let i = 0; i < params.length; i++) {
    qry += i === 0 ? " VALUES ( ?, ?, ?, ?) " : ", ( ?, ?, ?, ?)  ";
  }

  return new Promise(async (resolve, reject) => {
    try {
      await conn.execute(qry, paramArr);
      resolve(true);
    } catch (err) {
      debugLog("TX insTxOutputInfo ERROR - params", params, 20);
      reject(err);
    }
  });
}

async function findTxOutputByTxidId(conn, params) {
  const { txidId } = params;
  const qry = "SELECT * FROM tx_output WHERE txid_id = ? ";
  return new Promise(async (resolve, reject) => {
    try {
      const [rows] = await conn.execute(qry, [txidId]);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

// unspent output 조회 - 잔액 개념
async function findUnspentTxOutputs(conn, params) {
  let conditions = [];

  let qry = " SELECT ";
  qry += "  tout.id, ";
  qry += "  bt.txid, ";
  qry += "  tout.vout_no, ";
  qry += "  tout.address, ";
  qry += "  tout.amount ";
  qry += " FROM tx_output tout ";
  qry += "  INNER JOIN block_tx bt ";
  qry += "  ON bt.id = tout.txid_id ";
  qry += " WHERE tout.is_spent = 0 ";
  if (params.address) {
    qry += " AND tout.address = ? ";
    conditions.push(params.address);
  }
  qry += " ORDER BY tout.id";
  return new Promise(async (resolve, reject) => {
    try {
      const [rows] = await conn.execute(qry, conditions);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

async function updateUnspentTxOutputs(conn, params) {
  const { isSpent, outputs } = params;
  const ids = outputs.join(",");
  let qry = `UPDATE tx_output `;
  qry += ` SET is_spent = ? WHERE id IN(${ids}) `;
  return new Promise(async (resolve, reject) => {
    try {
      const [rows] = await conn.execute(qry, [isSpent]);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  insTxOutputInfo,
  insTxOutputInfos,
  findTxOutputByTxidId,
  findUnspentTxOutputs,
  updateUnspentTxOutputs,
};
