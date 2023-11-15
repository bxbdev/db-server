const express = require("express");
const connection = require("./db-connection");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const port = 3030;
app.listen(port, () => {
  console.log("Server is running on port: " + port);
});
