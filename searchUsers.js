// // searchUsers.js
// const express = require("express");
// const router = express.Router();
// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ✅ Flexible User Search
// router.get("/", async (req, res) => {
//   try {
//     const { q } = req.query; // search query

//     if (!q || q.trim() === "") {
//       return res.status(400).json({ success: false, error: "Search query is required" });
//     }

//     const searchQuery = `%${q.trim()}%`;

//     // Search users by username, full_name, address OR subject_name
//     const result = await pool.query(
//       `
//       SELECT DISTINCT u.user_id, u.username, up.full_name, up.address
//       FROM users u
//       LEFT JOIN user_profile up ON u.user_id = up.user_id AND up.deleted_at IS NULL
//       LEFT JOIN user_subjects us ON up.profile_id = us.profile_id AND us.deleted_at IS NULL
//       WHERE u.username ILIKE $1
//          OR up.full_name ILIKE $1
//          OR up.address ILIKE $1
//          OR us.subject_name ILIKE $1
//       ORDER BY up.full_name
//       `,
//       [searchQuery]
//     );

//     if (result.rowCount === 0) {
//       return res.json({ success: true, message: "No users found", users: [] });
//     }

//     res.json({ success: true, users: result.rows });

//   } catch (err) {
//     console.error("Search Users Error:", err);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
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

// GET /api/search-users?q=term
router.get("/", async (req, res) => {
  try {
    const searchTerm = req.query.q || "";

    if (!searchTerm) {
      return res.status(400).json({ success: false, error: "Search term required" });
    }

    // 🔹 Get matching profiles
    const profilesResult = await pool.query(
      `
      SELECT p.profile_id, p.full_name, p.address, u.user_id, u.username
      FROM user_profile p
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN user_subjects s ON s.profile_id = p.profile_id
      WHERE p.deleted_at IS NULL
        AND (
          u.username ILIKE $1 OR
          p.full_name ILIKE $1 OR
          p.address ILIKE $1 OR
          s.subject_name ILIKE $1
        )
      GROUP BY p.profile_id, u.user_id
      ORDER BY p.full_name
      `,
      [`%${searchTerm}%`]
    );

    if (profilesResult.rowCount === 0) {
      return res.json({ success: true, users: [] });
    }

    const users = [];

    for (const profile of profilesResult.rows) {
      // 🔹 Get teach subjects
      const teachRes = await pool.query(
        `SELECT subject_name FROM user_subjects WHERE profile_id=$1 AND subject_type=0 AND deleted_at IS NULL`,
        [profile.profile_id]
      );

      // 🔹 Get learn subjects
      const learnRes = await pool.query(
        `SELECT subject_name FROM user_subjects WHERE profile_id=$1 AND subject_type=1 AND deleted_at IS NULL`,
        [profile.profile_id]
      );

      users.push({
        user_id: profile.user_id,
        username: profile.username,
        full_name: profile.full_name,
        address: profile.address,
        teach_subjects: teachRes.rows.map(r => r.subject_name),
        learn_subjects: learnRes.rows.map(r => r.subject_name),
      });
    }

    res.json({ success: true, users });

  } catch (err) {
    console.error("Search Users Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
