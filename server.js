const dotenv = require("dotenv");
dotenv.config(); 

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// ===== Signup Route =====
app.post("/api/signup", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.json({ success: false, message: "All fields required" });

  const checkUser = "SELECT * FROM users WHERE email = ?";
  db.query(checkUser, [email], (err, result) => {
    if (err) return res.json({ success: false, message: "DB error" });
    if (result.length > 0)
      return res.json({ success: false, message: "Email already registered" });

    const insert = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    db.query(insert, [name, email, password], (err2) => {
      if (err2) return res.json({ success: false, message: "Signup failed" });
      res.json({ success: true, message: "Account created successfully" });
    });
  });
});

// ===== Login Route =====
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.json({ success: false, message: "Missing credentials" });

  const query = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(query, [email, password], (err, result) => {
    if (err) return res.json({ success: false, message: "Server error" });
    if (result.length === 0)
      return res.json({ success: false, message: "Invalid credentials" });

    const user = result[0];
    res.json({
      success: true,
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email },
    });
  });
});
app.post("/api/wishlist/add", (req, res) => {
  const { user_id, trip_name } = req.body;
  if (!user_id || !trip_name) {
    return res.json({
      success: false,
      message: "Missing user_id or trip_name",
    });
  }

  const sql = `INSERT INTO wishlist (user_id, trip_name, added_at) VALUES (?, ?, NOW())`;
  db.query(sql, [user_id, trip_name], (err, result) => {
    if (err) {
      console.error("Wishlist insert error:", err);
      return res.json({ success: false, message: "Database insert failed." });
    }
    res.json({
      success: true,
      message: "Added to wishlist",
      insertId: result.insertId,
    });
  });
});



app.get("/api/wishlist/:userId", (req, res) => {
  const userId = req.params.userId;
  const sql = `SELECT id, trip_name, added_at FROM wishlist WHERE user_id = ? ORDER BY added_at DESC`;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Wishlist fetch error:", err);
      return res.json({ success: false, message: "Failed to fetch wishlist." });
    }
    res.json({ success: true, data: results });
  });
});


app.post("/api/bookings/add", (req, res) => {
  const { user_id, trip_name, price, date, meta } = req.body;

  if (!user_id || !trip_name || !price || !date) {
    return res.json({ success: false, message: "Missing required fields" });
  }

  const travellers = meta?.travellers || 1;
  const txnId = meta?.txnId || "TXN" + Date.now();

  // Correct columns and values based on your table schema
  const sql = `
    INSERT INTO bookings 
    (user_id, trip_name, travel_date, travellers, amount, txn_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;

  db.query(
    sql,
    [user_id, trip_name, date, travellers, price, txnId],
    (err, result) => {
      if (err) {
        console.error("Bookings insert error:", err.sqlMessage);
        return res.json({
          success: false,
          message: "Database insert failed.",
          error: err.sqlMessage,
        });
      }

      console.log("Booking inserted successfully with ID:", result.insertId);
      return res.json({
        success: true,
        message: "Booking saved successfully.",
        bookingId: result.insertId,
        txnId,
      });
    }
  );
});

// Get bookings for a user
app.get("/api/bookings/:userId", (req, res) => {
  const userId = req.params.userId;
  const sql = `
    SELECT id,
           trip_name,
           travel_date AS date,
           travellers,
           amount,
           txn_id
    FROM bookings
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Bookings fetch error:", err.sqlMessage || err);
      return res.json({ success: false, message: "Failed to fetch bookings." });
    }
    return res.json({ success: true, data: results });
  });
});

/**
 * === Profile Endpoint Example ===
 */
app.get("/api/profile/:userId", (req, res) => {
  const userId = req.params.userId;
  const sql = `SELECT id, name, email FROM users WHERE id = ?`;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Profile fetch error:", err);
      return res.json({ success: false, message: "Failed to fetch profile." });
    }
    if (results.length === 0) {
      return res.json({ success: false, message: "User not found." });
    }
    const user = results[0];
    return res.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email },
    });
  });
});
// ===== Start Server =====
app.listen(process.env.PORT, () => {
  console.log(` Server running on http://localhost:${process.env.PORT}`);
});
