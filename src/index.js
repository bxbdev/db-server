const express = require("express");
const connection = require("./db-connection");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// 一個簡單的 API 端點
app.get("/api/items", (req, res) => {
  connection.query("SELECT * FROM items", (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

app.post("/api/create-user", (req, res) => {
  connection.query(
    `INSERT INTO users SET ?`,
    JSON.parse(`${req.body}`),
    req.body,
    (error, results) => {}
  );
});

const port = 3030;
app.listen(port, () => {
  console.log("Server is running on port: " + port);
});
