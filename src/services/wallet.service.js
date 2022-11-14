const { v4: uuidv4 } = require("uuid");
const { isNull, wait, getFormatUnixTime } = require("../util");
const rpc = require("../util/rpc");
const {
  getListWallets,
  createWallet,
  encryptWallet,
  getNewAddress,
  getWalletLabels,
  getAddressesByLabel,
  getAddressInfo,
  getWalletBalances,
} = rpc.wallet;
const { getBlockCount } = rpc.block;
const { getCacheInstance, ADDRESS_LIST } = require("../util/cache");
const { BTC_ADDR_TYPE } = require("../static");
const { getConnection } = require("../db");
const {
  getWalletInfos,
  getWalletAddressList,
  saveWallet,
  saveWalletAddress,
  findWalletAddress,
} = require("../db/wallet");
const { txInOutJob } = require("../jobs");

const cronCache = getCacheInstance();

async function get() {
  let conn = null;

  try {
    conn = await getConnection();
    //const wallets = await getListWallets(); // rpc 요청
    const wallets = await getWalletInfos(conn, {});
    return wallets;
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      ...err,
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function createWalletOne(params) {
  let conn = null;
  const createdAt = getFormatUnixTime();

  try {
    const { name, desc, passPhase } = params;

    if (isNull(name) || isNull(passPhase) || isNull(desc)) {
      throw { message: `invalid parameter` };
    }

    // 현재 지갑 목록 조회, rpc 서버 기준
    const wallets = await getListWallets();
    console.log("wallets : ", wallets);

    // 같은 이름 있으면 error
    if (wallets.includes(name)) {
      throw { message: `already exist ${name}` };
    }

    // 지갑 암호화 하지 않고 생성
    const result = await createWallet(name);
    console.log("make a wallet : ", result);

    // 해당 지갑 암호화
    const encrypted = await encryptWallet(name, passPhase);
    console.log("encrypted : ", encrypted);

    conn = await getConnection();
    const { insertId } = await saveWallet(conn, { name, desc, createdAt });

    return {
      id: insertId,
      name,
      desc,
      passPhase,
    };
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      ...err,
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function createAddress(params) {
  let conn = null;
  const type = BTC_ADDR_TYPE.BECH32; // 고정
  const now = getFormatUnixTime();

  try {
    const { walletId, label: labelParam } = params;

    if (isNull(walletId)) {
      throw { message: `invalid parameter` };
    }

    const label = isNull(labelParam) ? uuidv4() : labelParam;

    // 발급한 주소와 관련된 트랜잭션 확인 스케쥴러 stop
    txInOutJob.stop();

    conn = await getConnection();

    // 현재 지갑 목록 조회
    const wallets = await getWalletInfos(conn, {});
    const walletInfo = wallets.filter((el) => el.id === Number(walletId));

    // 지갑 없으면 error
    if (walletInfo.length < 1) {
      throw { message: "the wallet is not exist" };
    }
    const { name: walletName } = walletInfo[0];
    const addresses = await getWalletAddressList(conn, { walletId });
    const labels = addresses.map((el) => el.label);
    if (labels.includes(label)) {
      throw { message: `label name(${label}) is already exist` };
    }

    // 지갑 생성
    const address = await getNewAddress(walletName, label, type);

    // 해당 지갑 라벨 리스트 - rpc
    //const labels = await getWalletLabels(walletName);
    //console.log("labels : ", labels);

    // 주소 생성시의 블록 넘버 - 해당 블록 부터 입출금 모니터링하면 됨
    const lastBlockNum = await getBlockCount();

    const { insertId } = await saveWalletAddress(conn, {
      walletId,
      label,
      address,
      startBlockNo: lastBlockNum,
      createdAt: now,
      updatedAt: now,
    });

    // 주소 목록에 새로 생성한 지갑 주소 추가
    const oldAddresses = cronCache.get(ADDRESS_LIST);
    cronCache.set(ADDRESS_LIST, [...oldAddresses, address], 0);

    return { id: insertId, label, address, type };
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      ...err,
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) {
      conn.release();
    }
    txInOutJob.start();
  }
}

async function findAddressesByWalletLabel(params) {
  let conn = null;

  try {
    const { walletId, label } = params;

    if (isNull(walletId) || isNull(label)) {
      throw { message: `invalid parameter` };
    }

    conn = await getConnection();
    const wallets = await getWalletInfos(conn, { walletId });
    if (wallets.length < 1) {
      throw { message: "지갑 정보가 없습니다." };
    }
    const { name: walletName } = wallets[0];

    // 지갑 주소 정보
    const addrObj = await getAddressesByLabel(walletName, label);
    const addresses = Object.keys(addrObj);

    const addrDetails = await Promise.all(
      addresses.map(async (el) => {
        return await getAddressInfo(walletName, el); // 지갑 상세 정보
      })
    );
    return addrDetails;
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      ...err,
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) conn.release();
  }
}

async function findBalancesByWallet(params) {
  let conn = null;

  try {
    const { walletId } = params;

    if (isNull(walletId)) {
      throw { message: `invalid parameter` };
    }

    conn = await getConnection();

    const walletList = await getWalletAddressList(conn, { walletId });
    if (walletList.length < 1) {
      throw { message: "해당 지갑에 등록된 주소가 없습니다." };
    }
    const { name: walletName } = walletList[0];

    const addressList = await getWalletAddressList(conn, { walletId });

    // 잔액 조회시 RPC 서버에서 생성한 지갑이 아니면 RPC 잔액조회 에러발생
    const rpcResult = await getWalletBalances(walletName);
    const rpcBalances = rpcResult.map((el) => el[0]);

    const balanceObjs = {};

    rpcBalances.forEach((el) => {
      const [address, amount, label] = el;
      balanceObjs[address] = amount;
    });

    const balances = addressList.map((el) => {
      const amount = balanceObjs[el.address] ? balanceObjs[el.address] : 0;
      return {
        walletId: el.wallet_id,
        addressId: el.address_id,
        label: el.label,
        address: el.address,
        amount,
        desc: el.desc ? el.desc : "",
      };
    });

    return {
      walletName,
      balances,
    };
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      ...err,
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

module.exports = {
  get,
  createWalletOne,
  createAddress,
  findAddressesByWalletLabel,
  findBalancesByWallet,
};
