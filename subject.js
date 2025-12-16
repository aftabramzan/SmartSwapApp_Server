// const express = require("express");
// const router = express.Router();
// const { Pool } = require("pg");
// require("dotenv").config();

// // ✅ PostgreSQL Connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });


// // ✅ 1. Master subjects list (for spinner dropdowns)
// router.get("/master", async (req, res) => {
//   try {
//     const subjects = [
//       "Mathematics", "Physics", "Chemistry", "Biology",
//       "Computer Science", "English", "Urdu", "Islamic Studies",
//       "Economics", "Accounting", "Programming", "AI Fundamentals"
//     ];
//     res.json({ success: true, subjects });
//   } catch (err) {
//     console.error("Error fetching master subjects:", err);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// });


// // ✅ 2. Save or update subjects for a profile
// router.post("/", async (req, res) => {
//   try {
//     const { profile_id, teachSubjects, learnSubjects } = req.body;

//     if (!profile_id)
//       return res.status(400).json({ error: "profile_id is required" });

//     // Convert arrays safely
//     const teachArr = Array.isArray(teachSubjects) ? teachSubjects : [];
//     const learnArr = Array.isArray(learnSubjects) ? learnSubjects : [];

//     // Remove existing subjects (soft delete)
//     await pool.query(
//       "UPDATE user_subjects SET deleted_at = NOW() WHERE profile_id = $1 AND deleted_at IS NULL",
//       [profile_id]
//     );

//     // Insert new Teach subjects
//     for (const sub of teachArr) {
//       await pool.query(
//         `INSERT INTO user_subjects (profile_id, subject_name, subject_type)
//          VALUES ($1, $2, 0)`,
//         [profile_id, sub]
//       );
//     }

//     // Insert new Learn subjects
//     for (const sub of learnArr) {
//       await pool.query(
//         `INSERT INTO user_subjects (profile_id, subject_name, subject_type)
//          VALUES ($1, $2, 1)`,
//         [profile_id, sub]
//       );
//     }

//     res.json({
//       success: true,
//       message: "Subjects saved successfully",
//       total_saved: teachArr.length + learnArr.length,
//     });
//   } catch (err) {
//     console.error("Error saving subjects:", err);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// });


// // ✅ 3. Get subjects by profile_id
// router.get("/:profile_id", async (req, res) => {
//   try {
//     const { profile_id } = req.params;

//     const result = await pool.query(
//       `SELECT subject_id, subject_name, subject_type, created_at
//        FROM user_subjects
//        WHERE profile_id = $1 AND deleted_at IS NULL
//        ORDER BY subject_type, subject_name`,
//       [profile_id]
//     );

//     const teach = result.rows.filter(r => r.subject_type === 0);
//     const learn = result.rows.filter(r => r.subject_type === 1);

//     res.json({
//       success: true,
//       profile_id,
//       teach_subjects: teach,
//       learn_subjects: learn,
//     });
//   } catch (err) {
//     console.error("Error fetching subjects:", err);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// });


// // ✅ 4. Soft delete a specific subject
// router.delete("/:subject_id", async (req, res) => {
//   try {
//     const { subject_id } = req.params;

//     const result = await pool.query(
//       "UPDATE user_subjects SET deleted_at = NOW() WHERE subject_id = $1 RETURNING *",
//       [subject_id]
//     );

//     if (result.rowCount === 0)
//       return res.status(404).json({ success: false, error: "Subject not found" });

//     res.json({ success: true, message: "Subject deleted successfully" });
//   } catch (err) {
//     console.error("Error deleting subject:", err);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// });


// // ✅ Export router
// module.exports = router;


const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

