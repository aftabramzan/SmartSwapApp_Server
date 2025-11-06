import express from "express";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ---------------------------------------------- Root Check --------------------------------------------
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "✅ Connected successfully!",
      database_time: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      status: "❌ Connection failed",
      error: err.message,
    });
  }
});

// ---------------------------------------------- SignUp --------------------------------------------
app.post("/api/users", async (req, res) => {
  try {
    const { email, username, password_hash, role } = req.body;

    if (!email || !username || !password_hash) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const query = `
      INSERT INTO users (email, username, password_hash, role)
      VALUES ($1, $2, $3, COALESCE($4, 0))
      RETURNING *;
    `;
    const values = [email, username, password_hash, role];
    const result = await pool.query(query, values);

    res.status(201).json({
      message: "✅ User created successfully!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error inserting user:", error.message);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// ---------------------------------------------- Login --------------------------------------------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password_hash } = req.body;

    if (!email || !password_hash) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    if (user.password_hash !== password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.status(200).json({
      success: true,
      message: "✅ Login successful!",
      userId: user.user_id,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// -------------------------------------------- Create Profile ---------------------------------------------
app.post("/api/profiles", async (req, res) => {
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
      return res.status(400).json({ error: "user_id, full_name, class_level, and stream are required." });
    }

    // ⚠️ stream fix: only allow 0 or 1
    const safeStream = [0, 1].includes(Number(stream)) ? Number(stream) : 0;

    const query = `
      INSERT INTO user_profile
      (user_id, full_name, class_level, stream, bio, phone_no, address, profile_image_url, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,0))
      RETURNING *;
    `;
    const values = [user_id, full_name, class_level, safeStream, bio || null, phone_no || null, address || null, profile_image_url || null, status];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: "✅ Profile created successfully",
      create_profile: result.rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      // Duplicate user_id
      return res.status(400).json({ error: "Profile already exists for this user." });
    }
    if (err.code === "23514") {
      // Stream constraint failed
      return res.status(400).json({ error: "Invalid stream value. Must be 0 (Pre-Medical) or 1 (Pre-Engineering)." });
    }

    console.error("Profile creation error:", err.message);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// ------------------------------------------------ PROFILE STATUS ------------------------------------------------
app.get("/api/profile/status/:user_id", async (req, res) => {
  try {
    const user_id = parseInt(req.params.user_id);
    console.log("🔍 Checking profile + quiz status for user:", user_id);

    if (isNaN(user_id)) {
      return res.status(400).json({ error: "Invalid user_id" });
    }

    // ✅ Check profile
    const profileQuery = await pool.query(
      "SELECT profile_id FROM user_profile WHERE user_id = $1 AND deleted_at IS NULL",
      [user_id]
    );
    const hasProfile = profileQuery.rowCount > 0;
    const profileId = hasProfile ? profileQuery.rows[0].profile_id : null;

    // ✅ Check subjects
    let hasSkills = false;
    if (profileId) {
      const skillQuery = await pool.query(
        "SELECT subject_id FROM user_subjects WHERE profile_id = $1 AND deleted_at IS NULL",
        [profileId]
      );
      hasSkills = skillQuery.rowCount > 0;
    }

    // ✅ Check availability
    let hasAvailability = false;
    if (profileId) {
      const availQuery = await pool.query(
        "SELECT availability_id FROM user_availability WHERE profile_id = $1 AND deleted_at IS NULL",
        [profileId]
      );
      hasAvailability = availQuery.rowCount > 0;
    }

    // ✅ Check if quiz is completed for all subjects
    let allQuizzesCompleted = false;
    if (profileId && hasSkills) {
      const quizQuery = await pool.query(
        `
        SELECT COUNT(*) AS total, 
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM ai_quiz_meta 
        WHERE user_id = $1 AND deleted_at IS NULL
        `,
        [user_id]
      );

      const total = parseInt(quizQuery.rows[0].total || 0);
      const completed = parseInt(quizQuery.rows[0].completed || 0);
      allQuizzesCompleted = total > 0 && total === completed;
    }

    // ✅ Determine Next Step
    const nextStep = !hasProfile
      ? "Create Profile"
      : !hasSkills
      ? "Select Skills"
      : !hasAvailability
      ? "Set Availability"
      : !allQuizzesCompleted
      ? "Start Quiz"
      : "Dashboard Unlocked";

    res.json({
      user_id,
      profile_id: profileId,
      has_profile: hasProfile,
      has_skills: hasSkills,
      has_availability: hasAvailability,
      quiz_completed: allQuizzesCompleted,
      next_step: nextStep,
    });
  } catch (err) {
    console.error("💥 Error checking profile status:", err.stack || err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});


//---------------------------------------------Subject Selection-------------------------------------------
// ================== SUBJECTS API ==================

// ✅ 1. Master subjects list (for spinner dropdowns)
app.get("/api/subjects/master", async (req, res) => {
  try {
    const subjects = [
      "Mathematics", "Physics", "Chemistry", "Biology",
      "Computer Science", "English", "Urdu", "Islamic Studies",
      "Economics", "Accounting", "Programming", "AI Fundamentals"
    ];
    res.json({ success: true, subjects });
  } catch (err) {
    console.error("Error fetching master subjects:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


// ✅ 2. Save or update subjects for a profile
app.post("/api/subjects", async (req, res) => {
  try {
    const { profile_id, teachSubjects, learnSubjects } = req.body;

    if (!profile_id)
      return res.status(400).json({ error: "profile_id is required" });

    // Convert arrays safely
    const teachArr = Array.isArray(teachSubjects) ? teachSubjects : [];
    const learnArr = Array.isArray(learnSubjects) ? learnSubjects : [];

    // Remove existing subjects (soft delete)
    await pool.query(
      "UPDATE user_subjects SET deleted_at = NOW() WHERE profile_id = $1 AND deleted_at IS NULL",
      [profile_id]
    );

    // Insert new Teach subjects
    for (const sub of teachArr) {
      await pool.query(
        `INSERT INTO user_subjects (profile_id, subject_name, subject_type)
         VALUES ($1, $2, 0)`,
        [profile_id, sub]
      );
    }

    // Insert new Learn subjects
    for (const sub of learnArr) {
      await pool.query(
        `INSERT INTO user_subjects (profile_id, subject_name, subject_type)
         VALUES ($1, $2, 1)`,
        [profile_id, sub]
      );
    }

    res.json({
      success: true,
      message: "Subjects saved successfully",
      total_saved: teachArr.length + learnArr.length,
    });
  } catch (err) {
    console.error("Error saving subjects:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


// ✅ 3. Get subjects by profile_id
app.get("/api/subjects/:profile_id", async (req, res) => {
  try {
    const { profile_id } = req.params;

    const result = await pool.query(
      `SELECT subject_id, subject_name, subject_type, created_at
       FROM user_subjects
       WHERE profile_id = $1 AND deleted_at IS NULL
       ORDER BY subject_type, subject_name`,
      [profile_id]
    );

    const teach = result.rows.filter(r => r.subject_type === 0);
    const learn = result.rows.filter(r => r.subject_type === 1);

    res.json({
      success: true,
      profile_id,
      teach_subjects: teach,
      learn_subjects: learn,
    });
  } catch (err) {
    console.error("Error fetching subjects:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


// ✅ 4. Soft delete a specific subject
app.delete("/api/subjects/:subject_id", async (req, res) => {
  try {
    const { subject_id } = req.params;

    const result = await pool.query(
      "UPDATE user_subjects SET deleted_at = NOW() WHERE subject_id = $1 RETURNING *",
      [subject_id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ success: false, error: "Subject not found" });

    res.json({ success: true, message: "Subject deleted successfully" });
  } catch (err) {
    console.error("Error deleting subject:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});
//--------------------------------------------User Availability------------------------------
// ✅ POST /api/availability/save
app.post("/api/availability/save", async (req, res) => {
  try {
    const { profile_id, availability } = req.body;

    // --- Basic validation ---
    if (!profile_id) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required.",
      });
    }

    if (!Array.isArray(availability) || availability.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Availability must be a non-empty array.",
      });
    }

    // ✅ Optional: Validate each slot structure
    for (const [index, slot] of availability.entries()) {
      const { day_of_week, start_time, end_time } = slot;

      if (!day_of_week || !start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: `Invalid slot at index ${index}. Required fields: day_of_week, start_time, end_time.`,
        });
      }
    }

    // ✅ Insert data into database
    const client = await pool.connect();
    await client.query("BEGIN");

    for (const slot of availability) {
      await client.query(
        `INSERT INTO user_availability (profile_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [profile_id, slot.day_of_week, slot.start_time, slot.end_time]
      );
    }

    await client.query("COMMIT");
    client.release();

    return res.status(201).json({
      success: true,
      message: "Availability saved successfully.",
    });
  } catch (error) {
    console.error("❌ Error saving availability:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
});
//--------------------------------------------Quiz Section--------------------------------------------------
// 📘 Get teachable subjects for quiz
// 📘 Get teachable subjects for quiz
app.get("/api/quiz/subjects/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query(
  `
  SELECT 
    s.subject_id, 
    s.subject_name, 
    s.subject_type, 
    s.profile_id
  FROM user_subjects s
  JOIN user_profile p ON p.profile_id = s.profile_id
  WHERE p.user_id = $1
    AND s.subject_type = 0        -- ✅ Only teachable subjects
    AND s.deleted_at IS NULL
  `,
  [user_id]
);
    console.log("Subjects fetched for user", user_id, "=>", result.rows);

    res.json({
      success: true,
      count: result.rows.length,
      subjects: result.rows,
    });
  } catch (err) {
    console.error("❌ Error fetching quiz subjects:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📘 Get all teachable subjects (subject_type = 0)
// 📘 Get teachable subjects for the logged-in user
app.get("/api/subjects/teachable/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const result = await pool.query(
      `
      SELECT 
        s.subject_id,
        s.subject_name,
        s.subject_type,
        s.profile_id,
        p.full_name,
        p.class_level,
        p.stream,
        p.bio,
        p.status
      FROM user_subjects s
      JOIN user_profile p ON s.profile_id = p.profile_id
      WHERE p.user_id = $1
        AND s.subject_type = 0         -- only teachable subjects
        AND s.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND p.status = 1               -- active profile
      ORDER BY s.subject_name ASC
      `,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No teachable subjects found for this user.",
        subjects: [],
      });
    }

    res.json({
      success: true,
      count: result.rows.length,
      subjects: result.rows,
    });
  } catch (err) {
    console.error("❌ Error fetching user's teachable subjects:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching teachable subjects.",
      error: err.message,
    });
  }
});

// ========================== 🧠 AI QUIZ GENERATOR ==========================
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🔑 Gemini API Key (replace with your actual key)
const genAI = new GoogleGenerativeAI("AIzaSyBdLuBsu79aQOrpoAI3r4RU_wxdPGB5LFQ");

// 📘 Generate AI Quiz for a given subject
app.post("/api/quiz/generate", async (req, res) => {
  try {
    const { user_id, subject_id, total_questions } = req.body;

    if (!user_id || !subject_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and subject_id are required.",
      });
    }

    // 🧩 1️⃣ Get subject name
    const subjectResult = await pool.query(
      `SELECT subject_name FROM user_subjects WHERE subject_id = $1`,
      [subject_id]
    );

    if (subjectResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    const subjectName = subjectResult.rows[0].subject_name;

    // 🧩 2️⃣ Create a quiz entry in ai_quiz_meta
    const quizMeta = await pool.query(
      `
      INSERT INTO ai_quiz_meta (user_id, subject_id, total_questions, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING quiz_id
      `,
      [user_id, subject_id, total_questions || 10]
    );

    const quiz_id = quizMeta.rows[0].quiz_id;

    // 🧩 3️⃣ Generate quiz questions using Gemini AI
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Generate ${total_questions || 10} multiple choice questions for the subject "${subjectName}".
      Each question should have 4 options (A, B, C, D) and specify the correct option letter.
      Return a JSON array like:
      [
        {
          "question_text": "What is ...?",
          "option_a": "...",
          "option_b": "...",
          "option_c": "...",
          "option_d": "...",
          "correct_option": "B"
        }
      ]
    `;

    const aiResponse = await model.generateContent(prompt);
    const text = aiResponse.response.text();

    // 🧩 4️⃣ Parse JSON safely
    let questions;
    try {
      questions = JSON.parse(text);
    } catch (err) {
      console.error("⚠️ AI returned invalid JSON:", text);
      return res.status(500).json({
        success: false,
        message: "Invalid AI response format.",
        raw: text,
      });
    }

    // 🧩 5️⃣ Insert questions into database
    for (const q of questions) {
      await pool.query(
        `
        INSERT INTO ai_quiz_questions 
        (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          quiz_id,
          q.question_text,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_option,
        ]
      );
    }

    // 🧩 6️⃣ Update quiz status
    await pool.query(
      `UPDATE ai_quiz_meta SET status = 'completed' WHERE quiz_id = $1`,
      [quiz_id]
    );

    res.json({
      success: true,
      message: "✅ Quiz generated successfully!",
      quiz_id,
      subject: subjectName,
      total_questions: questions.length,
    });
  } catch (err) {
    console.error("❌ Error generating AI quiz:", err);
    res.status(500).json({
      success: false,
      message: "Error generating AI quiz",
      error: err.message,
    });
  }
});

// ------------------------------------------- Server Start ------------------------------------------------
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
