const express = require("express");
const pool = require("./connection");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
dotenv.config();

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

const port = 3030;
app.listen(port, () => {
  console.log("Server is running on port: http://localhost:" + port);
});
