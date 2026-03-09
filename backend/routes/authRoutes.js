const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const verifyAdmin = require("../middleware/auth");
const passport = require('passport');



// 🔥 THIS LINE WAS MISSING OR WRONG
const authController = require('../controllers/authController');

// Temporary OTP storage (in-memory)
const otpStore = new Map();




// TEST ROUTE (VERY IMPORTANT)
router.get("/test", (req, res) => {
  res.send("Auth route working");
});

/* =========================
   EMAIL CONFIG
========================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* =========================
   SIGNUP
========================= */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, mobile, password, confirmPassword } = req.body;

    // Password match check
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Mobile validation
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: 'Mobile number must be exactly 10 digits' });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      password
    });

    await user.save();

    res.status(201).json({ message: 'Signup successful' });

  } catch (error) {
    console.error('SIGNUP ERROR 👉', error);

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Server error' });
  }
});


/* =========================
   LOGIN WITH PASSWORD
========================= */
// router.post("/login", async (req, res) => {
//   console.log('LOGIN ROUTE HIT');
//     try {
//       const { email, password } = req.body;

//       const user = await User.findOne({ email });
//       if (!user)
//         return res.status(400).json({ message: "Invalid credentials" });

//       const isMatch = await bcrypt.compare(password, user.password);
//       if (!isMatch)
//         return res.status(400).json({ message: "Invalid credentials" });

//       const token = jwt.sign(
//         { id: user._id, role: user.role },
//         process.env.JWT_SECRET,
//         { expiresIn: "1d" }
//       );

//       res.json({
//         token,
//         role: user.role
//       });

//     } catch (err) {
//       res.status(500).json({ message: "Server error" });
//     }
//   });
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// ================= SEND EMAIL OTP =================
router.post("/send-email-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Login OTP",
      text: `Your OTP is ${otp}`
    });

    res.json({ msg: "OTP sent to email" });

  } catch (err) {
    console.error("EMAIL OTP ERROR:", err);
    res.status(500).json({ msg: "Failed to send OTP" });
  }
});

// ================= VERIFY EMAIL OTP =================
router.post("/verify-email-otp", async (req, res) => {
  const { email, otp } = req.body;

  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ msg: "OTP not found" });

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ msg: "OTP expired" });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ msg: "Invalid OTP" });
  }

  otpStore.delete(email);
  res.json({ msg: "OTP verified" });
});

// ================= CURRENT USER =================
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("name email mobile role");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    });
  } catch (err) {
    console.error("ME ROUTE ERROR:", err);
    res.status(401).json({ message: "Invalid token" });
  }
});

//---------------Admin Dashbord---------------
router.get("/admin/dashboard", verifyAdmin, (req, res) => {
  res.json({ message: "Welcome Admin Dashboard" });
});




//-----------------Google icon Login-----------------

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.redirect(`http://localhost:4200/google-success?token=${token}`);
  }
);




module.exports = router;
