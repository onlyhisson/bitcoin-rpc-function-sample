/*
    https://github.com/you21979/node-multisig-wallet/blob/master/lib/txdecoder.js

{
  txid: "b7bfc528013b2080d8c676655f1532422027cddd4278f0b19f188137b2ec60c4",
  hash: "2a888f3afc7f4d17342e28fbeaccce95aedc4f052eac5ecf5158673ec375cd23",
  version: 2,
  size: 759,
  vsize: 678,
  weight: 2709,
  locktime: 0,
  vin: [
    {
      txid: "2603f403f1393b3a4da6617b44fb0a4dbf9997c210448b66c826a372beb460b8",
      vout: 1,
      scriptSig: {
        asm: "00140bc2fe4a34226f3d83bef0a8d2cccb11da0e62d3",
        hex: "1600140bc2fe4a34226f3d83bef0a8d2cccb11da0e62d3",
      },
      txinwitness: [
        "3044022012201008b8081b82607d3e59dd27c517e2a1e025f615207bb1834afbf8e4661002203cfce54f93b404eebbc5d4ba8836930fb8793d0dbcfc1586d8f7088fa6b45d5201",
        "02c0f194f53cc52834a41441760adab204f9c401cb62f27a150e268d74733d3bba",
      ],
      sequence: 4294967295,
    },
  ],
  vout: [
    {
      value: 2.71176471,
      n: 0,
      scriptPubKey: {
        asm: "OP_HASH160 f376e2e151386c9428a9b93186158c384ad9bdb1 OP_EQUAL",
        hex: "a914f376e2e151386c9428a9b93186158c384ad9bdb187",
        address: "3PtLYX7hVHSW3riUR7RQ6QdD84WWRNLy7m",
        type: "scripthash",
      },
    }
  ],
};
*/

const bitcoin = require("bitcoinjs-lib");

function getAddress(txid, script) {
  try {
    return bitcoin.address.fromOutputScript(script);
  } catch (err) {
    console.log(`getAddress ERROR txid : ${txid}`);
    return null;
  }
}

function decodeRawTx(rawTx) {
  const decodeRawTxData = bitcoin.Transaction.fromHex(rawTx);
  const txid = decodeRawTxData.getId();
  const hash = decodeRawTxData.getHash();
  const { version, locktime, ins, outs } = decodeRawTxData;
  const isCoinbase = decodeRawTxData.isCoinbase();

  const vin = isCoinbase
    ? [{ coinbase: "coinbase" }]
    : ins.map((el) => {
        const { hash, index } = el;
        return {
          txid: hash.reverse().toString("hex"),
          vout: index,
        };
      });

  const vout = outs.map((el, idx) => {
    const asm = bitcoin.script.toASM(el.script);
    const address =
      asm.split(" ")[0] === "OP_RETURN"
        ? "asm OP_RETURN"
        : getAddress(txid, el.script);

    if (asm.split(" ")[0] === "OP_RETURN") {
      // console.log("txid : ", txid);
      // console.log("asm : ", asm);
      // console.log("asm : ", asm.split(" ")[0]);
    }

    return {
      value: (1e-8 * el.value).toFixed(8),
      n: idx,
      scriptPubKey: {
        asm: bitcoin.script.toASM(el.script),
        hex: el.script.toString("hex"),
        address,
        // type: bitcoin.script.classifyOutput(el.script),
      },
    };
  });

  const decodedTx = {
    txid,
    hash,
    version,
    locktime,
    vin,
    vout,
  };

  return decodedTx;
}

module.exports = {
  decodeRawTx,
};
