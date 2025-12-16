// const express = require("express");
// const router = express.Router();
// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ✅ Get full profile info by profile_id
// router.get("/:profile_id", async (req, res) => {
//   try {
//     const { profile_id } = req.params;

//     // 1️⃣ Fetch profile info
//     const profileResult = await pool.query(
//       `SELECT full_name, class_level, stream, bio
//        FROM user_profile
//        WHERE profile_id=$1 AND deleted_at IS NULL`,
//       [profile_id]
//     );

//     if (profileResult.rowCount === 0) {
//       return res.status(404).json({ success: false, error: "Profile not found" });
//     }

//     const profile = profileResult.rows[0];

//     // 2️⃣ Fetch subjects
//     const subjectsResult = await pool.query(
//       `SELECT subject_name, subject_type
//        FROM user_subjects
//        WHERE profile_id=$1 AND deleted_at IS NULL`,
//       [profile_id]
//     );

//     const teachSubjects = subjectsResult.rows
//       .filter(s => s.subject_type === 0)
//       .map(s => s.subject_name);

//     const learnSubjects = subjectsResult.rows
//       .filter(s => s.subject_type === 1)
//       .map(s => s.subject_name);

//     // 3️⃣ Fetch availability
//     const availabilityResult = await pool.query(
//       `SELECT day_of_week, start_time, end_time
//        FROM user_availability
//        WHERE profile_id=$1 AND deleted_at IS NULL
//        ORDER BY day_of_week, start_time`,
//       [profile_id]
//     );

//     res.json({
//       success: true,
//       profile: {
//         ...profile,
//         teach_subjects: teachSubjects,
//         learn_subjects: learnSubjects,
//         availability: availabilityResult.rows
//       }
//     });

//   } catch (err) {
//     console.error("Get Full Profile Error:", err);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// });

// module.exports = router;
