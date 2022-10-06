const { spawn } = require("node:child_process");

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
      console.log(`child process exited with code ${code}`);
      dataBuffer = Buffer.concat(bufferArray);
      resolve(dataBuffer.toString().replace(/\r\n/g, ""));
    });
  });
}

function wait(number) {
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

module.exports = {
  executeCommand,
  wait,
  isNull,
};
