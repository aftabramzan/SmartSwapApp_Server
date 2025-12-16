// const express = require("express");
// const router = express.Router();
// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// /*
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   CREATE SWAP REQUEST (Subjects only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// */
// router.post("/", async (req, res) => {
//   try {
//     const {
//       sender_user_id,
//       receiver_user_id,
//       sender_profile_id,
//       receiver_profile_id,
//       sender_subject_ids = [],
//       receiver_subject_ids = [],
//       message = ""
//     } = req.body;

//     if (!sender_user_id || !receiver_user_id || !sender_profile_id || !receiver_profile_id) {
//       return res.status(400).json({ success: false, error: "Missing required fields" });
//     }

//     if (sender_subject_ids.length === 0 || receiver_subject_ids.length === 0) {
//       return res.status(400).json({ success: false, error: "Select at least one subject for both sender and receiver" });
//     }

//     if (sender_subject_ids.length !== receiver_subject_ids.length) {
//       return res.status(400).json({ success: false, error: "Sender and receiver subjects count must match" });
//     }

//     const insertedRequests = [];

//     for (let i = 0; i < sender_subject_ids.length; i++) {
//       const result = await pool.query(
//         `INSERT INTO swap_requests 
//           (sender_user_id, receiver_user_id, sender_profile_id, receiver_profile_id, sender_subject_id, receiver_subject_id, status, message)
//          VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)
//          RETURNING *`,
//         [
//           sender_user_id,
//           receiver_user_id,
//           sender_profile_id,
//           receiver_profile_id,
//           sender_subject_ids[i],
//           receiver_subject_ids[i],
//           message
//         ]
//       );
//       insertedRequests.push(result.rows[0]);
//     }

//     res.json({
//       success: true,
//       message: "Swap request(s) sent successfully",
//       requests: insertedRequests
//     });

//   } catch (err) {
//     console.error("Swap Request Error:", err);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// });

// module.exports = router;



// const express = require("express");
// const router = express.Router();
// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// /*
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   CREATE SWAP REQUEST (Subjects only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// */
// router.post("/", async (req, res) => {
//   try {
//     const {
//       sender_user_id,
//       receiver_user_id,
//       sender_profile_id,
//       receiver_profile_id,
//       sender_subject_ids = [],
//       receiver_subject_ids = [],
//       message = ""
//     } = req.body;

//     // 🔹 Required fields check
//     if (!sender_user_id || !receiver_user_id || !sender_profile_id || !receiver_profile_id) {
//       return res.status(400).json({ success: false, error: "Missing required fields" });
//     }

//     if (sender_subject_ids.length === 0 || receiver_subject_ids.length === 0) {
//       return res.status(400).json({ success: false, error: "Select at least one subject for both sender and receiver" });
//     }

//     if (sender_subject_ids.length !== receiver_subject_ids.length) {
//       return res.status(400).json({ success: false, error: "Sender and receiver subjects count must match" });
//     }

//     // 🔹 Validate sender subjects exist in sender profile
//     const senderSubjects = await pool.query(
//       `SELECT subject_id FROM user_subjects 
//        WHERE profile_id=$1 AND subject_id = ANY($2) AND deleted_at IS NULL`,
//       [sender_profile_id, sender_subject_ids]
//     );

//     if (senderSubjects.rowCount !== sender_subject_ids.length) {
//       return res.status(400).json({ success: false, error: "Invalid sender subjects" });
//     }

//     // 🔹 Validate receiver subjects exist in receiver profile
//     const receiverSubjects = await pool.query(
//       `SELECT subject_id FROM user_subjects 
//        WHERE profile_id=$1 AND subject_id = ANY($2) AND deleted_at IS NULL`,
//       [receiver_profile_id, receiver_subject_ids]
//     );

//     if (receiverSubjects.rowCount !== receiver_subject_ids.length) {
//       return res.status(400).json({ success: false, error: "Invalid receiver subjects" });
//     }

//     // 🔹 Insert swap requests
//     const insertedRequests = [];

//     for (let i = 0; i < sender_subject_ids.length; i++) {
//       const result = await pool.query(
//         `INSERT INTO swap_requests 
//           (sender_user_id, receiver_user_id, sender_profile_id, receiver_profile_id, sender_subject_id, receiver_subject_id, status, message)
//          VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)
//          RETURNING *`,
//         [
//           sender_user_id,
//           receiver_user_id,
//           sender_profile_id,
//           receiver_profile_id,
//           sender_subject_ids[i],
//           receiver_subject_ids[i],
//           message
//         ]
//       );
//       insertedRequests.push(result.rows[0]);
//     }

//     res.json({
//       success: true,
//       message: "Swap request(s) sent successfully",
//       requests: insertedRequests
//     });

//   } catch (err) {
//     console.error("Swap Request Error:", err);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// });

// module.exports = router;



// with availability
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
  CREATE SWAP REQUEST (Subjects + Availability)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
router.post("/", async (req, res) => {
  try {
    const {
      sender_user_id,
      receiver_user_id,
      sender_profile_id,
      receiver_profile_id,
      sender_subject_ids = [],
      receiver_subject_ids = [],
      sender_availability_id,
      receiver_availability_id,
      message = ""
    } = req.body;

    // 🔹 Required fields check
    if (!sender_user_id || !receiver_user_id || !sender_profile_id || !receiver_profile_id) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    if (sender_subject_ids.length === 0 || receiver_subject_ids.length === 0) {
      return res.status(400).json({ success: false, error: "Select at least one subject for both sender and receiver" });
    }

    if (sender_subject_ids.length !== receiver_subject_ids.length) {
      return res.status(400).json({ success: false, error: "Sender and receiver subjects count must match" });
    }

    if (!sender_availability_id || !receiver_availability_id) {
      return res.status(400).json({ success: false, error: "Select availability for both sender and receiver" });
    }

    // 🔹 Validate sender subjects exist in sender profile
    const senderSubjects = await pool.query(
      `SELECT subject_id FROM user_subjects 
       WHERE profile_id=$1 AND subject_id = ANY($2) AND deleted_at IS NULL`,
      [sender_profile_id, sender_subject_ids]
    );

    if (senderSubjects.rowCount !== sender_subject_ids.length) {
      return res.status(400).json({ success: false, error: "Invalid sender subjects" });
    }

    // 🔹 Validate receiver subjects exist in receiver profile
    const receiverSubjects = await pool.query(
      `SELECT subject_id FROM user_subjects 
       WHERE profile_id=$1 AND subject_id = ANY($2) AND deleted_at IS NULL`,
      [receiver_profile_id, receiver_subject_ids]
    );

    if (receiverSubjects.rowCount !== receiver_subject_ids.length) {
      return res.status(400).json({ success: false, error: "Invalid receiver subjects" });
    }

    // 🔹 Validate sender availability exists
    const senderAvail = await pool.query(
      `SELECT availability_id FROM user_availability 
       WHERE profile_id=$1 AND availability_id=$2 AND deleted_at IS NULL`,
      [sender_profile_id, sender_availability_id]
    );

    if (senderAvail.rowCount === 0) {
      return res.status(400).json({ success: false, error: "Invalid sender availability" });
    }

    // 🔹 Validate receiver availability exists
    const receiverAvail = await pool.query(
      `SELECT availability_id FROM user_availability 
       WHERE profile_id=$1 AND availability_id=$2 AND deleted_at IS NULL`,
      [receiver_profile_id, receiver_availability_id]
    );

    if (receiverAvail.rowCount === 0) {
      return res.status(400).json({ success: false, error: "Invalid receiver availability" });
    }

    // 🔹 Insert swap requests
    const insertedRequests = [];
    for (let i = 0; i < sender_subject_ids.length; i++) {
      const result = await pool.query(
        `INSERT INTO swap_requests 
          (sender_user_id, receiver_user_id, sender_profile_id, receiver_profile_id, sender_subject_id, receiver_subject_id, sender_availability_id, receiver_availability_id, status, message)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)
         RETURNING *`,
        [
          sender_user_id,
          receiver_user_id,
          sender_profile_id,
          receiver_profile_id,
          sender_subject_ids[i],
          receiver_subject_ids[i],
          sender_availability_id,
          receiver_availability_id,
          message
        ]
      );
      insertedRequests.push(result.rows[0]);
    }

    res.json({
      success: true,
      message: "Swap request(s) sent successfully",
      requests: insertedRequests
    });

  } catch (err) {
    console.error("Swap Request Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
