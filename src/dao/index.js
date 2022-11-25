const mysql = require("mysql2/promise");
require("dotenv").config({ path: "../../.env" });

let pool = null;

function setPool() {
  pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

async function getConnection(dbPool) {
  try {
    const db = dbPool ? dbPool : pool;
    const connection = await db.getConnection();
    return connection;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

function initDb() {
  if (pool === null) {
    setPool();
  }
}

initDb();

module.exports = {
  getConnection,
};
