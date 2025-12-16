// const express = require("express");
// const router = express.Router();
// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ✅ Sign-Up Route
// router.post("/", async (req, res) => {
//   try {
//     const { email, username, password_hash, role } = req.body;

//     if (!email || !username || !password_hash) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const result = await pool.query(
//       `INSERT INTO users (email, username, password_hash, role)
//        VALUES ($1, $2, $3, COALESCE($4, 0))
//        RETURNING *`,
//       [email, username, password_hash, role]
//     );

//     res.status(201).json({
//       message: "✅ User registered!",
//       user: result.rows[0],
//     });

//   } catch (error) {
//     console.error("Signup Error:", error);
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

// ✅ Sign-Up Route
router.post("/", async (req, res) => {
  try {
    const { email, username, password_hash, role } = req.body;

    if (!email || !username || !password_hash) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, role)
       VALUES ($1, $2, $3, COALESCE($4, 0))
       RETURNING *`,
      [email, username, password_hash, role]
    );

    res.status(201).json({
      message: "✅ User registered!",
      user: result.rows[0],
    });

  } catch (error) {

    // 🔥 Duplicate email/username handle karna
    if (error.code === "23505") {
      return res.status(409).json({
        error: "your email or username already registered"
      });
    }

    console.error("Signup Error:", error);
    res.status(500).json({ error: "Server par koi masla ho gaya" });
  }
});

module.exports = router;
