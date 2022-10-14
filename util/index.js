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

function debugLog(label, content, pad = 20) {
  const newLabel = label.padEnd(pad, " ");
  const fTime = getFormatDate();
  const newContent = content ? `: ${content}` : "";
  console.log(`[ ${fTime} ] - ${newLabel}${newContent}`);
}

module.exports = {
  executeCommand,
  wait,
  isNull,
  getFormatDate,
  decodeBitcoinRawTx: decodeRawTx,
  debugLog,
};
