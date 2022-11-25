// 출금 요청 정보 저장
async function insWithdrawalCoinReq(conn, params) {
  let qry = " INSERT INTO `coin_withdrawal_req` ( ";
  qry += "   `addr_id`, `fee`, `status`, `created_at`, `txid` ";
  qry += "   ,`size`, `vsize`,`input_cnt`, `output_cnt`";
  qry += "   ,`input_total_amount`, `output_total_amount`, `start_block_no` ";
  qry += " ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [
      params.addrId,
      params.fee,
      params.status,
      params.createdAt,
      params.txid,
      params.size,
      params.vsize,
      params.inputCnt,
      params.outputCnt,
      params.inputTotalAmt,
      params.ouputTotalAmt,
      params.startBlockNo,
    ]);
    resolve(rows);
  });
}

// 출금 요청 정보 조회
async function findWithdrawalCoinReq(conn, params) {
  let conditions = [];
  let qry = " SELECT cwr.*, wa.wallet_id, wa.address ";
  qry += " FROM coin_withdrawal_req cwr ";
  qry += "  INNER JOIN wallet_address wa ";
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
  let qry = " UPDATE coin_withdrawal_req ";
  qry += " SET updated_at = ? ";
  if (params.status) {
    qry += "  , status = ? ";
    condition.push(params.status);
  }
  if (params.txid) {
    qry += "  , txid = ? ";
    condition.push(params.txid);
  }
  if (params.size) {
    qry += "  , size = ? ";
    condition.push(params.size);
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
  let qry = " UPDATE coin_withdrawal_req ";
  qry += " SET updated_at = ?, status = ?  ";
  qry += " WHERE txid = ? ";

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [updatedAt, status, txid]);
    resolve(rows);
  });
}

async function updateWithdrawalCoinReqByTxids(conn, params) {
  const { updatedAt, txids, status } = params;
  let qry = " UPDATE coin_withdrawal_req ";
  qry += " SET updated_at = ?, status = ?  ";
  qry += ` WHERE txid IN = ${txids.join(",")} `;

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [updatedAt, status]);
    resolve(rows);
  });
}

async function insWithdrawalCoinToAddrs(conn, params) {
  const { reqId, txOutputs } = params;
  let condtions = [];
  txOutputs.forEach((el) => {
    const { address, amount, voutNo } = el;
    condtions = [...condtions, reqId, voutNo, address, amount];
  });

  let qry =
    "INSERT INTO coin_withdrawal_to_addr (req_id, vout_no, address, amount)";
  for (let i = 0; i < txOutputs.length; i++) {
    qry += i === 0 ? " VALUES (?, ?, ?, ?) " : ", (?, ?, ?, ?) ";
  }

  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, condtions);
    resolve(rows);
  });
}

async function findWithdrawalCoinToInfosByReqId(conn, params) {
  const { reqId } = params;
  const qry = "SELECT * FROM coin_withdrawal_to_addr WHERE req_id = ? ";
  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry, [reqId]);
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
  findWithdrawalCoinToInfosByReqId,
};
