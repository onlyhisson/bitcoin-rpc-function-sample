require("dotenv").config();
const CronJob = require("cron").CronJob;

const { getFormatDate, decodeBitcoinRawTx, debugLog } = require("./util");

const { getConnection } = require("./db");
const { saveBlockInfo, getDbLastBlockInfo } = require("./db/block");
const {
  completedTxDetailInfo,
  saveTxidInfo,
  getNotUpdatedTxid,
} = require("./db/block_tx");
const { saveTxInputInfo } = require("./db/tx_input");
const { saveTxOutputInfo } = require("./db/tx_output");

const { block, transaction, wallet } = require("./util/rpc");
const { getBlockChainInfo, getBlockCount, getBlockHash, getBlock } = block;
const { getRawTransaction, getDecodeRawTransaction } = transaction;

// 코인베이스 트랜잭션 확인
function checkCoinbase(vin) {
  /*
  // 코인베이스 트랜잭션인 경우(각 블록의 첫번째 트랜잭션) vin 은 아래와 같음
  vin: [
    {
      coinbase:
      "032e930bfabe6d6d89e25de37ada5a77d45acecbceecdd525885cd5ea6194e393ac0350285340dbe0100000000000000306506088e3de100000000000000005d0176c7182f736c7573682f",
      txinwitness: [
        "0000000000000000000000000000000000000000000000000000000000000000",
      ],
      sequence: 0,
    }
  }
  */
  return vin[0].coinbase ? true : false;
}

async function getTxidDetail(txid) {
  try {
    const rawTxidData = await getRawTransaction(txid); // 트랙잭션 raw 데이터 조회
    const decodeRawTxidData = decodeBitcoinRawTx(rawTxidData); // 디코딩
    //const decodeRawTxidData = await getDecodeRawTransaction(rawTxidData); // 디코딩
    const { vin, vout } = decodeRawTxidData; // 코인베이스 처리 필요, 2ac933f18ff3499dfa87185c69663bb5e9e49d3237f36020146f8cd9cbea2d33
    const isCoinbase = checkCoinbase(vin);

    if (vin.length < 1) {
      debugLog("TX decodeRawTxidData", decodeRawTxidData, 20);
    }

    // coinbase 의 경우 데이터 객체 포맷이 다름
    const vins =
      vin.length < 1 || isCoinbase
        ? []
        : vin.map((inOne) => ({
            txid: inOne.txid,
            vout: inOne.vout,
          }));
    const vouts = vout.map((outOne) => ({
      no: outOne.n,
      amount: outOne.value,
      address: outOne.scriptPubKey.address,
    }));

    return { vins, vouts, isCoinbase };
  } catch (err) {
    debugLog("TX ERROR getTxidDetail", err, 20);
    debugLog("TX ERROR txid", txid, 20);
    debugLog("TX ERROR rawTxidData", rawTxidData.length, 20);
    throw err;
  }
}

// cron func
async function blockTxid() {
  let conn = null;
  let updateBlockNum = 758450;

  const now = new Date().getTime();
  const createdAt = Math.round(now / 1000);

  console.log("");
  debugLog("Block TX Start", "", 20);

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

    debugLog("Block TX", `main net last block number (no.${lastBlock})`, 20);

    if (updateBlockNum > lastBlock) {
      debugLog("Block TX End", "last block info already updated", 20);
      return;
    }

    debugLog("Block TX", `update block number (no.${updateBlockNum})`, 20);

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
    debugLog("Block TX End", `last block info update succeed`, 20);
  } catch (err) {
    debugLog("Block TX ERROR blockTxid", err, 20);
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
  let inAllParams = [];
  let outAllParams = [];

  try {
    conn = await getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    // 처리하지 않은 txid(업데이트 컬럼 === NULL) 중에서 첫번째
    const uTxids = await getNotUpdatedTxid(conn, 20);
    if (uTxids.length < 1) {
      //console.log("[트랜잭션] : 업데이트할 트랜잭션 없음");
      return;
    }

    console.log("");
    debugLog("TX Start", `Input & Output`, 20);
    debugLog(
      "TX Update List",
      `${uTxids[0].id} ~ ${uTxids[uTxids.length - 1].id}`,
      20
    );

    const txidObjs = uTxids.map((el) => ({ id: el.id, txid: el.txid }));
    const pTxid = txidObjs.map(async (el) => {
      // txid 의 수신 정보 조회
      const detailTx = await getTxidDetail(el.txid);
      const { vins, vouts, isCoinbase } = detailTx;
      return {
        ...el,
        vins,
        vouts,
        isCoinbase,
      };
    });

    const txDetails = await Promise.all(pTxid);

    txDetails.map(async (el) => {
      const { id, txid, vins, vouts, isCoinbase } = el;
      //console.log("txid : ", txid);
      //console.log("vins : ", vins);
      //console.log("vouts : ", vouts);
      const inParams = vins.map((el) => {
        return {
          txId: id,
          prevTxid: el.txid,
          voutNo: el.vout,
        };
      });
      const outParams = vouts.map((el) => {
        return {
          txId: id,
          amount: el.amount,
          address: el.address || null,
          voutNo: el.no,
        };
      });

      inAllParams = [...inAllParams, ...inParams];
      outAllParams = [...outAllParams, ...outParams];
    });

    const pVins = inAllParams.map((el) => {
      return saveTxInputInfo(conn, el);
    });

    const pVouts = outAllParams.map((el) => {
      return saveTxOutputInfo(conn, el);
    });

    await Promise.all(pVins);
    await Promise.all(pVouts);

    // 완료
    const now = new Date().getTime();
    const createdAt = Math.round(now / 1000);

    // todo : 회원 지갑 리스트 캐싱 최신화 확인

    const pChkTxDetail = txDetails.map((el) =>
      // todo : txid 조회 - 회원 지갑과 관련 있는 경우 상세 내역 저장
      completedTxDetailInfo(conn, { time: createdAt, id: el.id })
    );
    await Promise.all(pChkTxDetail);

    await conn.commit(); // 트랜잭션 커밋

    debugLog("TX END", `Input & Output`, 20);
  } catch (err) {
    debugLog("TX ERROR txDetail", err, 20);
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

// 트랜잭션 정보 저장
const txJob = new CronJob(" * * * * * *", txDetail, null, true, "Asia/Seoul");

blockTxidJob.start();
txJob.start();
