const { successRespFormat } = require("../util");
const service = require("../services/asset.service");

async function createWithdrawalCoinReq(req, res, next) {
  try {
    const data = await service.createWithdrawalCoinReq(req.body);
    successRespFormat(res, { reqInfo: data });
  } catch (err) {
    next(err);
  }
}

async function confirmWithdrawalCoinReq(req, res, next) {
  try {
    const data = await service.confirmWithdrawalCoinReq(req.params.id);
    successRespFormat(res, { txid: data });
  } catch (err) {
    next(err);
  }
}

async function getAddressBalance(req, res, next) {
  try {
    const data = await service.getAddressBalance(req.params.addrId);
    successRespFormat(res, { balace: data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createWithdrawalCoinReq,
  confirmWithdrawalCoinReq,
  getAddressBalance,
};