// ✅ PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ 1. Master subjects list
router.get("/master", async (req, res) => {
  try {
    const subjects = [
      "Mathematics", "Physics", "Chemistry", "Biology",
      "Computer Science", "English", "Urdu", "Islamic Studies",
      "Economics", "Accounting", "Programming", "AI Fundamentals"
    ];
    res.json({ success: true, subjects });
  } catch (err) {
    console.error("Error fetching master subjects:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ✅ 2. Save or update subjects for a profile
router.post("/", async (req, res) => {
  try {
    const { profile_id, teachSubjects, learnSubjects } = req.body;

    // ----------------------------
    // 🔥 REQUIRED VALIDATIONS
    // ----------------------------

    if (!profile_id)
      return res.status(400).json({ error: "profile_id is required" });

    // Validate arrays
    const teachArr = Array.isArray(teachSubjects) ? teachSubjects : [];
    const learnArr = Array.isArray(learnSubjects) ? learnSubjects : [];

    // Minimum 1 subject required in both
    if (teachArr.length < 1)
      return res.status(400).json({ error: "At least 1 teach subject is required." });

    if (learnArr.length < 1)
      return res.status(400).json({ error: "At least 1 learn subject is required." });

    // Check duplicate subjects inside same request
    const teachDup = teachArr.filter((item, index) => teachArr.indexOf(item) != index);
    const learnDup = learnArr.filter((item, index) => learnArr.indexOf(item) != index);

    if (teachDup.length > 0)
      return res.status(400).json({ error: `Duplicate teach subjects: ${teachDup.join(", ")}` });

    if (learnDup.length > 0)
      return res.status(400).json({ error: `Duplicate learn subjects: ${learnDup.join(", ")}` });

    // ----------------------------
    // 🔥 CHECK VALID profile_id (FK SAFE)
    // ----------------------------
    const checkProfile = await pool.query(
      "SELECT profile_id FROM user_profile WHERE profile_id = $1 AND deleted_at IS NULL",
      [profile_id]
    );

    if (checkProfile.rowCount === 0)
      return res.status(400).json({ error: "Invalid profile_id (profile does not exist)." });

    // ----------------------------
    // 🔥 Remove existing subjects (soft delete)
    // ----------------------------
    await pool.query(
      "UPDATE user_subjects SET deleted_at = NOW() WHERE profile_id = $1 AND deleted_at IS NULL",
      [profile_id]
    );

    // ----------------------------
    // 🔥 Insert new Teach subjects
    // ----------------------------
    for (const sub of teachArr) {
      await pool.query(
        `INSERT INTO user_subjects (profile_id, subject_name, subject_type)
         VALUES ($1, $2, 0)`,
        [profile_id, sub]
      );
    }

    // ----------------------------
    // 🔥 Insert new Learn subjects
    // ----------------------------
    for (const sub of learnArr) {
      await pool.query(
        `INSERT INTO user_subjects (profile_id, subject_name, subject_type)
         VALUES ($1, $2, 1)`,
        [profile_id, sub]
      );
    }

    res.json({
      success: true,
      message: "Subjects saved successfully",
      total_saved: teachArr.length + learnArr.length,
    });

  } catch (err) {
    console.error("Error saving subjects:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ✅ 3. Get subjects by profile_id
router.get("/:profile_id", async (req, res) => {
  try {
    const { profile_id } = req.params;

    const result = await pool.query(
      `SELECT subject_id, subject_name, subject_type, created_at
       FROM user_subjects
       WHERE profile_id = $1 AND deleted_at IS NULL
       ORDER BY subject_type, subject_name`,
      [profile_id]
    );

    const teach = result.rows.filter(r => r.subject_type === 0);
    const learn = result.rows.filter(r => r.subject_type === 1);

    res.json({
      success: true,
      profile_id,
      teach_subjects: teach,
      learn_subjects: learn,
    });
  } catch (err) {
    console.error("Error fetching subjects:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ✅ 4. Soft delete a specific subject
router.delete("/:subject_id", async (req, res) => {
  try {
    const { subject_id } = req.params;

    const result = await pool.query(
      "UPDATE user_subjects SET deleted_at = NOW() WHERE subject_id = $1 RETURNING *",
      [subject_id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ success: false, error: "Subject not found" });

    res.json({ success: true, message: "Subject deleted successfully" });
  } catch (err) {
    console.error("Error deleting subject:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
