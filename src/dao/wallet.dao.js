// 지갑 정보 조회
async function getWalletInfos(conn, params) {
  let conditions = [];
  let qry = "SELECT * FROM wallet_info WHERE type = 0";
  if (params.walletId) {
    qry += " AND id = ?";
    conditions.push(params.walletId);
  }

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, conditions);
    resolve(rows);
  });
}

// 지갑 추가
async function insWallet(conn, params) {
  const { name, desc, createdAt } = params;
  let qry = "INSERT INTO  wallet_info ";
  qry += "(`name`, `desc`, `created_at`) VALUES (?, ?, ?)";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [name, desc, createdAt]);
    resolve(rows);
  });
}

// 지갑 주소 추가
async function insWalletAddress(conn, params) {
  const { walletId, label, address, startBlockNo, createdAt } = params;
  let qry = "INSERT INTO wallet_address ";
  qry += " (wallet_id, label, address, start_block_no, created_at) ";
  qry += " VALUES (?, ?, ?, ?, ?)";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [
      walletId,
      label,
      address,
      startBlockNo,
      createdAt,
    ]);
    resolve(rows);
  });
}

// 지갑 주소 조회
async function findWalletAddress(conn, params) {
  const { addressId: id } = params;
  const qry = "SELECT * FROM wallet_address WHERE id = ?";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [id]);
    resolve(rows);
  });
}

// 지갑 주소 목록 조회
async function getWalletAddressList(conn, params) {
  let conditions = [];
  let qry = "SELECT ";
  qry += "   wi.name AS wallet_name";
  qry += "   ,wi.id AS wallet_id";
  qry += "   ,wa.id AS address_id";
  qry += "   ,wa.address ";
  qry += "   ,wa.label ";
  qry += "   ,wi.name ";
  qry += "   ,wi.desc ";
  qry += " FROM wallet_address wa ";
  qry += " INNER JOIN wallet_info wi ";
  qry += " ON wa.wallet_id = wi.id ";
  qry += " WHERE wi.type = 0 ";
  if (params.walletId) {
    qry += " AND wi.id = ?";
    conditions.push(params.walletId);
  }

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, conditions);
    resolve(rows);
  });
}

// 전체 주소 목록 조회
async function getAddressList(conn) {
  const qry = "SELECT address FROM wallet_address";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, []);
    resolve(rows);
  });
}

module.exports = {
  getWalletInfos,
  getWalletAddressList,
  getAddressList,
  insWallet,
  insWalletAddress,
  findWalletAddress,
};
