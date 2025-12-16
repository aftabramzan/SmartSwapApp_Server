const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Update Subjects (PUT)
router.put("/", async (req, res) => {
  try {
    const { profile_id, teachSubjects, learnSubjects } = req.body;

    if (!profile_id)
      return res.status(400).json({ success: false, error: "profile_id is required" });

    const teachArr = Array.isArray(teachSubjects) ? teachSubjects : [];
    const learnArr = Array.isArray(learnSubjects) ? learnSubjects : [];

    // 1️⃣ Soft delete existing subjects
    await pool.query(
      "UPDATE user_subjects SET deleted_at = NOW() WHERE profile_id = $1 AND deleted_at IS NULL",
      [profile_id]
    );

    // 2️⃣ Insert updated Teach subjects
    for (const sub of teachArr) {
      await pool.query(
        `INSERT INTO user_subjects (profile_id, subject_name, subject_type)
         VALUES ($1, $2, 0)`,
        [profile_id, sub]
      );
    }

    // 3️⃣ Insert updated Learn subjects
    for (const sub of learnArr) {
      await pool.query(
        `INSERT INTO user_subjects (profile_id, subject_name, subject_type)
         VALUES ($1, $2, 1)`,
        [profile_id, sub]
      );
    }

    res.json({
      success: true,
      message: "Subjects updated successfully",
      total_saved: teachArr.length + learnArr.length,
    });

  } catch (err) {
    console.error("Update Subjects Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error", details: err.message });
  }
});

// ✅ Export router
module.exports = router;
