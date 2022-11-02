const { successRespFormat } = require("../util");
const service = require("../services/tx.service");

async function findOneByTxid(req, res, next) {
  try {
    const data = await service.findOneByTxid(req.params.txid);
    successRespFormat(res, { txidInfo: data });
  } catch (err) {
    next(err);
  }
}

async function findTxInoutByTxid(req, res, next) {
  try {
    const data = await service.findTxInoutByTxid(req.params.txid);
    successRespFormat(res, { txidInfo: data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  findOneByTxid,
  findTxInoutByTxid,
};
