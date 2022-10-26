// 지갑 정보 조회
async function getWalletInfos(conn, params) {
  let qry = "SELECT * FROM btc_wallet_dev.wallet_info";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry);
    resolve(rows);
  });
}

// 지갑 추가
async function saveWallet(conn, params) {
  const { name, desc } = params;
  let qry = "INSERT INTO  btc_wallet_dev.wallet_info ";
  qry += "(`name`, `desc`, `created_at`) VALUES (?, ?, UNIX_TIMESTAMP())";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [name, desc]);
    resolve(rows);
  });
}

// 지갑 주소 추가
async function saveWalletAddress(conn, params) {
  const { walletId, label, address } = params;
  let qry = "INSERT INTO btc_wallet_dev.wallet_address ";
  qry += " (wallet_id, label, address, created_at, updated_at) ";
  qry += " VALUES (?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [walletId, label, address]);
    resolve(rows);
  });
}

// 지갑 주소 목록 조회
async function getWalletList(conn, params) {
  let conditions = [];
  const { walletId } = params;
  let qry = "SELECT ";
  qry += "   wa.address ";
  qry += "   ,wa.label ";
  qry += "   ,wi.name ";
  qry += "   ,wi.desc ";
  qry += " FROM btc_wallet_dev.wallet_address wa ";
  qry += " INNER JOIN btc_wallet_dev.wallet_info wi ";
  qry += " ON wa.wallet_id = wi.id ";
  if (walletId) {
    qry += " WHERE wi.id = ?";
    conditions.push(walletId);
  }

  return new Promise(async (resolve, reject) => {
    console.log("conditions : ", conditions);
    const [rows] = await conn.execute(qry, conditions);
    resolve(rows);
  });
}

module.exports = {
  getWalletInfos,
  getWalletList,
  saveWallet,
  saveWalletAddress,
};
