const { executeCommand } = require("..");
const { BITCOIN_CMD, RPC_OPTION } = require("../../static");

/**
 * 지갑 인증
 */
async function authWalletPassPhrase(name, pwPhase) {
  try {
    const newRpcOption = [...RPC_OPTION, `-rpcwallet=${name}`];
    const expired = 3; // 지갑 인증 유효 시간 sec
    const params = [...newRpcOption, `walletpassphrase`, pwPhase, expired];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return cmdResult;
  } catch (err) {
    throw err;
  }
}

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

/**
 * 지갑 주소별 잔액 정보 조회
 */
async function getWalletBalances(wallet) {
  try {
    const newRpcOption = [...RPC_OPTION, `-rpcwallet=${wallet}`];
    const params = [...newRpcOption, `listaddressgroupings`];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

/**
 * 지갑 전체 잔액
 */
async function getWalletBalance(wallet) {
  try {
    const newRpcOption = [...RPC_OPTION, `-rpcwallet=${wallet}`];
    const params = [...newRpcOption, `getbalances`];
    const cmdResult = await executeCommand(BITCOIN_CMD, params, {});
    return JSON.parse(cmdResult);
  } catch (err) {
    throw err;
  }
}

/**
 * raw tx 생성후 지갑 사인후 memPool에 해당 tx 를 넘길 수 있음
 */
async function signRawTxWithWallet(wallet, rawTx) {
  try {
    const newRpcOption = [...RPC_OPTION, `-rpcwallet=${wallet}`];
    const params = [...newRpcOption, `signrawtransactionwithwallet`, rawTx];
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
  getWalletBalances,
  getWalletBalance,
  authWalletPassPhrase,
  signRawTxWithWallet,
};
