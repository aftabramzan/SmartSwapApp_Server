// availabilityUpdate.js
const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Update Availability Route
router.put("/update", async (req, res) => {
  try {
    const { profile_id, availability } = req.body;

    if (!profile_id || !Array.isArray(availability)) {
      return res.status(400).json({
        success: false,
        message: "profile_id and availability array are required."
      });
    }

    // ✅ Validate each slot
    for (const slot of availability) {
      if (!slot.day_of_week || !slot.start_time || !slot.end_time) {
        return res.status(400).json({
          success: false,
          message: "Each availability slot must have day_of_week, start_time, end_time."
        });
      }
      // Check time validity
      if (slot.start_time >= slot.end_time) {
        return res.status(400).json({
          success: false,
          message: `Start time must be before end time for ${slot.day_of_week}.`
        });
      }
    }

    // ✅ Soft delete existing availability
    await pool.query(
      "UPDATE user_availability SET deleted_at = NOW() WHERE profile_id = $1 AND deleted_at IS NULL",
      [profile_id]
    );

    // ✅ Insert new availability
    if (availability.length > 0) {
      const values = [];
      const placeholders = availability
        .map((slot, index) => {
          const base = index * 4;
          values.push(profile_id, slot.day_of_week, slot.start_time, slot.end_time);
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
        })
        .join(", ");

      await pool.query(
        `INSERT INTO user_availability (profile_id, day_of_week, start_time, end_time)
         VALUES ${placeholders}`,
        values
      );
    }

    return res.json({
      success: true,
      message: "✅ Availability updated successfully!",
      total_slots: availability.length
    });

  } catch (error) {
    console.error("Update Availability Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      details: error.message
    });
  }
});

module.exports = router;
