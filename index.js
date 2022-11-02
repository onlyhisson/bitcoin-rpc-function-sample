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

const { debugLog } = require("./src/util");
const port = process.env.PORT;

require("./src/middlewares")(app);

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerJsdoc(jsDoc), origin)
);
app.use("/swagger", express.static(__dirname + "/swagger", {}));

// routes
app.use("/block", block);
app.use("/wallet", wallet);
app.use("/tx", transaction);
app.use("/assets", assets);

app.use((req, res, next) => {
  res.json({
    success: false,
    message: "Page not found",
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
