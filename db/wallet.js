// 지갑 주소 목록 조회
async function getWalletList(conn, params) {
  let qry = "SELECT ";
  qry += "   wa.address ";
  qry += "   ,wi.name ";
  qry += "   ,wa.label ";
  qry += "   ,wi.desc ";
  qry += " FROM btc_wallet_dev.wallet_address wa ";
  qry += " INNER JOIN btc_wallet_dev.wallet_info wi ";
  qry += " ON wa.wallet_id = wi.id ";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry);
    resolve(rows);
  });
}

module.exports = {
  getWalletList,
};
