const bodyParser = require("body-parser");
const { debugLog } = require("../util");

function getReqInfo(app) {
  app.use((req, res, next) => {
    debugLog("Request Type", req.method, 15);
    debugLog("Request URL", req.originalUrl, 15);
    console.log("");
    next();
  });
}

module.exports = function (app) {
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }));

  // parse application/json
  app.use(bodyParser.json());

  getReqInfo(app);
};
