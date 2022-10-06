const { executeCommand } = require("..");
const { BITCOIN_CMD, RPC_OPTION } = require("../../static");

/**
 * 지갑 목록 조회
 */
async function getListWallets() {
  try {
    const params = [...RPC_OPTION, `listwallets`];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

/**
 * 지갑 생성, 암호화 X
 */
async function createWallet(name) {
  try {
    const params = [...RPC_OPTION, `createwallet`, name];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

/**
 * 생성한 지갑 암호화
 */
async function encryptWallet(name, passPhase) {
  try {
    const newRpcOption = [...RPC_OPTION, `-rpcwallet=${name}`];
    const params = [...newRpcOption, `encryptwallet`, [passPhase]];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return cmdResult;
  } catch (err) {
    throw err;
  }
}

/**
 * 지갑 주소 추가
 */
async function getNewAddress(wallet, label, addrType) {
  try {
    const newRpcOption = [...RPC_OPTION, `-rpcwallet=${wallet}`];
    const params = [...newRpcOption, `getnewaddress`, label, addrType];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return cmdResult;
  } catch (err) {
    throw err;
  }
}

/**
 * 해당 지갑 라벨 목록 조회
 */
async function getWalletLabels(wallet) {
  try {
    const newRpcOption = [...RPC_OPTION, `-rpcwallet=${wallet}`];
    const params = [...newRpcOption, `listlabels`];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

/**
 * 해당 지갑 + 라벨의 지갑 주소 정보 상세
 */
async function getAddressesByLabel(wallet, label) {
  try {
    const newRpcOption = [...RPC_OPTION, `-rpcwallet=${wallet}`];
    const params = [...newRpcOption, `getaddressesbylabel`, label];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

/**
 * 지갑 상세 정보 조회
 */
async function getAddressInfo(wallet, address) {
  try {
    const newRpcOption = [...RPC_OPTION, `-rpcwallet=${wallet}`];
    const params = [...newRpcOption, `getaddressinfo`, address];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getListWallets,
  createWallet,
  encryptWallet,
  getNewAddress,
  getWalletLabels,
  getAddressesByLabel,
  getAddressInfo,
};
