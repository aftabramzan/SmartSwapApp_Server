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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
