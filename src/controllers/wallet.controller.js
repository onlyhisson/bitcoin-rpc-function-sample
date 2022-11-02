const { successRespFormat } = require("../util");
const service = require("../services/wallet.service");

async function get(req, res, next) {
  try {
    const data = await service.get();
    successRespFormat(res, { walletList: data });
  } catch (err) {
    next(err);
  }
}

async function post(req, res, next) {
  try {
    console.log("req.body : ", req.body);
    const data = await service.createWalletOne(req.body);
    successRespFormat(res, { wallet: data });
  } catch (err) {
    next(err);
  }
}

async function createAddress(req, res, next) {
  try {
    const data = await service.createAddress(req.body);
    successRespFormat(res, { addressInfo: data });
  } catch (err) {
    next(err);
  }
}

async function findAddressesByWalletLabel(req, res, next) {
  try {
    const data = await service.findAddressesByWalletLabel(req.query);
    successRespFormat(res, { addressInfos: data });
  } catch (err) {
    next(err);
  }
}

async function findBalancesByWallet(req, res, next) {
  try {
    const data = await service.findBalancesByWallet(req.params);
    successRespFormat(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  get,
  post,
  createAddress,
  findAddressesByWalletLabel,
  findBalancesByWallet,
};
