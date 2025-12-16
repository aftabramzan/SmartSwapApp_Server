const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

// ✅ PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Update Profile
router.put("/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const {
      full_name,
      class_level,
      stream,
      bio,
      phone_no,
      address,
      profile_image_url,
      status
    } = req.body;

    // Validate required fields if needed
    if (!full_name && !class_level && stream === undefined && !bio && !phone_no && !address && !profile_image_url && status === undefined) {
      return res.status(400).json({ error: "At least one field must be provided to update" });
    }

    // Build dynamic query
    const fields = [];
    const values = [];
    let index = 1;

    if (full_name !== undefined) { fields.push(`full_name=$${index++}`); values.push(full_name); }
    if (class_level !== undefined) { fields.push(`class_level=$${index++}`); values.push(class_level); }
    if (stream !== undefined) { fields.push(`stream=$${index++}`); values.push(stream); }
    if (bio !== undefined) { fields.push(`bio=$${index++}`); values.push(bio); }
    if (phone_no !== undefined) { fields.push(`phone_no=$${index++}`); values.push(phone_no); }
    if (address !== undefined) { fields.push(`address=$${index++}`); values.push(address); }
    if (profile_image_url !== undefined) { fields.push(`profile_image_url=$${index++}`); values.push(profile_image_url); }
    if (status !== undefined) { fields.push(`status=$${index++}`); values.push(status); }

    values.push(user_id);

    const query = `
      UPDATE user_profile
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE user_id=$${index} AND deleted_at IS NULL
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Profile not found or already deleted" });
    }

    res.json({ success: true, message: "Profile updated successfully", profile: result.rows[0] });

  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
