require("dotenv").config();

const block = require("./routes/block");
const wallet = require("./routes/wallet");
const transaction = require("./routes/transaction");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT;
const { pool } = require("./db");

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.get("/", async (req, res) => {
  /*
  let conn = null;

  try {
    conn = pool.getConnection();
    const qry = "select 1 ";
    const [rows] = await conn.execute(qry, []);

    console.log(rows);
  } catch (err) {
    console.log(err);
  } finally {
    if (conn) {
      conn.release();
    }
  }
  */
  res.send("Hello World!");
});

app.use("/block", block);
app.use("/wallet", wallet);
app.use("/transaction", transaction);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
