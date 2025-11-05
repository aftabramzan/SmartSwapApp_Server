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
    console.log("🔍 Checking profile status for user:", user_id);

    // Validate user_id
    if (isNaN(user_id)) {
      return res.status(400).json({ error: "Invalid user_id" });
    }

    // Check each module separately
    const profileQuery = await pool.query(
      "SELECT profile_id FROM user_profile WHERE user_id = $1 AND (deleted_at IS NULL OR deleted_at IS NULL)",
      [user_id]
    );
    const hasProfile = profileQuery.rowCount > 0;

    let hasSkills = false;
    let hasAvailability = false;

    try {
      const skillQuery = await pool.query(
        "SELECT id FROM user_skills WHERE user_id = $1 AND (deleted_at IS NULL OR deleted_at IS NULL)",
        [user_id]
      );
      hasSkills = skillQuery.rowCount > 0;
    } catch {
      console.log("⚠️ user_skills table missing or not used.");
    }

    try {
      const availQuery = await pool.query(
        "SELECT id FROM user_availability WHERE user_id = $1 AND (deleted_at IS NULL OR deleted_at IS NULL)",
        [user_id]
      );
      hasAvailability = availQuery.rowCount > 0;
    } catch {
      console.log("⚠️ user_availability table missing or not used.");
    }

    // Final response
    res.json({
      user_id,
      has_profile: hasProfile,
      has_skills: hasSkills,
      has_availability: hasAvailability,
      next_step: !hasProfile
        ? "Create Profile"
        : !hasSkills
        ? "Select Skills"
        : !hasAvailability
        ? "Set Availability"
        : "Dashboard Unlocked",
    });
  } catch (err) {
    console.error("💥 Error fetching profile status:", err.stack || err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// ------------------------------------------- Server Start ------------------------------------------------
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
