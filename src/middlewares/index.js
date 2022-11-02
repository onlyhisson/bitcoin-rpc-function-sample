const bodyParser = require("body-parser");
const requestIp = require("request-ip");

const { debugLog } = require("../util");

const WHITE_LIST_IP = [
  "::ffff:112.155.110.41", // home
  "::ffff:10.10.11.1", // local
];

function getReqInfo(app) {
  app.use((req, res, next) => {
    debugLog("Request Type", req.method, 15);
    debugLog("Request URL", req.originalUrl, 15);
    console.log("");
    next();
  });
}

// 허용 아이피 확인
function allowWhiteList(app) {
  app.use((req, res, next) => {
    const clientIp = requestIp.getClientIp(req);
    debugLog("Request IP", clientIp, 15);

    if (WHITE_LIST_IP.includes(clientIp)) {
      next();
    } else {
      res.json({
        error: "not allowed client",
      });
    }
  });
}

module.exports = function (app) {
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }));

  // parse application/json
  app.use(bodyParser.json());

  getReqInfo(app);
  allowWhiteList(app);
};
