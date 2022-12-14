const CronJob = require("cron").CronJob;

const { getConnection } = require("../dao");
const {
  completedTxDetailInfo,
  completedTxDetailInfos,
  findNotUpdatedTxid,
  updatedOurTx,
} = require("../dao/block_tx.dao");
const { insTxInputInfos } = require("../dao/tx_input.dao");
const { insTxOutputInfos } = require("../dao/tx_output.dao");

const { decodeBitcoinRawTx, debugLog } = require("../util");
const { getCacheInstance, ADDRESS_LIST } = require("../util/cache");
const { transaction } = require("../util/rpc");
const { getRawTransaction } = transaction;

const { resetAddressList } = require("./common");

const cronCache = getCacheInstance();
const TZ = process.env.TIMEZONE;

const UPDATE_TX_ONCE = 55; // 한번 요청에 처리할 tx 개수
let updatedLastTxId = 0; // 마지막 업데이트 txid id 저장, 조회시 용이

// 10분 간격으로 수백 ~ 3천중반 이상의 트랜잭션 발생
// 최소 초당 5건 처리하면 속도를 맞출 수 있음(시간 단위 당 UPDATE_TX_ONCE)
// 스케쥴러 초단위 1000ms > txDetail 실행 시간 800ms 정도, 시간 로그 남김
// 스케쥴러 시간 단위를 넘어가는 처리가 있을 시 job stop start 함 (B)
// 처리 속도에 따라 UPDATE_TX_ONCE 값을 줄이거나 늘리면 됨
const txInOutJob = new CronJob(" * * * * * *", txDetail, null, true, TZ); // 1초 간격

/**
 * 1 각 블록의 모든 트랜잭션을 조회 후
 * 해당 트랜잭션이 관리하는 지갑 주소와 관련이 있는지 확인
 *
 * 2 해당 트랜잭션의 inputs outputs 정보 저장
 */
async function txDetail() {
  let conn = null;
  let ourTxidId = [];
  let inAllParams = [];
  let outAllParams = [];

  try {
    // 일단 스톱, 아래 실행 코드에서 크론 주기 이상의 딜레이가 발생할 수 있음 (B)
    txInOutJob.stop();

    // 관리하는 지갑 목록 조회
    const walletList = cronCache.get(ADDRESS_LIST);

    if (walletList === undefined) {
      await resetAddressList();
      debugLog("TX ERROR", "Please update Wallet List", 20);
      return;
    }

    // 관리 지갑 없는 경우
    if (walletList.length < 1) {
      debugLog("TX WARNING", "Wallet List Count 0", 20);
    }

    conn = await getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    const startMil = new Date().getTime();

    // 해당 트랜잭션이 관리하는 주소와 관련 된 것인지
    // 확인 처리 하지 않은 txid(업데이트 컬럼 === NULL) 조회
    const uTxids = await findNotUpdatedTxid(conn, {
      lastIdx: updatedLastTxId,
      limit: UPDATE_TX_ONCE,
    }); // (A)

    // 업데이트할 트랜잭션 없음
    if (uTxids.length < 1) {
      return;
    }

    const mill1 = new Date().getTime();

    console.log("");
    debugLog("TX Start", `Input & Output`, 20);
    debugLog("TX", `Wallet Address Count [ ${walletList.length} ]`, 20);

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

    const mill2 = new Date().getTime();

    txDetails.map(async (el) => {
      let chk = false;
      const { id, txid, vins, vouts } = el;
      //console.log("txid : ", txid);
      //console.log("vins : ", vins);
      const outAddrs = vouts.map((el) => el.address);
      outAddrs.forEach((el) => {
        if (walletList.includes(el)) {
          chk = true;
        }
      });

      // 관리하는 주소만 데이터 저장
      if (chk) {
        ourTxidId.push(id);
        debugLog("TX 관리 대상 TXID", `[ ${txid} ]`, 20);

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
      }
    });

    if (inAllParams.length > 0) {
      await insTxInputInfos(conn, inAllParams);
    }
    if (outAllParams.length > 0) {
      await insTxOutputInfos(conn, outAllParams);
    }

    const mill3 = new Date().getTime();

    // 완료
    const now = new Date().getTime();
    const createdAt = Math.round(now / 1000);

    // 업데이트 날짜 데이터를 입력함으로 해당 트랜잭션 확인 했음을 알림
    // 한번에 여러 row를 업데이터 처리 쿼리를 위해 두번으로 나눔 (C) (D)
    const txIdIds = txDetails.map((el) => el.id);
    await completedTxDetailInfos(conn, { time: createdAt, ids: txIdIds }); //(C)

    // 관리하는 주소와 관련 있는 트랜잭션 체크
    if (ourTxidId.length > 0) {
      await updatedOurTx(conn, { ids: ourTxidId }); // (D)
    }

    await conn.commit(); // 트랜잭션 커밋

    const mill4 = new Date().getTime();

    const txidRange = `${uTxids[0].id} ~ ${uTxids[uTxids.length - 1].id}`;
    debugLog("TX Update List", txidRange, 20);
    debugLog("TX END", `Input & Output`, 20);

    // 업데이트된 마지막 txid 인덱스 번호저장, 조회 쿼리 빠르게 (A)
    updatedLastTxId = uTxids[uTxids.length - 1].id;

    console.log();
    const time1 = `${(mill1 - startMil).toString().padStart(4, " ")} ms`;
    const time2 = `${(mill2 - mill1).toString().padStart(4, " ")} ms`;
    const time3 = `${(mill3 - mill2).toString().padStart(4, " ")} ms`;
    const time4 = `${(mill4 - mill3).toString().padStart(4, " ")} ms`;

    // 업데이트 안된 tx 조회 걸린 시간
    debugLog("TX query txid updated_at NULL", time1, 30);
    // bitcoin-cli 에 tx 정보 조회 요청 시간
    debugLog("TX bitcoin-cli raw tx", time2, 30);
    // 해당 트랜잭션 input output 데이터 저장 시간
    debugLog("TX save input & output", time3, 30);
    // 해당 트랜잭션 확인 처리 시간
    debugLog("TX TXID updated check", time4, 30);
  } catch (err) {
    console.log(err);
    debugLog("TX ERROR txDetail", err, 20);
    await conn.rollback(); // 트랜잭션 롤백
  } finally {
    if (conn) {
      await conn.release();
    }
    txInOutJob.start(); // (B)
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

    return { vins, vouts };
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

module.exports = {
  txInOutJob,
};
