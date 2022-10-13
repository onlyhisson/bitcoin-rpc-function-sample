require("dotenv").config();

const CronJob = require("cron").CronJob;

const { getConnection } = require("./db");
const { getFormatDate } = require("./util");
const { block, transaction, wallet } = require("./util/rpc");
const { getBlockChainInfo, getBlockCount, getBlockHash, getBlock } = block;
const { getRawTransaction, getDecodeRawTransaction } = transaction;

/*
  from : [{a: 1}, {a: 2}, {b: 1}]
  to : {a: [1, 2], b: [1]}
*/
function txidArrToObj(vins) {
  const dupVinsTxs = vins.map((el) => el.txid);
  const setVinsTxs = new Set(dupVinsTxs);
  const vinsTx = [...setVinsTxs];
  const vinsTxObjs = {};
  vinsTx.map((tx) => {
    const outObjs = vins.filter((el) => el.txid === tx);
    const outIds = outObjs.map((el) => el.vout);
    vinsTxObjs[tx] = outIds;
  });
  return vinsTxObjs;
}

// 해당 트랜잭션의 input 정보 저장
async function saveTxInputInfo(conn, params) {
  const { txId, prevTxid, voutNo } = params;
  const qry =
    "INSERT INTO tx_input (tx_id, prev_txid, vout_no) VALUES ( ?, ?, ? );";
  return new Promise(async (resolve, reject) => {
    try {
      await conn.execute(qry, [txId, prevTxid, voutNo]);
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}

// 해당 트랜잭션의 output 정보 저장
async function saveTxOutputInfo(conn, params) {
  const { txId, amount, address, voutNo } = params;
  const qry =
    "INSERT INTO tx_output (tx_id, amount, address, vout_no) VALUES ( ?, ?, ?, ?);";
  return new Promise(async (resolve, reject) => {
    try {
      await conn.execute(qry, [txId, amount, address, voutNo]);
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}

async function getTxidDetail(txid) {
  try {
    const rawTxidData = await getRawTransaction(txid); // 트랙잭션 raw 데이터 조회
    const decodeRawTxidData = await getDecodeRawTransaction(rawTxidData); // 디코딩
    const { vin, vout } = decodeRawTxidData;

    const vins = vin.map((inOne) => ({
      txid: inOne.txid,
      vout: inOne.vout,
    }));
    const vouts = vout.map((outOne) => ({
      no: outOne.n,
      amount: outOne.value,
      address: outOne.scriptPubKey.address,
    }));

    return { vins, vouts };
  } catch (err) {
    console.log("ERROR getTxidDetail : ", err);
  }
}

// 디비에 저장된 마지막 블록 정보 조회
async function getDbLastBlockInfo(conn) {
  const qry =
    "SELECT * FROM btc_wallet_dev.block_info ORDER BY id DESC LIMIT 1;";
  return new Promise(async (resolve, reject) => {
    const [rows] = await conn.execute(qry);
    resolve(rows);
  });
}

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

// 특정 블록에 해당 하는 txid 저장
async function getNotUpdatedTxid(conn, cnt) {
  let qry = "SELECT * FROM btc_wallet_dev.block_tx";
  qry += ` WHERE updated_at IS NULL ORDER BY id ASC LIMIT ${cnt}`;

  return new Promise(async (resolve, reject) => {
    try {
      const [rows] = await conn.execute(qry, []);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

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

// cron func
async function blockTxid() {
  let conn = null;
  let updateBlockNum = 758160;

  const now = new Date().getTime();
  const createdAt = Math.round(now / 1000);

  const fDate = getFormatDate(now);

  console.log("\n[현재시간] : ", fDate);

  try {
    conn = await getConnection();
    const rows = await getDbLastBlockInfo(conn);
    if (rows.length > 0) {
      const { block_no: dbLastBlockNum } = rows[0];
      if (updateBlockNum <= dbLastBlockNum) {
        updateBlockNum = dbLastBlockNum + 1;
      }
    }

    const lastBlock = Number(await getBlockCount());

    console.log("[메인넷 마지막 블록 넘버] : ", lastBlock);
    console.log("[업데이트할 블록 넘버] : ", updateBlockNum);

    if (updateBlockNum > lastBlock) {
      console.log("[상태] : 마지막 블록 까지 업데이트 됨");
      return;
    }

    const blockHash = await getBlockHash(updateBlockNum); // 특정 블록 해시값
    const blockInfo = await getBlock(blockHash); // 특정 블록 정보
    const { height: blockNum, time, nTx, tx } = blockInfo;

    await conn.beginTransaction(); // 트랜잭션 시작

    // 블록 정보 저장
    await saveBlockInfo(conn, { blockNum, nTx, time, createdAt });

    // 각 블록의 txid 저장
    const pSaveTx = tx.map((el) =>
      saveTxidInfo(conn, { txid: el, blockNum, createdAt })
    );

    await Promise.all(pSaveTx);

    await conn.commit(); // 트랜잭션 커밋
    console.log(`[상태] : 블록 업데이트 (${updateBlockNum})`);
  } catch (err) {
    console.log("ERROR : ", err);
    await conn.rollback(); // 트랜잭션 롤백
  } finally {
    if (conn) {
      await conn.release();
    }
  }
}

// cron func
async function txDetail() {
  let conn = null;
  try {
    conn = await getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    // 처리하지 않은 txid(업데이트 컬럼 === NULL) 중에서 첫번째
    const uTxids = await getNotUpdatedTxid(conn, 10);
    if (uTxids.length < 1) {
      console.log("[트랜잭션] : 업데이트할 트랜잭션 없음");
      return;
    }
    const txidObjs = uTxids.map((el) => ({ id: el.id, txid: el.txid }));
    const pTxid = txidObjs.map(async (el) => {
      // txid 의 수신 정보 조회
      const detailTx = await getTxidDetail(el.txid);
      const { vins, vouts } = detailTx;
      return {
        ...el,
        vins,
        vouts,
      };
    });

    const txDetails = await Promise.all(pTxid);

    txDetails.map(async (el) => {
      const { id, txid, vins, vouts } = el;
      //console.log("vins : ", vins);
      //console.log("vouts : ", vouts);
      /*
      const pVins = vins.map((el) => {
        const params = {
          txId: id,
          prevTxid: el.txid,
          voutNo: el.vout,
        };
        return saveTxInputInfo(conn, params);
      });
      */
      const pVouts = vouts.map((el) => {
        const params = {
          txId: id,
          amount: el.amount,
          address: el.address || null,
          voutNo: el.no,
        };
        return saveTxOutputInfo(conn, params);
      });

      //await Promise.all(pVins);
      //await Promise.all(pVouts);
    });

    // 완료
    const now = new Date().getTime();
    const createdAt = Math.round(now / 1000);

    // todo : 회원 지갑 리스트 캐싱 최신화 확인

    /*
    const pChkTxDetail = txDetails.map((el) =>
      // todo : txid 조회 - 회원 지갑과 관련 있는 경우 상세 내역 저장
      completedTxDetailInfo(conn, { time: createdAt, id: el.id })
    );
    await Promise.all(pChkTxDetail);
*/
    await conn.commit(); // 트랜잭션 커밋
  } catch (err) {
    console.log("ERROR - txDetail : ", err);
    await conn.rollback(); // 트랜잭션 롤백
  } finally {
    if (conn) {
      await conn.release();
    }
  }
}

// 블록 정보 저장
const blockTxidJob = new CronJob(
  " */10 * * * * *",
  blockTxid,
  null,
  true,
  "Asia/Seoul"
);

// 블록 정보 저장
const txJob = new CronJob(
  " */10 * * * * *",
  txDetail,
  null,
  true,
  "Asia/Seoul"
);

blockTxidJob.start();
txJob.start();
