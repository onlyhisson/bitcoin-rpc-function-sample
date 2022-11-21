// 출금 요청 정보 저장
async function insWithdrawalCoinReq(conn, params) {
  const { addrId, toAddrCnt, amount, fee, updatedAt } = params;
  let qry = " INSERT INTO `btc_wallet_dev`.`coin_withdrawal_req` ";
  qry += " (`addr_id`, to_addr_cnt, `amount`, `fee`, `created_at`) ";
  qry += " VALUES (?, ?, ?, ?, ?) ";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [
      addrId,
      toAddrCnt,
      amount,
      fee,
      updatedAt,
    ]);
    resolve(rows);
  });
}

// 출금 요청 정보 조회
async function findWithdrawalCoinReq(conn, params) {
  let conditions = [];
  let qry = " SELECT cwr.*, wa.wallet_id, wa.address ";
  qry += " FROM btc_wallet_dev.coin_withdrawal_req cwr ";
  qry += "  INNER JOIN btc_wallet_dev.wallet_address wa ";
  qry += "  ON cwr.addr_id = wa.id ";
  qry += " WHERE 1=1 ";
  if (params.addrId) {
    qry += " AND cwr.addr_id = ? ";
    conditions.push(params.addrId);
  }
  if (params.status) {
    qry += " AND cwr.status = ? ";
    conditions.push(params.status);
  }
  if (params.id) {
    qry += " AND cwr.id = ? ";
    conditions.push(params.id);
  }

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, conditions);
    resolve(rows);
  });
}

// 요청 출금 처리
// 출금 tx 를 mempool 에 업데이트 함, tx가 unconfirmed 상태
// txid, status=2, updated_at, start_block_no
// 출금 tx 가 confirmed 됨, 블록체인에 기록됨
// status=3, updated_at
async function updateWithdrawalCoinReqById(conn, params) {
  let condition = [params.updatedAt];
  let qry = " UPDATE btc_wallet_dev.coin_withdrawal_req ";
  qry += " SET updated_at = ? ";
  if (params.status) {
    qry += "  , status = ? ";
    condition.push(params.status);
  }
  if (params.txid) {
    qry += "  , txid = ? ";
    condition.push(params.txid);
  }
  // 출금 처리 승인 시의 마지막 블록넘버
  if (params.lastBlockNum) {
    qry += "  , start_block_no = ? ";
    condition.push(params.lastBlockNum);
  }
  // 해당 트랜잭션이 포함된 블록 넘버
  if (params.txBlockNum) {
    qry += "  , end_block_no = ? ";
    condition.push(params.txBlockNum);
  }

  if (params.reqId) {
    qry += " WHERE id = ? ";
    condition.push(params.reqId);
  }

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, condition);
    resolve(rows);
  });
}

async function updateWithdrawalCoinReqByTxid(conn, params) {
  const { updatedAt, status, txid } = params;
  let qry = " UPDATE btc_wallet_dev.coin_withdrawal_req ";
  qry += " SET updated_at = ?, status = ?  ";
  qry += " WHERE txid = ? ";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [updatedAt, status, txid]);
    resolve(rows);
  });
}

async function updateWithdrawalCoinReqByTxids(conn, params) {
  const { updatedAt, txids, status } = params;
  let qry = " UPDATE btc_wallet_dev.coin_withdrawal_req ";
  qry += " SET updated_at = ?, status = ?  ";
  qry += ` WHERE txid IN = ${txids.join(",")} `;

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [updatedAt, status]);
    resolve(rows);
  });
}

async function insWithdrawalCoinToAddrs(conn, params) {
  const { reqId, toAddrObjs } = params;
  let condtions = [];
  toAddrObjs.forEach((el, idx) => {
    const { address, amount } = el;
    condtions = [...condtions, reqId, idx, address, amount];
  });

  let qry =
    "INSERT INTO coin_withdrawal_to_addr (req_id, vout_no, address, amount)";
  for (let i = 0; i < toAddrObjs.length; i++) {
    qry += i === 0 ? " VALUES (?, ?, ?, ?) " : ", (?, ?, ?, ?) ";
  }

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, condtions);
    resolve(rows);
  });
}

module.exports = {
  insWithdrawalCoinReq,
  findWithdrawalCoinReq,
  updateWithdrawalCoinReqById,
  updateWithdrawalCoinReqByTxid,
  updateWithdrawalCoinReqByTxids,
  insWithdrawalCoinToAddrs,
};
