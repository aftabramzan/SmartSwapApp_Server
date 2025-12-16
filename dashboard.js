// const express = require("express");
// const router = express.Router();
// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// router.get("/:user_id", async (req, res) => {
//   try {
//     const user_id = parseInt(req.params.user_id);

//     if (isNaN(user_id)) {
//       return res.status(400).json({ success: false, error: "Invalid user_id" });
//     }

//     // 1️⃣ Profile + User join
//     const profileResult = await pool.query(
//       `
//       SELECT 
//         up.profile_id,
//         u.user_id,
//         u.username,
//         u.email,
//         up.full_name,
//         up.class_level,
//         up.stream,
//         up.bio,
//         up.phone_no,
//         up.address,
//         up.profile_image_url,
//         up.status
//       FROM user_profile up
//       INNER JOIN users u ON up.user_id = u.user_id
//       WHERE up.user_id = $1 AND up.deleted_at IS NULL
//       `,
//       [user_id]
//     );

//     if (profileResult.rowCount === 0) {
//       return res.status(404).json({ success: false, error: "Profile not found" });
//     }

//     const profile = profileResult.rows[0];
//     const profile_id = profile.profile_id;

//     // 2️⃣ Subjects
//     const subjectResult = await pool.query(
//       `
//       SELECT subject_id, subject_name, subject_type
//       FROM user_subjects
//       WHERE profile_id = $1 AND deleted_at IS NULL
//       ORDER BY subject_type, subject_name
//       `,
//       [profile_id]
//     );

//     const teach_subjects = subjectResult.rows.filter(s => s.subject_type === 0);
//     const learn_subjects = subjectResult.rows.filter(s => s.subject_type === 1);

//     // 3️⃣ Availability
//     const availabilityResult = await pool.query(
//       `
//       SELECT availability_id, day_of_week, start_time, end_time
//       FROM user_availability
//       WHERE profile_id = $1 AND deleted_at IS NULL
//       ORDER BY availability_id
//       `,
//       [profile_id]
//     );

//     // 4️⃣ FINAL clean response WITHOUT dashboard wrapper
//     return res.json({
//       success: true,
//       personal_info: profile,
//       teach_subjects,
//       learn_subjects,
//       availability: availabilityResult.rows
//     });

//   } catch (error) {
//     console.error("Dashboard Error:", error);
//     res.status(500).json({
//       success: false,
//       error: "Internal Server Error",
//       details: error.message
//     });
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

router.get("/:user_id", async (req, res) => {
  try {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id)) {
      return res.status(400).json({ success: false, error: "Invalid user_id" });
    }

    // 1️⃣ Profile + User join
    const profileResult = await pool.query(
      `
      SELECT 
        up.profile_id,
        u.user_id,
        u.username,
        u.email,
        up.full_name,
        up.class_level,
        up.stream,
        up.bio,
        up.phone_no,
        up.address,
        up.profile_image_url,
        up.status
      FROM user_profile up
      INNER JOIN users u ON up.user_id = u.user_id
      WHERE up.user_id = $1 AND up.deleted_at IS NULL
      `,
      [user_id]
    );

    if (profileResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }

    const profile = profileResult.rows[0];
    const profile_id = profile.profile_id;

    // 2️⃣ Subjects
    const subjectResult = await pool.query(
      `
      SELECT subject_id, subject_name, subject_type
      FROM user_subjects
      WHERE profile_id = $1 AND deleted_at IS NULL
      ORDER BY subject_type, subject_name
      `,
      [profile_id]
    );

    const teach_subjects = subjectResult.rows.filter(s => s.subject_type === 0);
    const learn_subjects = subjectResult.rows.filter(s => s.subject_type === 1);

    // 3️⃣ Availability
    const availabilityResult = await pool.query(
      `
      SELECT availability_id, day_of_week, start_time, end_time
      FROM user_availability
      WHERE profile_id = $1 AND deleted_at IS NULL
      ORDER BY availability_id
      `,
      [profile_id]
    );

    // 4️⃣ FINAL clean response WITHOUT dashboard wrapper
    return res.json({
      success: true,
      personal_info: profile,
      teach_subjects,
      learn_subjects,
      availability: availabilityResult.rows
    });

  } catch (error) {
    console.error("Dashboard Error:", error); // server me log rahega
  res.status(500).json({
    success: false,
    error: "Internal Server Error"
  });
  }
});

module.exports = router;
