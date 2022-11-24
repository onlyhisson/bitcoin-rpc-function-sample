const { successRespFormat } = require("../util");
const service = require("../services/asset.service");

async function getWithdrawalCoinFee(req, res, next) {
  try {
    const data = await service.getWithdrawalCoinFee({
      ...req.params,
      ...req.query,
    });
    successRespFormat(res, { feeInfo: data });
  } catch (err) {
    next(err);
  }
}

async function createWithdrawalCoinReq(req, res, next) {
  try {
    const data = await service.createWithdrawalCoinReq({
      ...req.params,
      ...req.body,
    });
    successRespFormat(res, { reqInfo: data });
  } catch (err) {
    next(err);
  }
}

async function getAddressBalance(req, res, next) {
  try {
    const data = await service.getAddressBalance(req.params.addressId);
    successRespFormat(res, { balance: data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createWithdrawalCoinReq,
  getAddressBalance,
  getWithdrawalCoinFee,
};
