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
const { getWalletList } = require("../db/wallet");

router.get("/", async function (req, res) {
  try {
    // 지갑 정보 조회
    const wallets = await getListWallets();
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
  }
});

// 지갑 추가
router.post("/", async function (req, res) {
  try {
    const { name, pass_phase: passPhase } = req.body;

    if (isNull(name) || isNull(passPhase)) {
      throw { message: `invalid parameter` };
    }

    // 현재 지갑 목록 조회
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

    res.json({
      success: true,
      data: {
        wallet: {
          name,
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
  }
});

// 지갑 주소 추가
router.post("/address", async function (req, res) {
  try {
    const { wallet, label, type } = req.body;

    if (isNull(wallet) || isNull(label) || isNull(type)) {
      throw { message: `invalid parameter` };
    }

    const types = Object.values(BTC_ADDR_TYPE);
    if (!types.includes(type)) {
      throw { message: `invalid parameter(address type)` };
    }

    // 현재 지갑 목록 조회
    const wallets = await getListWallets();

    // 지갑 없으면 error
    if (!wallets.includes(wallet)) {
      throw { message: "the wallet is not exist" };
    }

    // 지갑 생성
    const address = await getNewAddress(wallet, label, type);
    console.log("address : ", address);

    // 해당 지갑 라벨 리스트
    const labels = await getWalletLabels(wallet);
    console.log("labels : ", labels);

    res.json({
      success: true,
      data: { label, address, type },
    });
  } catch (err) {
    console.error("[ERROR] : ", err);
    res.json({
      success: false,
      message: err.message ? err.message : "error",
    });
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
