// 블록 정보 저장
async function insBlockInfo(conn, params) {
  const { blockNum, nTx, time, createdAt } = params;
  const qry =
    "INSERT INTO block_info (block_no, tx_cnt, time, created_at) VALUES (?, ?, ?, ?)";
  return new Promise(async (resolve, reject) => {
    try {
      await conn.execute(qry, [blockNum, nTx, time, createdAt]);
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}

// 디비에 저장된 마지막 블록 정보 조회
async function getDbLastBlockInfo(conn) {
  const qry = "SELECT * FROM block_info ORDER BY block_no DESC LIMIT 1;";
  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry);
    resolve(rows);
  });
}

// mempool 상태 저장
async function insMempoolInfo(conn, params) {
  let qry = " INSERT INTO mempool_info ( ";
  qry += "  time, tx_cnt, bytes, usage_memory, max_memory, total_fee, ";
  qry += "  tx_min_fee, tx_relay_fee, fee_per_byte, fee_per_tx ";
  qry += " ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ";
  return new Promise(async (resolve, reject) => {
    try {
      await conn.execute(qry, Object.values(params));
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}

async function getLastMempoolInfo(conn) {
  const qry = "SELECT * FROM mempool_info ORDER BY time DESC LIMIT 1";
  return new Promise(async (resolve, reject) => {
    try {
      const [rows] = await conn.execute(qry);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  insBlockInfo,
  getDbLastBlockInfo,
  insMempoolInfo,
  getLastMempoolInfo,
};
