// const express = require("express");
// const { Pool } = require("pg");
// require("dotenv").config();

// const router = express.Router();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ✅ Create Profile
// router.post("/", async (req, res) => {
//   try {
//     const {
//       user_id,
//       full_name,
//       class_level,
//       stream,
//       bio,
//       phone_no,
//       address,
//       profile_image_url,
//       status,
//     } = req.body;

//     if (!user_id || !full_name || !class_level || stream === undefined) {
//       return res.status(400).json({
//         error: "user_id, full_name, class_level, and stream are required."
//       });
//     }

//     const safeStream = [0, 1].includes(Number(stream)) ? Number(stream) : 0;

//     const query = `
//       INSERT INTO user_profile
//       (user_id, full_name, class_level, stream, bio, phone_no, address, profile_image_url, status)
//       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,0))
//       RETURNING *;
//     `;

//     const values = [
//       user_id,
//       full_name,
//       class_level,
//       safeStream,
//       bio || null,
//       phone_no || null,
//       address || null,
//       profile_image_url || null,
//       status
//     ];

//     const result = await pool.query(query, values);

//     res.status(201).json({
//       message: "✅ Profile created",
//       profile: result.rows[0],
//     });

//   } catch (err) {
//     if (err.code === "23505") {
//       return res.status(400).json({ error: "Profile already exists" });
//     }
//     res.status(500).json({ error: err.message });
//   }
// });

// // ✅ Get Profile by user_id
// router.get("/:user_id", async (req, res) => {
//   try {
//     const { user_id } = req.params;

//     const result = await pool.query(
//       "SELECT * FROM user_profile WHERE user_id = $1 AND deleted_at IS NULL",
//       [user_id]
//     );

//     if (result.rowCount === 0)
//       return res.status(404).json({ error: "Profile not found" });

//     res.json({ success: true, profile: result.rows[0] });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// module.exports = router;


const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Create Profile
router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      full_name,
      class_level,
      stream,
      bio,
      phone_no,
      address,
      profile_image_url,
      status,
    } = req.body;

    if (!user_id || !full_name || !class_level || stream === undefined) {
      return res.status(400).json({
        error: "user_id, full_name, class_level, and stream are required."
      });
    }

    const safeStream = [0, 1].includes(Number(stream)) ? Number(stream) : 0;

    const query = `
      INSERT INTO user_profile
      (user_id, full_name, class_level, stream, bio, phone_no, address, profile_image_url, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,0))
      RETURNING *;
    `;

    const values = [
      user_id,
      full_name,
      class_level,
      safeStream,
      bio || null,
      phone_no || null,
      address || null,
      profile_image_url || null,
      status
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: "✅ Profile created",
      profile: result.rows[0],
    });

  } catch (err) {
    // 🔹 Duplicate profile
    if (err.code === "23505") {
      return res.status(400).json({ error: "Profile already exists" });
    }
    // 🔹 Safe server error
    res.status(500).json({ error: "Server par koi masla ho gaya" });
  }
});

// ✅ Get Profile by user_id
router.get("/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      "SELECT * FROM user_profile WHERE user_id = $1 AND deleted_at IS NULL",
      [user_id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Profile not found" });

    res.json({ success: true, profile: result.rows[0] });

  } catch (err) {
    // 🔹 Safe server error
    res.status(500).json({ error: "Server par koi masla ho gaya" });
  }
});

module.exports = router;
