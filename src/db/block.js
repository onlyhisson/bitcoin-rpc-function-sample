// 블록 정보 저장
async function saveBlockInfo(conn, params) {
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
  const qry = "SELECT * FROM block_info ORDER BY id DESC LIMIT 1;";
  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry);
    resolve(rows);
  });
}

module.exports = {
  saveBlockInfo,
  getDbLastBlockInfo,
};
