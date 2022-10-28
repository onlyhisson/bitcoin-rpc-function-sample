require("dotenv").config();
const express = require("express");
const app = express();
// routes
const block = require("./routes/block");
const wallet = require("./routes/wallet");
const transaction = require("./routes/transaction");
const assets = require("./routes/assets");

const { debugLog } = require("./util");
const port = process.env.PORT;

require("./middlewares")(app);

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
