require("dotenv").config({ path: "../.env" });
const CronJob = require("cron").CronJob;

const { decodeBitcoinRawTx, debugLog } = require("../util");

const { getConnection } = require("../db");
const {
  completedTxDetailInfo,
  completedTxDetailInfos,
  getNotUpdatedTxid,
} = require("../db/block_tx");
const { saveTxInputInfos } = require("../db/tx_input");
const { saveTxOutputInfos } = require("../db/tx_output");

const { transaction } = require("../util/rpc");
const { getRawTransaction } = transaction;

const UPDATE_TX_ONCE = 55; // 한번 요청에 처리할 tx 개수
let updatedLastTxId = 0;

// cron func
async function txDetail() {
  let conn = null;
  let inAllParams = [];
  let outAllParams = [];

  try {
    conn = await getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    const startMil = new Date().getTime();

    // 처리하지 않은 txid(업데이트 컬럼 === NULL) 중에서 첫번째
    const uTxids = await getNotUpdatedTxid(conn, {
      lastIdx: updatedLastTxId,
      limit: UPDATE_TX_ONCE,
    }); // (A)
    if (uTxids.length < 1) {
      //console.log("[트랜잭션] : 업데이트할 트랜잭션 없음");
      return;
    }

    const mill1 = new Date().getTime();

    console.log("");
    debugLog("TX Start", `Input & Output`, 20);

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

    const mill2 = new Date().getTime();

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

    await saveTxInputInfos(conn, inAllParams);
    await saveTxOutputInfos(conn, outAllParams);

    const mill3 = new Date().getTime();

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
    const txIdIds = txDetails.map((el) => el.id);
    await completedTxDetailInfos(conn, { time: createdAt, ids: txIdIds });
    await conn.commit(); // 트랜잭션 커밋

    const mill4 = new Date().getTime();

    console.log("txid 업데이트 안된 것 조회 시간 : ", mill1 - startMil);
    console.log("bitcoin-cli rawtransaction 요청 : ", mill2 - mill1);
    console.log("input output 저장 : ", mill3 - mill2);
    console.log("완료된 txid 확인 처리 : ", mill4 - mill3);

    debugLog(
      "TX Update List",
      `${uTxids[0].id} ~ ${uTxids[uTxids.length - 1].id}`,
      20
    );

    // 업데이트된 마지막 txid 인덱스 번호저장, 조회 쿼리 빠르게 (A)
    updatedLastTxId = uTxids[uTxids.length - 1].id;

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

// 트랜잭션 정보 저장
//const txJob = new CronJob(" * * * * * *", txDetail, null, true, "Asia/Seoul");

//txJob.start();

setInterval(() => {
  txDetail();
}, 1000);
