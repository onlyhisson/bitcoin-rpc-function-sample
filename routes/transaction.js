const express = require("express");
const router = express.Router();
const { isNull } = require("../util");
const { block, transaction, wallet } = require("../util/rpc");
const { getRawTransaction, getDecodeRawTransaction } = transaction;

const { getConnection } = require("../db");
const { findTxidIdByTxid } = require("../db/block_tx");
const { findTxInputByTxidId } = require("../db/tx_input");
const { findTxOutputByTxidId } = require("../db/tx_output");

router.get("/:txid", async function (req, res) {
  try {
    const { txid } = req.params;

    if (isNull(txid)) {
      throw { message: `invalid parameter` };
    }

    const rawTxidData = await getRawTransaction(txid); // 트랙잭션 raw 데이터 조회
    const decodeRawTxidData = await getDecodeRawTransaction(rawTxidData); // 디코딩

    res.json({
      success: true,
      data: decodeRawTxidData,
    });
  } catch (err) {
    console.error("[ERROR] : ", err);

    res.json({
      success: false,
      message: err.message ? err.message : "error",
    });
  }
});

// 해당 txid 의 input, output 정보
router.get("/inout/:txid", async function (req, res) {
  let conn = null;
  let nTxInputs = [];
  let nTxOutputs = [];

  try {
    const { txid } = req.params;

    if (isNull(txid)) {
      throw { message: `invalid parameter` };
    }

    conn = await getConnection();
    const bts = await findTxidIdByTxid(conn, { txid });

    if (bts.length < 1) {
      throw { message: `transaction info not exist` };
    }
    const { id: txidId } = bts[0];

    console.log("txidId : ", txidId);

    const txInputs = await findTxInputByTxidId(conn, { txidId });
    const txOutputs = await findTxOutputByTxidId(conn, { txidId });

    if (txInputs.length > 0) {
      nTxInputs = txInputs.map((el) => ({
        txid: el.prev_txid,
        voutIdx: el.vout_no,
      }));
      console.log("nTxInputs1 : ", nTxInputs);
      console.log("nTxInputs2 : ", txidArrToObj(nTxInputs));
    }

    if (txOutputs.length > 0) {
      nTxOutputs = txOutputs.map((el) => ({
        no: el.vout_no,
        address: el.address,
        amount: el.amount,
      }));
      console.log("nTxOutputs : ", nTxOutputs);
    }

    res.json({
      success: true,
      data: {
        txid,
        input: nTxInputs,
        output: nTxOutputs,
      },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);

    res.json({
      success: false,
      message: err.message ? err.message : "error",
    });
  } finally {
    if (conn) conn.release();
  }
});

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
    const outIds = outObjs.map((el) => el.voutIdx);
    vinsTxObjs[tx] = outIds;
  });
  return vinsTxObjs;
}

module.exports = router;
