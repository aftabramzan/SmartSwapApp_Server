// const express = require("express");
// const router = express.Router();
// const { Pool } = require("pg");
// require("dotenv").config();

// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// // PostgreSQL Connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//    1️⃣ GENERATE QUIZ (20 MCQs)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
// router.post("/quiz/generate", async (req, res) => {
//   try {
//     const { user_id, subject_id } = req.body;

//     if (!user_id || !subject_id) {
//       return res.status(400).json({ error: "user_id and subject_id required" });
//     }

//     // Validate user & subject
//     const userCheck = await pool.query(`SELECT * FROM users WHERE user_id=$1`, [user_id]);
//     const subjectCheck = await pool.query(`SELECT * FROM user_subjects WHERE subject_id=$1`, [subject_id]);

//     if (userCheck.rowCount === 0 || subjectCheck.rowCount === 0) {
//       return res.status(400).json({ error: "Invalid user_id or subject_id" });
//     }

//     // Insert quiz meta
//     const quizMeta = await pool.query(
//       `INSERT INTO ai_quiz_meta (user_id, subject_id, status, total_questions)
//        VALUES ($1, $2, 'pending', 20)
//        RETURNING quiz_id`,
//       [user_id, subject_id]
//     );
//     const quiz_id = quizMeta.rows[0].quiz_id;

//     // ✅ Use a valid Gemini model
//   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
 
//     // ⚠ Make sure this model exists in your account

//     const prompt = `
// Generate EXACTLY 20 MCQs for subject_id: ${subject_id}.
// Return ONLY valid JSON array like this:

// [
//   {
//     "question_text": "text",
//     "option_a": "text",
//     "option_b": "text",
//     "option_c": "text",
//     "option_d": "text",
//     "correct_option": "A"
//   }
// ]

// Rules:
// - EXACT keys only.
// - correct_option must be A, B, C, or D.
// - No explanations.
// - No markdown.
// - No extra fields.
// `;

//     const result = await model.generateContent(prompt);
//     const raw = result.response?.text?.() ?? "";

//     // Parse JSON safely
//     let generated;
//     try {
//       generated = JSON.parse(raw);
//     } catch (e) {
//       console.error("Raw AI Output:", raw);
//       throw new Error("Invalid JSON received from Gemini.");
//     }

//     // Insert generated questions
//     for (const q of generated) {
//       await pool.query(
//         `INSERT INTO ai_quiz_questions
//         (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option)
//         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
//         [quiz_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option]
//       );
//     }

//     // Update quiz meta to completed
//     await pool.query(`UPDATE ai_quiz_meta SET status='completed' WHERE quiz_id=$1`, [quiz_id]);

//     res.json({ success: true, quiz_id, total_questions: generated.length, questions: generated });

//   } catch (err) {
//     console.error("QUIZ ERROR:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//    2️⃣ GET QUIZ BY ID
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
// router.get("/quiz/:quiz_id", async (req, res) => {
//   try {
//     const { quiz_id } = req.params;

//     const result = await pool.query(
//       `SELECT * FROM ai_quiz_questions WHERE quiz_id=$1 AND deleted_at IS NULL`,
//       [quiz_id]
//     );

//     res.json({ success: true, quiz_id, questions: result.rows });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });

// module.exports = router;





