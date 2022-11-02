const { successRespFormat } = require("../util");
const service = require("../services/block.service");

async function get(req, res, next) {
  try {
    const data = await service.get();
    successRespFormat(res, { block: data });
  } catch (err) {
    next(err);
  }
}

async function findLastOne(req, res, next) {
  try {
    const data = await service.findLastOne();
    successRespFormat(res, { block: data });
  } catch (err) {
    next(err);
  }
}

async function findOneByBlockNum(req, res, next) {
  // 특정 블록 데이터 조회 함수
  try {
    const data = await service.findOneByBlockNum(req.params.blocknum);
    successRespFormat(res, { block: data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  get,
  findLastOne,
  findOneByBlockNum,
};
