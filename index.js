require("dotenv").config();

const block = require("./routes/block");
const wallet = require("./routes/wallet");
const transaction = require("./routes/transaction");
const express = require("express");
const app = express();
const port = process.env.PORT;
const { debugLog } = require("./util");
require("./middlewares")(app);

app.use("/block", block);
app.use("/wallet", wallet);
app.use("/tx", transaction);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
