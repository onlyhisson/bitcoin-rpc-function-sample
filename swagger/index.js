// swaggerUi
const origin = {
  explorer: false,
  customCssUrl: "/swagger/custom.css",
  customJs: "/swagger/custom.js",
  swaggerOptions: {
    validatorUrl: null,
  },
};

// swagger-jsdoc
const jsDoc = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "BTC Wallet API Doucument",
      version: "1.0.0",
      description: "비트코인 지갑 API 문서",
    },
  },
  apis: ["./routes/*.js"], // files containing annotations as above
};

module.exports = { origin, jsDoc };
