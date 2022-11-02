const BITCOIN_CMD = "bitcoin-cli";

const RPC_INFO = {
  host: process.env.RPC_HOST,
  port: process.env.RPC_PORT,
  user: process.env.RPC_USER,
  password: process.env.RPC_PASSWORD,
};

const RPC_OPTION = [
  `-rpcconnect=${RPC_INFO.host}`,
  `-rpcuser=${RPC_INFO.user}`,
  `-rpcpassword=${RPC_INFO.password}`,
  `-rpcport=${RPC_INFO.port}`,
];

// 지갑에서 주소 생성시 타입 3가지
const BTC_ADDR_TYPE = {
  BECH32: "bech32",
  P2SH_SEGWIT: "p2sh-segwit",
  LEGACY: "legacy",
};

module.exports = { BITCOIN_CMD, RPC_INFO, RPC_OPTION, BTC_ADDR_TYPE };
