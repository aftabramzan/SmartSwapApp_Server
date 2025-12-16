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
//    1️⃣ SUBMIT QUIZ ANSWERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// */
// router.post("/quiz/submit", async (req, res) => {
//   try {
//     const { quiz_id, user_id, answers } = req.body;

//     if (!quiz_id || !user_id || !Array.isArray(answers)) {
//       return res.status(400).json({
//         error: "quiz_id, user_id, and answers[] required",
//       });
//     }

//     // Fetch questions
//     const questions = await pool.query(
//       `SELECT question_id, correct_option 
//        FROM ai_quiz_questions 
//        WHERE quiz_id=$1 AND deleted_at IS NULL`,
//       [quiz_id]
//     );

//     if (questions.rowCount === 0) {
//       return res.status(404).json({ error: "Quiz not found" });
//     }

//     let correct = 0;
//     let wrong = 0;

//     for (const q of questions.rows) {
//       const userAnswer = answers.find(a => a.question_id === q.question_id);

//       if (userAnswer) {
//         if (userAnswer.selected_option === q.correct_option) correct++;
//         else wrong++;
//       }
//     }

//     const total = questions.rowCount;
//     const percentage = ((correct / total) * 100).toFixed(2);
//     const finalStatus = percentage >= 50 ? "Pass" : "Fail";

//     // Insert result
//     const result = await pool.query(
//       `INSERT INTO ai_quiz_result 
//        (quiz_id, user_id, total_correct, total_wrong, percentage, status)
//        VALUES ($1,$2,$3,$4,$5,$6)
//        RETURNING result_id`,
//       [quiz_id, user_id, correct, wrong, percentage, finalStatus]
//     );

//     res.json({
//       success: true,
//       quiz_id,
//       result_id: result.rows[0].result_id,
//       total_questions: total,
//       correct,
//       wrong,
//       percentage,
//       status: finalStatus
//     });

//   } catch (err) {
//     console.error("ERROR submitting quiz:", err);
//     res.status(500).json({ error: err.message });
//   }
// });


// /*
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
//    2️⃣ GET QUIZ RESULT BY QUIZ ID
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// */
// router.get("/quiz/result/:quiz_id", async (req, res) => {
//   try {
//     const { quiz_id } = req.params;

//     const result = await pool.query(
//       `SELECT * FROM ai_quiz_result 
//        WHERE quiz_id=$1 AND deleted_at IS NULL
//        ORDER BY result_id DESC LIMIT 1`,
//       [quiz_id]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Result not found.",
//       });
//     }

//     res.json({
//       success: true,
//       result: result.rows[0]
//     });

//   } catch (err) {
//     console.error("GET RESULT ERROR:", err);
//     res.status(500).json({ error: err.message });
//   }
// });


// module.exports = router;




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
   1️⃣ SUBMIT QUIZ ANSWERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
router.post("/quiz/submit", async (req, res) => {
  try {
    const { quiz_id, user_id, answers } = req.body;

    if (!quiz_id || !user_id || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: "quiz_id, user_id, and answers[] required",
      });
    }

    const questions = await pool.query(
      `SELECT question_id, correct_option 
       FROM ai_quiz_questions 
       WHERE quiz_id=$1 AND deleted_at IS NULL`,
      [quiz_id]
    );

    if (questions.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Quiz not found" });
    }

    let correct = 0;
    let wrong = 0;

    for (const q of questions.rows) {
      const userAnswer = answers.find(a => a.question_id === q.question_id);

      if (userAnswer) {
        if (userAnswer.selected_option === q.correct_option) correct++;
        else wrong++;
      }
    }

    const total = questions.rowCount;
    const percentage = ((correct / total) * 100).toFixed(2);
    const finalStatus = percentage >= 50 ? "Pass" : "Fail";

    const result = await pool.query(
      `INSERT INTO ai_quiz_result 
       (quiz_id, user_id, total_correct, total_wrong, percentage, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING result_id`,
      [quiz_id, user_id, correct, wrong, percentage, finalStatus]
    );

    return res.json({
      success: true,
      quiz_id,
      result_id: result.rows[0].result_id,
      total_questions: total,
      correct,
      wrong,
      percentage,
      status: finalStatus
    });

  } catch (err) {
    console.error("ERROR submitting quiz:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error. Please try again later."
    });
  }
});


/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2️⃣ GET QUIZ RESULT BY QUIZ ID
━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
router.get("/quiz/result/:quiz_id", async (req, res) => {
  try {
    const { quiz_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM ai_quiz_result 
       WHERE quiz_id=$1 AND deleted_at IS NULL
       ORDER BY result_id DESC LIMIT 1`,
      [quiz_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Result not found.",
      });
    }

    return res.json({
      success: true,
      result: result.rows[0]
    });

  } catch (err) {
    console.error("GET RESULT ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error. Please try again later."
    });
  }
});

module.exports = router;
