const Big = require("big.js");
const { spawn } = require("node:child_process");
const { decodeRawTx } = require("./bitcoin");

function executeCommand(cmd, args, options) {
  let bufferArray = [];
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, options);

    child.stdout.on("data", (data) => {
      //resolve(data.toString().replace(/\r\n/g, ""));
      bufferArray.push(data);
    });

    child.stderr.on("data", (data) => {
      reject(data.toString());
    });

    child.on("close", (code) => {
      //console.log(`child process exited with code ${code}`);
      dataBuffer = Buffer.concat(bufferArray);
      resolve(dataBuffer.toString().replace(/\r\n/g, ""));
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isNull(value) {
  if (
    typeof value === "undefined" ||
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return true;
  }

  if (typeof value === "string" && value.trim() === "") {
    return true;
  }

  return false;
}

function getFormatDate(mill) {
  const date = mill ? new Date(mill) : new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  const hour = date.getHours().toString().padStart(2, "0");
  const min = date.getMinutes().toString().padStart(2, "0");
  const sec = date.getSeconds().toString().padStart(2, "0");

  return `${year}-${month}-${dd} ${hour}:${min}:${sec}`;
}

function getFormatUnixTime(mill) {
  const date = mill ? new Date(mill) : new Date();
  return Math.floor(date.getTime() / 1000);
}

function debugLog(label, content, pad = 20) {
  const newLabel = label.padEnd(pad, " ");
  const fTime = getFormatDate();
  const newContent = content ? `: ${content}` : "";
  const log = `[ ${fTime} ] - ${newLabel}${newContent}`;
  if (label.toLowerCase().indexOf("error") > 0) {
    console.error(log);
  } else {
    console.log(log);
  }
}

function validateCoinAmount({ amount: value, address }, option) {
  try {
    const expandOption = {
      decimalCnt: 8,
      minAmt: "0.00001000",
      ...option,
    };

    const { decimalCnt, minAmt } = expandOption;

    // ????????? ??????, ????????? ????????? amount ?????? ??????
    const amount = new Big(value).toFixed(decimalCnt);
    const diff = new Big(value).minus(amount).toString();
    if (diff !== "0") {
      throw { message: "????????? ????????? ?????????" };
    }

    const minChk = new Big(value).gte(minAmt);
    if (!minChk) {
      throw { message: `?????? ???????????? ${minAmt} BTC ?????????.(${address})` };
    }

    return amount;
  } catch (err) {
    throw err;
  }
}

function validateFeeAmount(value, option) {
  try {
    const expandOption = {
      decimalCnt: 8,
      minAmt: "0.00001000",
      ...option,
    };

    const { decimalCnt, minAmt } = expandOption;

    // ????????? ??????, ????????? ????????? amount ?????? ??????
    const amount = new Big(value).toFixed(decimalCnt);
    const diff = new Big(value).minus(amount).toString();
    if (diff !== "0") {
      throw { message: "????????? ????????? ?????????" };
    }

    const minChk = new Big(value).gte(minAmt);
    if (!minChk) {
      throw { message: `?????? ???????????? ${minAmt} BTC ?????????.` };
    }

    return amount;
  } catch (err) {
    throw err;
  }
}

// ?????? ??????
function successRespFormat(res, data) {
  res.json({ success: true, data: { ...data } });
}

function btcToSatoshi(amount) {
  return new Big(amount).times(100000000).valueOf();
}

function satoshiToBtc(amount) {
  return new Big(amount).div(100000000).toFixed(8);
}

module.exports = {
  executeCommand,
  wait,
  isNull,
  getFormatDate,
  getFormatUnixTime,
  decodeBitcoinRawTx: decodeRawTx,
  debugLog,
  validateCoinAmount,
  validateFeeAmount,
  successRespFormat,
  btcToSatoshi,
  satoshiToBtc,
};
