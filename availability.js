// const express = require("express");
// const router = express.Router();
// const { Pool } = require("pg");
// require("dotenv").config();

// // ✅ PostgreSQL Connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // ✅ Save Availability Route
// router.post("/save", async (req, res) => {
//   try {
//     const { profile_id, availability } = req.body;

//     if (!profile_id || !Array.isArray(availability) || availability.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "profile_id and availability array are required."
//       });
//     }

//     // ✅ Prepare values and placeholders
//     const values = [];
//     const placeholders = availability
//       .map((slot, index) => {
//         const base = index * 4;
//         values.push(profile_id, slot.day_of_week, slot.start_time, slot.end_time);
//         return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
//       })
//       .join(", ");

//     // ✅ Execute single insert
//     await pool.query(
//       `
//       INSERT INTO user_availability (profile_id, day_of_week, start_time, end_time)
//       VALUES ${placeholders}
//       `
//       ,
//       values
//     );

//     return res.status(201).json({
//       success: true,
//       message: "✅ Availability saved successfully!"
//     });

//   } catch (error) {
//     console.error("❌ Error saving availability:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error.",
//       error: error.message
//     });
//   }
// });


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

// ✅ Save Availability Route
router.post("/save", async (req, res) => {
  try {
    const { profile_id, availability } = req.body;

    // ❌ Minimum 1 availability required
    if (!profile_id || !Array.isArray(availability) || availability.length === 0) {
      return res.status(400).json({
        success: false,
        message: "profile_id and at least 1 availability slot is required."
      });
    }

    // ❌ Validate each availability slot
    for (const slot of availability) {
      if (!slot.day_of_week || !slot.start_time || !slot.end_time) {
        return res.status(400).json({
          success: false,
          message: "Each slot must include day_of_week, start_time and end_time."
        });
      }

      // ❌ start_time must be smaller than end_time
      if (slot.start_time >= slot.end_time) {
        return res.status(400).json({
          success: false,
          message: `Start time must be earlier than end time: ${slot.start_time} - ${slot.end_time}`
        });
      }

      // ❌ Check IF Time Slot Already Exists for this profile_id
      const existing = await pool.query(
        `
        SELECT * FROM user_availability 
        WHERE profile_id = $1 
        AND day_of_week = $2 
        AND start_time = $3 
        AND end_time = $4 
        AND deleted_at IS NULL
        `,
        [profile_id, slot.day_of_week, slot.start_time, slot.end_time]
      );

      if (existing.rowCount > 0) {
        return res.status(400).json({
          success: false,
          message: `This availability slot is already booked: ${slot.day_of_week} (${slot.start_time} - ${slot.end_time})`
        });
      }
    }

    // ✅ Prepare values and placeholders (NO CHANGE)
    const values = [];
    const placeholders = availability
      .map((slot, index) => {
        const base = index * 4;
        values.push(profile_id, slot.day_of_week, slot.start_time, slot.end_time);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      })
      .join(", ");

    // ✅ Execute single insert (NO CHANGE)
    await pool.query(
      `
      INSERT INTO user_availability (profile_id, day_of_week, start_time, end_time)
      VALUES ${placeholders}
      `,
      values
    );

    return res.status(201).json({
      success: true,
      message: "✅ Availability saved successfully!"
    });

  } catch (error) {
    console.error("❌ Error saving availability:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message
    });
  }
});

module.exports = router;
