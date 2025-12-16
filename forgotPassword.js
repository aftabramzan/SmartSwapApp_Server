const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// POST route for Forgot Password
router.post("/", async (req, res) => {
  try {
    const { email, username, phone_no, new_password_hash } = req.body;

    if (!email || !username || !phone_no || !new_password_hash) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    // 🔹 Verify user exists (join users + user_profile)
    const userResult = await pool.query(
      `SELECT u.user_id 
       FROM users u
       INNER JOIN user_profile p ON u.user_id = p.user_id
       WHERE u.email=$1 AND u.username=$2 AND p.phone_no=$3 AND u.deleted_at IS NULL AND p.deleted_at IS NULL`,
      [email, username, phone_no]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const user_id = userResult.rows[0].user_id;

    // 🔹 Update password in users table
    const updateResult = await pool.query(
      `UPDATE users SET password_hash=$1, updated_at=NOW() 
       WHERE user_id=$2 RETURNING user_id, email, username`,
      [new_password_hash, user_id]
    );

    res.json({
      success: true,
      message: "Password updated successfully",
      user: updateResult.rows[0],
    });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
