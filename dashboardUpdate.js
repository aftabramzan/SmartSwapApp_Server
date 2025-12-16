const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// =========================
//     UPDATE DASHBOARD
// =========================
router.put("/:user_id", async (req, res) => {
  const client = await pool.connect();

  try {
    const user_id = parseInt(req.params.user_id);
    const {
      full_name,
      class_level,
      stream,
      bio,
      phone_no,
      address,
      profile_image_url,
      status,

      teachSubjects = [],
      learnSubjects = [],

      availability = []
    } = req.body;

    if (isNaN(user_id)) {
      return res.status(400).json({ success: false, error: "Invalid user_id" });
    }

    await client.query("BEGIN");

    // 1️⃣ Get profile_id
    const profileRes = await client.query(
      "SELECT profile_id FROM user_profile WHERE user_id = $1 AND deleted_at IS NULL",
      [user_id]
    );

    if (profileRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }

    const profile_id = profileRes.rows[0].profile_id;

    // ------------------------------------------
    // 2️⃣ Update Personal Info
    // ------------------------------------------

    await client.query(
      `
      UPDATE user_profile
      SET full_name = $1,
          class_level = $2,
          stream = $3,
          bio = $4,
          phone_no = $5,
          address = $6,
          profile_image_url = $7,
          status = $8,
          updated_at = NOW()
      WHERE profile_id = $9
      `,
      [
        full_name, class_level, stream, bio, phone_no,
        address, profile_image_url, status, profile_id
      ]
    );

    // ------------------------------------------
    // 3️⃣ Update Subjects (Teach + Learn)
    // ------------------------------------------

    // Soft delete old subjects
    await client.query(
      "UPDATE user_subjects SET deleted_at = NOW() WHERE profile_id = $1 AND deleted_at IS NULL",
      [profile_id]
    );

    // Insert new teach subjects
    for (const sub of teachSubjects) {
      await client.query(
        `INSERT INTO user_subjects (profile_id, subject_name, subject_type)
         VALUES ($1, $2, 0)`,
        [profile_id, sub]
      );
    }

    // Insert new learn subjects
    for (const sub of learnSubjects) {
      await client.query(
        `INSERT INTO user_subjects (profile_id, subject_name, subject_type)
         VALUES ($1, $2, 1)`,
        [profile_id, sub]
      );
    }

    // ------------------------------------------
    // 4️⃣ Update Availability
    // ------------------------------------------

    // Soft delete old entries
    await client.query(
      "UPDATE user_availability SET deleted_at = NOW() WHERE profile_id = $1 AND deleted_at IS NULL",
      [profile_id]
    );

    // Insert new availability slots
    for (const slot of availability) {
      await client.query(
        `
        INSERT INTO user_availability (profile_id, day_of_week, start_time, end_time)
        VALUES ($1, $2, $3, $4)
        `,
        [profile_id, slot.day_of_week, slot.start_time, slot.end_time]
      );
    }

    await client.query("COMMIT");

    // ------------------------------------------
    return res.json({
      success: true,
      message: "Dashboard updated successfully"
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;
