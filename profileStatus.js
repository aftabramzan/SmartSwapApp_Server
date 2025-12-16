// const express = require("express");
// const router = express.Router();
// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ✅ Get Profile Status by user_id
// router.get("/:user_id", async (req, res) => {
//   try {
//     const user_id = parseInt(req.params.user_id);

//     if (isNaN(user_id)) {
//       return res.status(400).json({ error: "Invalid user_id" });
//     }

//     // 🔍 Check profile
//     const profileResult = await pool.query(
//       "SELECT profile_id FROM user_profile WHERE user_id = $1 AND deleted_at IS NULL",
//       [user_id]
//     );

//     const hasProfile = profileResult.rowCount > 0;
//     const profileId = hasProfile ? profileResult.rows[0].profile_id : null;

//     // 🔍 Check subjects
//     let hasSkills = false;
//     if (profileId) {
//       const subjectResult = await pool.query(
//         "SELECT subject_id FROM user_subjects WHERE profile_id = $1 AND deleted_at IS NULL",
//         [profileId]
//       );
//       hasSkills = subjectResult.rowCount > 0;
//     }

//     // 🔍 Check availability
//     let hasAvailability = false;
//     if (profileId) {
//       const availResult = await pool.query(
//         "SELECT availability_id FROM user_availability WHERE profile_id = $1 AND deleted_at IS NULL",
//         [profileId]
//       );
//       hasAvailability = availResult.rowCount > 0;
//     }

//     // 🔍 Check quiz completion
//     let allQuizzesCompleted = false;
//     if (profileId && hasSkills) {
//       const quizResult = await pool.query(
//         `
//         SELECT COUNT(*) AS total,
//                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
//         FROM ai_quiz_meta
//         WHERE user_id = $1 AND deleted_at IS NULL
//         `,
//         [user_id]
//       );

//       const total = parseInt(quizResult.rows[0].total || 0);
//       const completed = parseInt(quizResult.rows[0].completed || 0);
//       allQuizzesCompleted = total > 0 && total === completed;
//     }

//     // 🧩 Determine Next Step
//     const nextStep = !hasProfile
//       ? "Create Profile"
//       : !hasSkills
//       ? "Select Skills"
//       : !hasAvailability
//       ? "Set Availability"
//       : !allQuizzesCompleted
//       ? "Start Quiz"
//       : "Dashboard Unlocked";

//     res.json({
//       user_id,
//       profile_id: profileId,
//       has_profile: hasProfile,
//       has_skills: hasSkills,
//       has_availability: hasAvailability,
//       quiz_completed: allQuizzesCompleted,
//       next_step: nextStep,
//     });
//   } catch (error) {
//     console.error("💥 Profile Status Error:", error);
//     res.status(500).json({ error: "Internal Server Error", details: error.message });
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

// ✅ Get Profile Status by user_id
router.get("/:user_id", async (req, res) => {
  try {
    const user_id = parseInt(req.params.user_id);

    if (isNaN(user_id)) {
      return res.status(400).json({ error: "Invalid user_id" });
    }

    // 🔍 Check profile
    const profileResult = await pool.query(
      "SELECT profile_id FROM user_profile WHERE user_id = $1 AND deleted_at IS NULL",
      [user_id]
    );

    const hasProfile = profileResult.rowCount > 0;
    const profileId = hasProfile ? profileResult.rows[0].profile_id : null;

    // 🔍 Check subjects
    let hasSkills = false;
    if (profileId) {
      const subjectResult = await pool.query(
        "SELECT subject_id FROM user_subjects WHERE profile_id = $1 AND deleted_at IS NULL",
        [profileId]
      );
      hasSkills = subjectResult.rowCount > 0;
    }

    // 🔍 Check availability
    let hasAvailability = false;
    if (profileId) {
      const availResult = await pool.query(
        "SELECT availability_id FROM user_availability WHERE profile_id = $1 AND deleted_at IS NULL",
        [profileId]
      );
      hasAvailability = availResult.rowCount > 0;
    }

    // 🔍 Check quiz completion
    let allQuizzesCompleted = false;
    if (profileId && hasSkills) {
      const quizResult = await pool.query(
        `
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM ai_quiz_meta
        WHERE user_id = $1 AND deleted_at IS NULL
        `,
        [user_id]
      );

      const total = parseInt(quizResult.rows[0]?.total || 0);
      const completed = parseInt(quizResult.rows[0]?.completed || 0);
      allQuizzesCompleted = total > 0 && total === completed;
    }

    // 🧩 Determine Next Step
    const nextStep = !hasProfile
      ? "Create Profile"
      : !hasSkills
      ? "Select Skills"
      : !hasAvailability
      ? "Set Availability"
      : !allQuizzesCompleted
      ? "Start Quiz"
      : "Dashboard Unlocked";

    res.json({
      user_id,
      profile_id: profileId,
      has_profile: hasProfile,
      has_skills: hasSkills,
      has_availability: hasAvailability,
      quiz_completed: allQuizzesCompleted,
      next_step: nextStep,
    });
  } catch (error) {
    console.error("💥 Profile Status Error:", error);

    // 🔹 Safe error response for frontend
    res.status(500).json({ error: "Server par koi masla ho gaya" });
  }
});

module.exports = router;
