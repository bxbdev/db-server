const mysql = require("mysql2/promise");
const fs = require("fs");

require("dotenv").config();
const env = process.env.NODE_ENV;

console.log("current env: " + env, env === "production");

// MySQL 連接配置
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

if (env === "production") {
  dbConfig.ssl = {
    ca: fs.readFileSync("./ca.pem"),
  };
}

const pool = mysql.createPool(dbConfig);
module.exports = pool;
