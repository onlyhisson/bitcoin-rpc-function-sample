const { executeCommand } = require("..");
const { BITCOIN_CMD, RPC_OPTION } = require("../../static");

/**
 * 지갑 목록 조회
 */
async function validateAddress(address) {
  try {
    const params = [...RPC_OPTION, `validateaddress`, address];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

module.exports = {
  validateAddress,
};
