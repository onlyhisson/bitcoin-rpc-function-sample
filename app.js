const express = require("express");
const app = express();
const { debugLog } = require("./src/util");
//swagger
const swaggerUi = require("swagger-ui-express");
const { origin, jsDoc } = require("./swagger");
const swaggerJsdoc = require("swagger-jsdoc");
// routes
const block = require("./src/routes/block");
const wallet = require("./src/routes/wallet");
const wallets = require("./src/routes/wallets");
const transaction = require("./src/routes/transaction");
const assets = require("./src/routes/assets");

const SYMBOL = "btc";

// log, white list...
require("./src/middlewares")(app);

//swagger
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerJsdoc(jsDoc), origin)
);
app.use("/swagger", express.static(__dirname + "/swagger", {}));

// routes
app.use(`/${SYMBOL}/wallets`, wallets);
app.use(`/${SYMBOL}/wallet`, wallet);
app.use(`/${SYMBOL}`, block);
app.use(`/${SYMBOL}/tx`, transaction);
app.use(`/${SYMBOL}/assets`, assets);

app.use((req, res, next) => {
  res.json({
    success: false,
    message: "not found",
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  if (err && err.stack) {
    debugLog("ERROR APP", err.message, 10);
    debugLog("ERROR APP", err.stack, 10);
  }
  res.status(statusCode).json({
    success: false,
    message: err.message,
  });
  return;
});

module.exports = app;
