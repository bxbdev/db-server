const mysql = require("mysql2");
const fs = require("fs");
const pg = require("pg");

require("dotenv").config();

const ssl = {
  ca: fs.readFileSync("./ca.pem"),
};

// MySQL 連接配置
const connection = mysql.createConnection({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: ssl,
});

connection.connect((error) => {
  if (error) {
    console.error("Error connecting: " + error.stack);
    return;
  }
  console.log("Connected to Aiven MySQL with SSL as id " + connection.threadId);
});

module.exports = connection;
