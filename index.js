require("dotenv").config();

require("./src/jobs/common");
require("./src/jobs");

const app = require("./app");
const port = process.env.PORT;

app.listen(port, () => {
  console.log("\n#################################################");
  console.log(`# listening on port ${port}`);
  console.log("#################################################\n");
});
