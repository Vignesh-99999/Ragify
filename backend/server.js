const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
require("dotenv").config();

// ================= APP INIT =================
const app = express();

// ================= PASSPORT =================
require("./passport");

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(passport.initialize());

// ================= DATABASE =================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.error("MongoDB connection error ❌", err));

// ================= ROUTES =================
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/forgot-password", forgotPasswordRoutes);

console.log("Forgot password routes loaded ✅");

// ================= OPTIONAL PHONE OTP =================
const OTP_STORE = {};

app.post("/api/send-otp", (req, res) => {
  const { phone } = req.body;

  if (!phone || phone.length !== 10) {
    return res.status(400).json({ msg: "Valid phone number required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  OTP_STORE[phone] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000
  };

  console.log("OTP GENERATED:", otp, "FOR", phone);
  res.json({ msg: "OTP sent successfully" });
});

// ================= GOOGLE OAUTH =================
app.get(
  "/api/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:4200/login"
  }),
  (req, res) => {
    const jwt = require("jsonwebtoken");

    const token = jwt.sign(
      { id: req.user._id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.redirect(
      `http://localhost:4200/google-success?token=${token}`
    );
  }
);

// ================= SERVER =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ✅`);
});
