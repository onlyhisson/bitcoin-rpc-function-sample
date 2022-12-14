const Big = require("big.js");

const { isNull } = require("../util");
const { transaction } = require("../util/rpc");
const { getRawTransaction, getDecodeRawTransaction } = transaction;

const { getConnection } = require("../dao");
const { findTxidIdByTxid } = require("../dao/block_tx.dao");
const { findTxInputByTxidId } = require("../dao/tx_input.dao");
const { findTxOutputByTxidId } = require("../dao/tx_output.dao");

async function findOneByTxid(txid) {
  try {
    if (isNull(txid)) {
      throw { message: `invalid parameter` };
    }

    const rawTxidData = await getRawTransaction(txid); // 트랙잭션 raw 데이터 조회
    const decodeRawTxidData = await getDecodeRawTransaction(rawTxidData); // 디코딩
    return decodeRawTxidData;
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      message: err.message ? err.message : "error",
    };
  }
}

// todo : rpc 서버 요청으로 변경
async function findTxInoutByTxid(txid) {
  let conn = null;
  let nTxInputs = [];
  let nTxOutputs = [];
  let isCoinbase = false;

  try {
    if (isNull(txid)) {
      throw { message: `invalid parameter` };
    }

    conn = await getConnection();

    const rawTxidData = await getRawTransaction(txid); // 트랙잭션 raw 데이터 조회
    const decodeRawTxidData = await getDecodeRawTransaction(rawTxidData); // 디코딩
    const { vin: txInputs, vout: txOutputs } = decodeRawTxidData;

    if (txInputs.length > 0) {
      const nInputs = txInputs.map((el) => {
        let res = {};
        if (el.coinbase) {
          isCoinbase = true;
          res = { coinbase: el.coinbase };
        } else {
          res = {
            txid: el.txid,
            voutIdx: el.vout,
          };
        }
        return res;
      });

      if (isCoinbase) {
        nTxInputs.push(nInputs[0]);
      } else {
        const inputAddrAmt = await findPrevTxOutputByTxInput(conn, nInputs);

        nTxInputs = inputAddrAmt.map((el) => ({
          no: el.vout_no,
          amount: el.amount,
          address: el.address,
        }));

        nTxInputs = nTxInputs.sort(function (a, b) {
          return a.no - b.no;
        });
      }
    }
    if (txOutputs.length > 0) {
      nTxOutputs = txOutputs.map((el) => {
        const res = {
          no: el.n,
          amount: new Big(el.value).toFixed(8),
        };
        if (el.scriptPubKey.address) {
          res.address = el.scriptPubKey.address;
        } else {
          res.asm = el.scriptPubKey.asm.split(" ")[0];
        }
        return res;
      });
    }

    const inputAmtSum = isCoinbase
      ? "0.00000000"
      : nTxInputs.reduce(reduceSumBigAmount, 0);
    const outputAmtSum = nTxOutputs.reduce(reduceSumBigAmount, 0);
    const fee = isCoinbase
      ? "0.00000000"
      : new Big(inputAmtSum).minus(new Big(outputAmtSum)).toFixed(8);

    return {
      txid,
      fee,
      input: nTxInputs,
      output: nTxOutputs,
    };
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) conn.release();
  }
}

/*
async function findTxInoutByTxid(txid) {
  let conn = null;
  let nTxInputs = [];
  let nTxOutputs = [];

  try {
    if (isNull(txid)) {
      throw { message: `invalid parameter` };
    }

    conn = await getConnection();
    const bts = await findTxidIdByTxid(conn, { txid });

    if (bts.length < 1) {
      throw { message: `transaction info not exist` };
    }
    const { id: txidId } = bts[0];

    const txInputs = await findTxInputByTxidId(conn, { txidId });
    const txOutputs = await findTxOutputByTxidId(conn, { txidId });

    if (txInputs.length > 0) {
      const nInputs = txInputs.map((el) => ({
        txid: el.prev_txid,
        voutIdx: el.vout_no,
      }));

      const inputAddrAmt = await findPrevTxOutputByTxInput(conn, nInputs);

      nTxInputs = inputAddrAmt.map((el) => ({
        no: el.vout_no,
        amount: el.amount,
        address: el.address,
      }));

      nTxInputs = nTxInputs.sort(function (a, b) {
        return a.no - b.no;
      });
    }

    if (txOutputs.length > 0) {
      nTxOutputs = txOutputs.map((el) => ({
        no: el.vout_no,
        address: el.address,
        amount: el.amount,
      }));
      //console.log("nTxOutputs : ", nTxOutputs);
    }

    const inputAmtSum = nTxInputs.reduce(reduceSumBigAmount, 0);
    const outputAmtSum = nTxOutputs.reduce(reduceSumBigAmount, 0);
    const fee = new Big(inputAmtSum).minus(new Big(outputAmtSum)).toFixed(8);

    return {
      txid,
      fee,
      input: nTxInputs,
      output: nTxOutputs,
    };
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) conn.release();
  }
}
*/

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

async function findPrevTxOutputByTxInput(conn, inputs) {
  let newInputs = [];

  try {
    const inputObjs = txidArrToObj(inputs);
    const inputTxids = Object.keys(inputObjs);

    const pInputTxids = inputTxids.map(async (txid) => {
      const txidObjs = await findTxidIdByTxid(conn, { txid });
      let outs = [];

      // 과거 트랜잭션인 경우 DB에 정보 없음
      if (txidObjs.length > 0) {
        const iTxidId = txidObjs[0].id;
        outs = await findTxOutputByTxidId(conn, { txidId: iTxidId });
      } else {
        const rawTxidData = await getRawTransaction(txid);
        const decodeRawTxidData = decodeBitcoinRawTx(rawTxidData);
        const { vout } = decodeRawTxidData;
        outs = vout.map((out) => ({
          amount: out.value,
          address: out.scriptPubKey.address || null,
          vout_no: out.n,
        }));
      }
      const outsFilter = outs.filter((out) =>
        inputObjs[txid].includes(out.vout_no)
      );

      newInputs = [...newInputs, ...outsFilter];
    });

    await Promise.all(pInputTxids);

    return newInputs;
  } catch (err) {
    throw err;
  }
}

// amount 합 리듀스
function reduceSumBigAmount(pInput, cInput) {
  const x =
    typeof pInput === "object" ? new Big(pInput.amount) : new Big(pInput);
  const y = new Big(cInput.amount);
  return x.plus(y).toFixed(8);
}

module.exports = {
  findOneByTxid,
  findTxInoutByTxid,
};
