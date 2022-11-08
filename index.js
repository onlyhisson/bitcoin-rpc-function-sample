require("dotenv").config();

require("./src/jobs/common");
require("./src/jobs");

const app = require("./app");
const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