const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1️⃣ GENERATE QUIZ (20 MCQs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
router.post("/quiz/generate", async (req, res) => {
  try {
    const { user_id, subject_id } = req.body;

    if (!user_id || !subject_id) {
      return res.status(400).json({ error: "user_id and subject_id required" });
    }

    // Validate user & subject safely
    let userCheck, subjectCheck;
    try {
      userCheck = await pool.query(`SELECT * FROM users WHERE user_id=$1`, [user_id]);
      subjectCheck = await pool.query(`SELECT * FROM user_subjects WHERE subject_id=$1`, [subject_id]);
    } catch (dbErr) {
      console.error("DB ERROR:", dbErr);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (userCheck.rowCount === 0 || subjectCheck.rowCount === 0) {
      return res.status(400).json({ error: "Invalid user_id or subject_id" });
    }

    // Fetch the subject_name for the given subject_id
    let subjectNameResult;
    try {
      subjectNameResult = await pool.query(
        `SELECT subject_name FROM user_subjects WHERE subject_id=$1`,
        [subject_id]
      );
    } catch (dbErr) {
      console.error("DB ERROR fetching subject name:", dbErr);
      return res.status(500).json({ error: "Failed to fetch subject name" });
    }

    const subject_name = subjectNameResult.rows[0]?.subject_name || "the subject";

    // Insert quiz meta safely
    let quizMeta;
    try {
      quizMeta = await pool.query(
        `INSERT INTO ai_quiz_meta (user_id, subject_id, status, total_questions)
         VALUES ($1, $2, 'pending', 20)
         RETURNING quiz_id`,
        [user_id, subject_id]
      );
    } catch (dbErr) {
      console.error("DB INSERT ERROR:", dbErr);
      return res.status(500).json({ error: "Failed to create quiz" });
    }

    const quiz_id = quizMeta.rows[0].quiz_id;

    // ✅ Use a valid Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Generate EXACTLY 20 MCQs for the subject: ${subject_name}.
Return ONLY valid JSON array like this:

[
  {
    "question_text": "text",
    "option_a": "text",
    "option_b": "text",
    "option_c": "text",
    "option_d": "text",
    "correct_option": "A"
  }
]

Rules:
- EXACT keys only.
- correct_option must be A, B, C, or D.
- No explanations.
- No markdown.
- No extra fields.
`;

    let raw;
    try {
      const result = await model.generateContent(prompt);
      raw = result.response?.text?.() ?? "";
      if (!raw) throw new Error("Gemini returned empty output");
      raw = raw.replace(/```json|```/g, "").trim();
    } catch (aiErr) {
      console.error("AI ERROR:", aiErr);
      return res.status(500).json({ error: "Failed to generate quiz from AI" });
    }

    // Parse JSON safely
    let generated;
    try {
      generated = JSON.parse(raw);
      if (!Array.isArray(generated) || generated.length !== 20) {
        throw new Error("AI did not return 20 questions");
      }
    } catch (parseErr) {
      console.error("AI PARSE ERROR:", parseErr, "RAW:", raw);
      return res.status(500).json({ error: "Invalid JSON received from AI" });
    }

    // Insert generated questions safely
    try {
      for (const q of generated) {
        await pool.query(
          `INSERT INTO ai_quiz_questions
          (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option)
          VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [quiz_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option]
        );
      }
    } catch (insertErr) {
      console.error("DB INSERT QUESTIONS ERROR:", insertErr);
      return res.status(500).json({ error: "Failed to insert quiz questions" });
    }

    // Update quiz meta safely
    try {
      await pool.query(`UPDATE ai_quiz_meta SET status='completed' WHERE quiz_id=$1`, [quiz_id]);
    } catch (updateErr) {
      console.error("DB UPDATE ERROR:", updateErr);
      return res.status(500).json({ error: "Failed to update quiz status" });
    }

    res.json({ success: true, quiz_id, total_questions: generated.length, questions: generated });

  } catch (err) {
    console.error("QUIZ ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2️⃣ GET QUIZ BY ID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━*/
router.get("/quiz/:quiz_id", async (req, res) => {
  try {
    const { quiz_id } = req.params;

    let result;
    try {
      result = await pool.query(
        `SELECT * FROM ai_quiz_questions WHERE quiz_id=$1 AND deleted_at IS NULL`,
        [quiz_id]
      );
    } catch (dbErr) {
      console.error("DB ERROR:", dbErr);
      return res.status(500).json({ error: "Failed to fetch quiz" });
    }

    res.json({ success: true, quiz_id, questions: result.rows });

  } catch (err) {
    console.error("GET QUIZ ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
