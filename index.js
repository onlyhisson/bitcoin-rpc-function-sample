require("dotenv").config();

const app = require("./app");
const port = process.env.PORT;

require("./src/jobs/common");
require("./src/jobs");

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
