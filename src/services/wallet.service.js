const { isNull } = require("../util");
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
const { BTC_ADDR_TYPE } = require("../static");
const { getConnection } = require("../db");
const {
  getWalletInfos,
  getWalletAddressList,
  saveWallet,
  saveWalletAddress,
} = require("../db/wallet");

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
    const { insertId } = await saveWallet(conn, { name, desc });

    return {
      id: insertId,
      name,
      desc,
      passPhase,
    };
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
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

  try {
    const { walletId, label, type } = params;

    if (isNull(walletId) || isNull(label) || isNull(type)) {
      throw { message: `invalid parameter` };
    }

    // 지갑 생성 타입 체크
    const types = Object.values(BTC_ADDR_TYPE);
    if (!types.includes(type)) {
      throw { message: `invalid parameter(address type)` };
    }

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

    const { insertId } = await saveWalletAddress(conn, {
      walletId,
      label,
      address,
    });

    return { id: insertId, label, address, type };
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      message: err.message ? err.message : "error",
    };
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function findAddressesByWalletLabel(params) {
  try {
    const { wallet, label } = params;

    if (isNull(wallet) || isNull(label)) {
      throw { message: `invalid parameter` };
    }

    // 지갑 주소 정보
    const addrObj = await getAddressesByLabel(wallet, label);
    const addresses = Object.keys(addrObj);

    const addrDetails = await Promise.all(
      addresses.map(async (el) => {
        return await getAddressInfo(wallet, el); // 지갑 상세 정보
      })
    );
    return addrDetails;
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
      message: err.message ? err.message : "error",
    };
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

    // 잔액 조회시 RPC 서버에서 생성한 지갑이 아니면 RPC 잔액조회 에러발생
    const rows = await getWalletBalances(walletName);
    const rowsEl = rows.map((el) => el[0]);
    const balances = rowsEl.map((el) => {
      const [address, amount, label] = el;
      const walletInfos = walletList.filter((el) => el.address === address);

      return {
        walletId: walletInfos[0].wallet_id,
        addressId: walletInfos[0].address_id,
        label,
        address,
        amount,
        desc: walletInfos.length > 0 ? walletInfos[0].desc : "",
      };
    });

    return {
      walletName,
      balances,
    };
  } catch (err) {
    console.error("[ERROR] : ", err);
    throw {
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
