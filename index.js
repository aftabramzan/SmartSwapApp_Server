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
// ---------------------------------------------- SignUp--------------------------------------------
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
    console.error("Error inserting user:", error);
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

    // Check if user exists
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    // Match password (plain comparison for now)
    if (user.password_hash !== password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
 res.status(200).json({
      success: true,
      message: "✅ Login successful!",
      userId: user.user_id
    });
    
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});
// --------------------------------------------Create Profile---------------------------------------------
app.post('/api/profiles', async (req, res) => {
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
            status
        } = req.body;

        // Validate required fields
        if (!user_id || !full_name || !class_level || !stream) {
            return res.status(400).json({ error: 'user_id, full_name, class_level, and stream are required.' });
        }

        // Insert into user_profile
        const query = `
            INSERT INTO user_profile
            (user_id, full_name, class_level, stream, bio, phone_no, address, profile_image_url, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,0))
            RETURNING *;
        `;

        const values = [user_id, full_name, class_level, stream, bio || null, phone_no || null, address || null, profile_image_url || null, status];

        const result = await pool.query(query, values);

        // Respond with success message + profile data
        res.status(201).json({ 
            message: 'Profile created successfully',
            create_profile: result.rows[0] 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
