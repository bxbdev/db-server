const express = require("express");
const connection = require("./db-connection");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  const createdAt = new Date().toISOString().slice(0, 19).replace("T", " ");

  connection.query("SHOW TABLES LIKE 'users'", (err, tables) => {
    if (err) {
      return res
        .status(500)
        .send("An error ocurred while checking if table exists.");
    }

    if (tables.length === 0) {
      connection.query(`
        CREATE TABLE users (
          id INT NOT NULL AUTO_INCREMENT,
          username VARCHAR(2500) NOT NULL,
          password VARCHAR(2500) NOT NULL,
          deleted TINYINT(1) DEFAULT 0,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NULL,
          PRIMARY KEY (id)
        )
      `);
    }

    connection.query(
      `INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)`,
      [username, password, createdAt],
      (error, result) => {
        if (error) {
          res.send(error);
          res.status(500).send("An error ocurred while createing the user.");
        } else {
          res.send("User created successfully!");
        }
      }
    );
  });
});

const port = 3030;
app.listen(port, () => {
  console.log("Server is running on port: http://localhost:" + port);
});
