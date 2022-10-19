// 블록의 트랜잭션 정보 저장 완료
async function completedTxDetailInfo(conn, params) {
  const { id, time } = params;
  const qry = " UPDATE block_tx SET updated_at = ? WHERE (`id` = ?)";
  return new Promise(async (resolve, reject) => {
    try {
      const [rows] = await conn.execute(qry, [time, id]);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

// 블록의 트랜잭션 정보 저장 완료 - 한번에 처리
async function completedTxDetailInfos(conn, params) {
  const { time, ids } = params;
  const idJoin = ids.join(",");
  const qry = ` UPDATE block_tx SET updated_at = ? WHERE id IN(${idJoin})`;

  return new Promise(async (resolve, reject) => {
    try {
      const [rows] = await conn.execute(qry, [time]);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

// 특정 블록에 해당 하는 txid 저장
async function saveTxidInfo(conn, params) {
  const { txid, blockNum, createdAt } = params;
  const qry =
    "INSERT INTO block_tx (txid, block_no, created_at) VALUES (?, ?, ?)";
  return new Promise(async (resolve, reject) => {
    try {
      await conn.execute(qry, [txid, blockNum, createdAt]);
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}

// 특정 블록에 해당 하는 txid 저장 - bulk insert
async function saveTxidInfos(conn, params) {
  let paramArr = [];
  params.forEach((el) => {
    const { txid, blockNum, createdAt } = el;
    paramArr = [...paramArr, txid, blockNum, createdAt];
  });

  let qry = "INSERT INTO block_tx (txid, block_no, created_at)";
  for (let i = 0; i < params.length; i++) {
    qry += i === 0 ? " VALUES (?, ?, ?) " : ", (?, ?, ?) ";
  }

  return new Promise(async (resolve, reject) => {
    try {
      await conn.execute(qry, paramArr);
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}

// input output 데이터 확인되지 않은 트랜잭션 row 조회
async function getNotUpdatedTxid(conn, params) {
  const { lastIdx, limit } = params;
  let qry = "SELECT * FROM block_tx";
  qry += ` WHERE id > ? `;
  qry += ` AND updated_at IS NULL `;
  qry += ` ORDER BY id ASC LIMIT ? `;

  return new Promise(async (resolve, reject) => {
    try {
      const [rows] = await conn.execute(qry, [lastIdx, limit]);
      resolve(rows);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
}

// 트랜잭션 정보 조회 - txid 조건
async function findTxidIdByTxid(conn, params) {
  const { txid } = params;

  const qry = "SELECT * FROM block_tx WHERE txid = ? ";
  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [txid]);
    resolve(rows);
  });
}

module.exports = {
  completedTxDetailInfo,
  completedTxDetailInfos,
  saveTxidInfo,
  saveTxidInfos,
  getNotUpdatedTxid,
  findTxidIdByTxid,
};
