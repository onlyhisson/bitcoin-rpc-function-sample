require("dotenv").config();

const { block, transaction, wallet } = require("./util/rpc");
const { getBlockChainInfo, getBlockCount, getBlockHash, getBlock } = block;
const { getRawTransaction, getDecodeRawTransaction } = transaction;
const {
  getListWallets,
  createWallet,
  encryptWallet,
  getNewAddress,
  getWalletLabels,
  getAddressesByLabel,
  getAddressInfo,
} = wallet;

// 마지막 블록 데이터 조회 함수
async function lastestBlockInfo() {
  try {
    const blockChainInfo = await getBlockChainInfo(); // 블록체인정보
    const blockCount = await getBlockCount(); // 블록개수 = 마지막 블록 넘버
    const blockHash = await getBlockHash(blockCount); // 특정 블록 해시값
    const blockInfo = await getBlock(blockHash); // 특정 블록 정보
    console.log("blockChainInfo : ", blockChainInfo);
    console.log("blockCount : ", blockCount);
    console.log("blockHash : ", blockHash);
    console.log("blockInfo : ", blockInfo);
  } catch (err) {
    console.error("[ERROR] : ", err);
  }
}

// 트랜잭션 정보 조회
async function txidInfo(txid) {
  try {
    const rawTxidData = await getRawTransaction(txid); // 트랙잭션 raw 데이터 조회
    const decodeRawTxidData = await getDecodeRawTransaction(rawTxidData); // 디코딩
    console.log("decode txid data : ", decodeRawTxidData);
    console.log("vin : ", decodeRawTxidData.vin);
    console.log("vout : ", decodeRawTxidData.vout);
  } catch (err) {
    console.error("[ERROR] : ", err);
  }
}

// 지갑 정보 조회
async function walletInfo() {
  try {
    const wallets = await getListWallets();
    console.log("wallets : ", wallets);
  } catch (err) {
    console.error("[ERROR] : ", err);
  }
}

// 지갑 생성
async function makeWallet(name, passPhase) {
  try {
    // 현재 지갑 목록 조회
    const wallets = await getListWallets();
    console.log("wallets : ", wallets);

    // 같은 이름 있으면 error
    if (wallets.includes(name)) {
      throw { message: "already exist wallet name" };
    }

    // 지갑 암호화 하지 않고 생성
    const result = await createWallet(name);
    console.log("make a wallet : ", result);

    // 해당 지갑 암호화
    const encrypted = await encryptWallet(name, passPhase);
    console.log("encrypted : ", encrypted);
  } catch (err) {
    console.error("[ERROR] : ", err);
  }
}

// 타입에 따른 지갑 주소 생성 - 지갑 정보 및 라벨 지정 필요
async function addWalletAddress(wallet, label, type) {
  try {
    // 현재 지갑 목록 조회
    const wallets = await getListWallets();

    // 지갑 없으면 error
    if (!wallets.includes(wallet)) {
      throw { message: "the wallet is not exist" };
    }

    // 지갑 생성
    const addr = await getNewAddress(wallet, label, type);
    console.log("addr : ", addr);

    // 해당 지갑 라벨 리스트
    const labels = await getWalletLabels(wallet);
    console.log("labels : ", labels);
  } catch (err) {
    console.error("[ERROR] : ", err);
  }
}

// 지갑과 라벨로 해당 지갑 주소 상세 조회
async function getAddressDetailInfo(wallet, label) {
  try {
    // 지갑 주소 정보
    const addrObj = await getAddressesByLabel(wallet, label);
    const addresses = Object.keys(addrObj);

    await Promise.all(
      addresses.map(async (el) => {
        const res = await getAddressInfo(wallet, el); // 지갑 상세 정보
        console.log(res);
      })
    );
  } catch (err) {
    console.error("[ERROR] : ", err);
  }
}

// lastestBlockInfo();
// txidInfo("5036b1f58d512b22e4e5f0a9d673808856c6290af3d15bf8df23a954bf03a803");
// txidInfo("4abf6a6b465d08c3c551d07f3e6d2eacf483d482e181d149c9cdd3ca5a7e60a6");
// walletInfo();
const PASS_PHASE =
  "flock bleak bicycle comic palace coral describe enough client symptom arch journey";
// makeWallet("test34", PASS_PHASE);

// addWalletAddress("test34", "label21", BTC_ADDR_TYPE.BECH32);
// addWalletAddress("test34", "label22", BTC_ADDR_TYPE.P2SH_SEGWIT);
// addWalletAddress("test34", "label25", BTC_ADDR_TYPE.LEGACY);
getAddressDetailInfo("test34", "label25");
