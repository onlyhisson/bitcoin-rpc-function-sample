const express = require("express");
const router = express.Router();
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
  getWalletList,
  saveWallet,
  saveWalletAddress,
} = require("../db/wallet");

// 지갑 정보 조회
router.get("/", async function (req, res) {
  let conn = null;

  try {
    conn = await getConnection();
    //const wallets = await getListWallets();
    const wallets = await getWalletInfos(conn);

    res.json({
      success: true,
      data: {
        wallets,
      },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);
    res.json({
      success: false,
      messgage: "error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

// 지갑 추가
router.post("/", async function (req, res) {
  let conn = null;
  try {
    const { name, desc, pass_phase: passPhase } = req.body;

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

    res.json({
      success: true,
      data: {
        wallet: {
          id: insertId,
          name,
          desc,
          passPhase,
        },
      },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);
    res.json({
      success: false,
      message: err.message ? err.message : "error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

// 지갑 주소 추가
router.post("/address", async function (req, res) {
  let conn = null;

  try {
    const { walletId, label, type } = req.body;

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
    const wallets = await getWalletInfos(conn);
    const walletInfo = wallets.filter((el) => el.id === Number(walletId));

    // 지갑 없으면 error
    if (walletInfo.length < 1) {
      throw { message: "the wallet is not exist" };
    }
    const { name: walletName } = walletInfo[0];
    const addresses = await getWalletList(conn, { walletId });
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

    res.json({
      success: true,
      data: { id: insertId, label, address, type },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);
    res.json({
      success: false,
      message: err.message ? err.message : "error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

router.get("/label", async function (req, res) {
  try {
    const { wallet, label } = req.query;

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
    res.json({
      success: true,
      data: {
        addresses: addrDetails,
      },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);
    res.json({
      success: false,
      messgage: "error",
    });
  }
});

router.get("/balances/:walletName", async function (req, res) {
  let conn = null;

  try {
    const { walletName } = req.params;

    if (isNull(walletName)) {
      throw { message: `invalid parameter` };
    }

    conn = await getConnection();

    const walletList = await getWalletList(conn);

    const rows = await getWalletBalances(walletName);
    const rowsEl = rows.map((el) => el[0]);
    const balances = rowsEl.map((el) => {
      const [address, amount, label] = el;
      const walletInfos = walletList.filter((el) => el.address === address);
      return {
        label,
        address,
        amount,
        desc: walletInfos.length > 0 ? walletInfos[0].desc : "",
      };
    });

    res.json({
      success: true,
      data: {
        walletName,
        balances,
      },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);
    res.json({
      success: false,
      messgage: "error",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

module.exports = router;
