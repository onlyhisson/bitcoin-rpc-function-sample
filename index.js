require("dotenv").config();
const express = require("express");
const app = express();
//swagger
const swaggerUi = require("swagger-ui-express");
const { origin, jsDoc } = require("./swagger");
const swaggerJsdoc = require("swagger-jsdoc");
// routes
const block = require("./src/routes/block");
const wallet = require("./src/routes/wallet");
const transaction = require("./src/routes/transaction");
const assets = require("./src/routes/assets");

const port = process.env.PORT;

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
app.use("/blocks", block);
app.use("/wallets", wallet);
app.use("/tx", transaction);
app.use("/assets", assets);

app.use((req, res, next) => {
  res.json({
    success: false,
    message: "Page not found",
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message);
  if (err && err.stack) {
    console.error(err.stack);
  }
  res.status(statusCode).json({
    success: false,
    message: err.message,
  });
  return;
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
