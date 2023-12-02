const express = require("express");
const pool = require("./connection");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { jwtVerify, SignJWT, importJWK } = require("jose");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

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

const port = 3030;
app.listen(port, () => {
  console.log("Server is running on port: http://localhost:" + port);
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

app.post("/api/register", async (req, res, next) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUserId = uuidv4();
    // Change to use NOW() instead of local timestamp
    // const createdAt = new Date().toISOString().slice(0, 19).replace("T", " ");

    const [users] = await conn.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (users.length > 0) {
      return res.status(400).send({ message: "Username already exists." });
    }

    await conn.query(
      "INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, NOW())",
      [newUserId, username, hashedPassword]
    );

    await conn.query(
      "INSERT INTO user_profile (user_id, created_at) VALUES (?, NOW())",
      [newUserId]
    );

    res.status(200).send({ message: "User created successfully." });
  } catch (error) {
    // 如果在執行 SQL 查詢或其他異步操作時出現錯誤，這些錯誤將被全局錯誤處理器捕獲。
    next(error);
  } finally {
    if (conn) conn.release();
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [
    username,
  ]);

  if (!users.length)
    return res.status(404).send({ message: "User not found." });

  const user = users[0];
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch)
    return res.status(401).send({ message: "Wrong password" });

  const jwtKey = await jwtKeyPromise;
  const token = new SignJWT({ userId: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h"); // 設置token有效期限

  const signedToken = await token.sign(jwtKey);
  // console.log("Signed Token: ", signedToken);
  res.status(200).json({ message: "Logined successfully", token: signedToken });
});

const uploadsDirectory = path.join(__dirname, "../uploads");
fs.existsSync(uploadsDirectory) ||
  fs.mkdirSync(uploadsDirectory, {
    recursive: true,
  });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (req, file, cb) => {
    const ext =
      file.mimetype.split("/")[1] === "jpeg"
        ? "jpg"
        : file.mimetype.split("/")[1];
    cb(null, file.fieldname + "-" + Date.now() + "." + ext);
  },
});

const upload = multer({ storage: storage });

app.patch(
  "/api/user-profile",
  upload.single("file"),
  async (req, res, next) => {
    // console.log(req.body);
    // console.log(req.file);

    const {
      userId,
      nickname,
      email,
      bio,
      website,
      facebook,
      instagram,
      x,
      threads,
      language,
      type,
    } = req.body;
    try {
      const avatarUrl =
        req.file && type === "avatar" ? `/uploads/${req.file.filename}` : null;

      await pool.query(
        "UPDATE user_profile SET nickname = ?, email = ?, bio = ?, avatar_url = ?, website = ?, facebook = ?, instagram = ?, x = ?, threads = ?, language = ?, updated_at = NOW() WHERE user_id = ?",
        [
          nickname,
          email,
          bio,
          avatarUrl,
          website,
          facebook,
          instagram,
          x,
          threads,
          language,
          userId,
        ]
      );

      res.status(200).send({ message: "User profile updated successfully" });
    } catch (error) {
      next(error);
    }
  }
);

app.get("/api/user-profile", async (req, res, next) => {
  const { userId } = req.query;
  try {
    const [userProfile] = await pool.query(
      "SELECT * FROM user_profile WHERE user_id = ? ",
      [userId]
    );

    if (userProfile.length === 0) {
      return res.status(404).send("User profile not found.");
    }

    // console.log("userProfile: ", userProfile);
    // console.log(userId);

    res.status(200).send({
      message: "Get user profile successfully",
      userProfile: userProfile[0],
    });
  } catch (error) {
    next(error);
  }
});

app.use("/uploads", express.static("uploads"));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("An internal server error has occurred.");
});
