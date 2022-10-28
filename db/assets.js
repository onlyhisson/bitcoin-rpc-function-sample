// 출금 요청 정보 저장
async function saveWithdrawalCoinReq(conn, params) {
  const { addrId, toAddress, amount, fee } = params;
  let qry = " INSERT INTO `btc_wallet_dev`.`coin_withdrawal_req` ";
  qry += " (`addr_id`, `to_addr`, `amount`, `fee`, `created_at`) ";
  qry += " VALUES (?, ?, ?, ?, UNIX_TIMESTAMP()) ";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [addrId, toAddress, amount, fee]);
    resolve(rows);
  });
}

// 출금 요청 정보 조회
async function findWithdrawalCoinReq(conn, params) {
  const { addrId, status } = params;
  let qry = " SELECT * FROM btc_wallet_dev.coin_withdrawal_req ";
  qry += " WHERE addr_id = ? AND status = ? ";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [addrId, status]);
    resolve(rows);
  });
}

module.exports = {
  saveWithdrawalCoinReq,
  findWithdrawalCoinReq,
};
