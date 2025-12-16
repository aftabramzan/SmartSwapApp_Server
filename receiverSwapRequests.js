const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1️⃣ GET RECEIVER PENDING REQUESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
router.get("/pending/:receiver_profile_id", async (req, res) => {
  try {
    const { receiver_profile_id } = req.params;

    const result = await pool.query(
      `SELECT 
         sr.request_id,
         sr.sender_profile_id,
         up.full_name AS sender_name,
         us1.subject_name AS sender_subject,
         us2.subject_name AS receiver_subject,
         ua1.day_of_week AS sender_day,
         ua1.start_time AS sender_start,
         ua1.end_time AS sender_end,
         ua2.day_of_week AS receiver_day,
         ua2.start_time AS receiver_start,
         ua2.end_time AS receiver_end,
         sr.message,
         sr.status,
         sr.created_at
       FROM swap_requests sr
       JOIN user_profile up ON up.profile_id = sr.sender_profile_id
       JOIN user_subjects us1 ON us1.subject_id = sr.sender_subject_id
       JOIN user_subjects us2 ON us2.subject_id = sr.receiver_subject_id
       JOIN user_availability ua1 ON ua1.availability_id = sr.sender_availability_id
       JOIN user_availability ua2 ON ua2.availability_id = sr.receiver_availability_id
       WHERE sr.receiver_profile_id = $1
         AND sr.status = 'pending'
         AND sr.deleted_at IS NULL
       ORDER BY sr.created_at DESC`,
      [receiver_profile_id]
    );

    res.json({
      success: true,
      total_requests: result.rowCount,
      requests: result.rows,
    });

  } catch (err) {
    console.error("Receiver Pending Requests Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  2️⃣ ACCEPT SWAP REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
router.post("/accept", async (req, res) => {
  try {
    const { request_id, receiver_profile_id } = req.body;

    if (!request_id || !receiver_profile_id) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const result = await pool.query(
      `UPDATE swap_requests
       SET status='accepted', updated_at=NOW()
       WHERE request_id=$1
         AND receiver_profile_id=$2
         AND status='pending'
       RETURNING *`,
      [request_id, receiver_profile_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Request not found or already processed"
      });
    }

    res.json({
      success: true,
      message: "Swap request accepted successfully",
      request: result.rows[0],
    });

  } catch (err) {
    console.error("Accept Request Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  3️⃣ REJECT / CANCEL REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
router.post("/reject", async (req, res) => {
  try {
    const { request_id, receiver_profile_id } = req.body;

    if (!request_id || !receiver_profile_id) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const result = await pool.query(
      `UPDATE swap_requests
       SET status='rejected', updated_at=NOW()
       WHERE request_id=$1
         AND receiver_profile_id=$2
         AND status='pending'
       RETURNING *`,
      [request_id, receiver_profile_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Request not found or already processed"
      });
    }

    res.json({
      success: true,
      message: "Swap request rejected successfully",
      request: result.rows[0],
    });

  } catch (err) {
    console.error("Reject Request Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
