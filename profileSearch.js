const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Profile Search with Detailed Matching Percentages
router.get("/:profile_id", async (req, res) => {
  try {
    const { profile_id } = req.params;

    // 1️⃣ Get current user's profile, subjects and availability
    const profileResult = await pool.query(
      `SELECT profile_id, full_name, address FROM user_profile WHERE profile_id=$1 AND deleted_at IS NULL`,
      [profile_id]
    );

    if (profileResult.rowCount === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profile = profileResult.rows[0];

    const userSubjectsResult = await pool.query(
      `SELECT subject_name, subject_type FROM user_subjects WHERE profile_id=$1 AND deleted_at IS NULL`,
      [profile_id]
    );

    const userAvailabilityResult = await pool.query(
      `SELECT day_of_week, start_time, end_time FROM user_availability WHERE profile_id=$1 AND deleted_at IS NULL`,
      [profile_id]
    );

    const userTeach = userSubjectsResult.rows.filter(s => s.subject_type === 0).map(s => s.subject_name);
    const userLearn = userSubjectsResult.rows.filter(s => s.subject_type === 1).map(s => s.subject_name);
    const userAvailability = userAvailabilityResult.rows;

    // 2️⃣ Get all other profiles
    const otherProfilesResult = await pool.query(
      `SELECT profile_id, full_name, address FROM user_profile WHERE profile_id != $1 AND deleted_at IS NULL`,
      [profile_id]
    );

    const matchingProfiles = [];

    for (const other of otherProfilesResult.rows) {
      const otherSubjectsResult = await pool.query(
        `SELECT subject_name, subject_type FROM user_subjects WHERE profile_id=$1 AND deleted_at IS NULL`,
        [other.profile_id]
      );

      const otherAvailabilityResult = await pool.query(
        `SELECT day_of_week, start_time, end_time FROM user_availability WHERE profile_id=$1 AND deleted_at IS NULL`,
        [other.profile_id]
      );

      const otherTeach = otherSubjectsResult.rows.filter(s => s.subject_type === 0).map(s => s.subject_name);
      const otherLearn = otherSubjectsResult.rows.filter(s => s.subject_type === 1).map(s => s.subject_name);
      const otherAvailability = otherAvailabilityResult.rows;

      // 3️⃣ Subject Matching
      const teachMatchCount = userTeach.filter(sub => otherLearn.includes(sub)).length;
      const learnMatchCount = userLearn.filter(sub => otherTeach.includes(sub)).length;

      // ✅ Lazmi condition: dono me se kam se kam 1 match hona chahiye
      if (teachMatchCount === 0 || learnMatchCount === 0) continue;

      const teachPercentage = userTeach.length > 0 ? (teachMatchCount / userTeach.length) * 100 : 0;
      const learnPercentage = userLearn.length > 0 ? (learnMatchCount / userLearn.length) * 100 : 0;

      // 4️⃣ Availability Matching
      let availabilityPercentage = 0;
      for (const ua of userAvailability) {
        for (const oa of otherAvailability) {
          if (
            ua.day_of_week === oa.day_of_week &&
            ua.start_time < oa.end_time &&
            ua.end_time > oa.start_time
          ) {
            availabilityPercentage = 100;
            break;
          }
        }
        if (availabilityPercentage > 0) break;
      }

      // 5️⃣ Final Percentage (weighted)
      const finalPercentage = Math.round((teachPercentage + learnPercentage + availabilityPercentage) / 3);

      matchingProfiles.push({
        profile_id: other.profile_id,
        full_name: other.full_name,
        address: other.address,
        teach_match_percentage: Math.round(teachPercentage),
        learn_match_percentage: Math.round(learnPercentage),
        availability_percentage: availabilityPercentage,
        final_percentage: finalPercentage,
        matched_user_teach: otherTeach,   // ✅ add other user's teach subjects
        matched_user_learn: otherLearn    // ✅ add other user's learn subjects
      });
    }

    if (matchingProfiles.length === 0) {
      return res.json({ message: "No user matching found" });
    }

    res.json({ matches: matchingProfiles });

  } catch (err) {
    console.error("Profile Search Error:", err);
    res.status(500).json({ error: "Server par koi masla ho gaya" });
  }
});

module.exports = router;
