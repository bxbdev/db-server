const express = require("express");
const connection = require("./db-connection");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (res) => {
  res.send("Server is running!");
});

const port = 3030;
app.listen(port, () => {
  console.log("Server is running on port: http://localhost:" + port);
});
