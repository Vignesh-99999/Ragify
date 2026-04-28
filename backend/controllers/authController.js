const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/* ================= SIGNUP ================= */
exports.signup = async (req, res) => {
  try {

    let { name, email, mobile, password } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "Mobile is required" });
    }

    mobile = String(mobile).replace(/\s+/g, '').trim();


    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: "Mobile must be 10 digits" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "EMAIL_EXISTS" });
    }

    const existingMobile = await User.findOne({ mobile });
    if (existingMobile) {
      return res.status(400).json({ message: "MOBILE_EXISTS" });
    }

    const user = new User({
      name,
      email,
      mobile,
      password
    });

    await user.save();

    res.status(201).json({ message: "Signup successful" });

  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const cleanMobile = String(mobile).trim();
   
    // Allow both students (user) and researchers to log in, but not admins here
    const user = await User.findOne({
      mobile: cleanMobile,
      role: { $ne: 'admin' }
    }).select('+password');

    if (!user) {
      console.log('USER NOT FOUND');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

     // 🚫 BLOCK BANNED USERS
    if (user.isBanned) {
      return res.status(403).json({
        message: 'Your account has been banned. Contact admin.'
      });
    }

    // ⏸ BLOCK SUSPENDED USERS
    if (user.isSuspended === true) {
      return res.status(403).json({
        message: 'Your account has been suspended. Try again later.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log('PASSWORD MISMATCH');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile
      }
    });

  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
