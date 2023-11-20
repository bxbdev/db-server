const express = require("express");
const pool = require("./connection");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const { jwtVerify, SignJWT, importJWK } = require("jose");

dotenv.config();

// 用於簽名JWT的密鑰
const secretKey = process.env.ACCESS_TOKEN_SECRET;
const jwtKeyPromise = importJWK({ k: secretKey, alg: "HS256", kty: "oct" });

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send({
    message: "Server is running",
    env: process.env.NODE_ENV,
    host: process.env.DB_HOST,
    port: process.env.PORT,
  });
});

app.get("/api/verifyToken", async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).send("Access Denied: No Token Provided");
  }

  try {
    // 二個都是要用promise的寫法
    const jwtKey = await jwtKeyPromise;
    // 取得token，並將jwtKey傳入
    const verifed = await jwtVerify(token, jwtKey);
    // 將驗證的payload傳回
    console.log(verifed);
    req.user = verifed.payload;
    // 回傳驗證成功
    res.status(200).send("Token verified successfully");
  } catch (err) {
    console.error("Token verfication error: ", err);
    if (err.code === "ERR_JWT_EXPIRED")
      return res.status(401).send("Token has expired");
    return res.status(400).send("Access Denied: Invalid Token");
  }
});

app.post("/api/register", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const createdAt = new Date().toISOString().slice(0, 19).replace("T", " ");

    const [tables] = await conn.query("SHOW TABLES LIKE 'users'");

    if (tables.length === 0) {
      await conn.query(`
        CREATE TABLE users (
          id INT NOT NULL AUTO_INCREMENT,
          username VARCHAR(20) NOT NULL UNIQUE,
          password VARCHAR(100) NOT NULL,
          deleted TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NULL,
          PRIMARY KEY (id)
        );
      `);
      console.log("The users table has been created successfully!");
    }

    const [users] = await conn.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (users.length > 0) {
      return res.status(400).send("Username already exists.");
    }

    await conn.query(
      "INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)",
      [username, hashedPassword, createdAt]
    );

    res.status(200).send("User created successfully!");
  } catch (error) {
    console.log("An error occurred: ", error);
    res.status(500).send("An error ocurred while creating the user.");
  } finally {
    if (conn) await conn.release();
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [
    username,
  ]);

  if (!users.length) return res.status(404).send("User not found.");

  const user = users[0];
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) return res.status(401).send("Wrong password");

  const jwtKey = await jwtKeyPromise;
  const token = new SignJWT({ "user-id": user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30s"); // 設置token有效期限

  const signedToken = await token.sign(jwtKey);
  // console.log("Signed Token: ", signedToken);
  res.status(200).json({ message: "Logined successfully", token: signedToken });
});

const port = 3030;
app.listen(port, () => {
  console.log("Server is running on port: http://localhost:" + port);
});
