// const express = require("express");
// const router = express.Router();
// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ✅ Login Route
// router.post("/", async (req, res) => {
//   try {
//     const { email, password_hash } = req.body;

//     if (!email || !password_hash) {
//       return res.status(400).json({ error: "Email & Password required" });
//     }

//     const result = await pool.query(
//       "SELECT * FROM users WHERE email = $1",
//       [email]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const user = result.rows[0];

//     if (user.password_hash !== password_hash) {
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     res.json({
//       success: true,
//       message: "✅ Login successful!",
//       userId: user.user_id,
//       username: user.username,
//       role: user.role,
//     });

//   } catch (error) {
//     console.error("Login Error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Login Route
router.post("/", async (req, res) => {
  try {
    const { email, password_hash } = req.body;

    if (!email || !password_hash) {
      return res.status(400).json({ error: "Email & Password required" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    // 🔹 Generic invalid login message for security
    if (!user || user.password_hash !== password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({
      success: true,
      message: "✅ Login successful!",
      userId: user.user_id,
      username: user.username,
      role: user.role,
    });

  } catch (error) {
    console.error("Login Error:", error);

    // 🔹 Safe server error message
    res.status(500).json({ error: "Server par koi masla ho gaya" });
  }
});

module.exports = router;
