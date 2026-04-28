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

router.post('/signup', authController.signup);
router.post('/login', authController.login);

// =========================
//   AUTH MIDDLEWARE (USER)
// =========================
const requireUserAuth = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

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

  if (!record) {
    return res.status(400).json({ msg: "OTP not found" });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ msg: "OTP expired" });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ msg: "Invalid OTP" });
  }

  otpStore.delete(email);

  // 🔥 FIND OR CREATE USER
  let user = await User.findOne({ email });

  if (!user) {
    user = new User({
      name: email.split('@')[0],
      email,
      mobile: '',
      password: 'otp_user',
      role: 'user'
    });
    await user.save();
  }

  // 🔥 GENERATE TOKEN
  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  // ✅ FINAL RESPONSE
  res.json({
    message: "OTP verified",
    token,
    role: user.role,
    name: user.name
  });
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
      _id: user._id,
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



// ================= UPDATE PROFILE =================
router.put("/update", async (req, res) => {
  try {

    const authHeader = req.header("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { name, email, mobile, password } = req.body;

    const updateData = {
      name,
      email,
      mobile
    };

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      updateData,
      { new: true }
    ).select("-password");

    res.json(updatedUser);

  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Profile update failed" });
  }
});

/* =========================
   UPGRADE TO RESEARCHER
========================= */
router.post("/upgrade-to-researcher", requireUserAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Admins cannot upgrade via this route" });
    }

    if (user.role === "researcher") {
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.json({
        message: "Already a researcher",
        token,
        role: user.role,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile
        }
      });
    }

    user.role = "researcher";
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Upgraded to researcher",
      token,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile
      }
    });

  } catch (err) {
    console.error("UPGRADE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
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
