/*
  swagger editor URL 
  https://swagger.io/tools/swagger-editor/
*/

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
    servers: [
      {
        url: "http://220.86.111.196:10034", // 요청 URL
      },
    ],
  },
  apis: ["./src/routes/*.js"], // files containing annotations as above
};

module.exports = { origin, jsDoc };
