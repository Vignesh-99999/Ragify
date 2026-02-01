const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/* ================= SIGNUP ================= */
exports.signup = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = new User({
      name,
      email,
      mobile,
      password: hashedPassword
    });

    // save user
    await user.save();

    return res.status(201).json({ msg: 'Signup successful' });

  } catch (error) {
    console.error(error);

    // ✅ DUPLICATE KEY ERROR (email or phone)
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        return res.status(400).json({ msg: 'Email already exists' });
      }
      if (error.keyPattern.mobile) {
        return res.status(400).json({ msg: 'Phone number already exists' });
      }
    }

    return res.status(500).json({ msg: 'Internal Server Error' });
  }
};

/* ================= SIGNUP ================= */
exports.signup = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      mobile,
      password: hashedPassword
    });

    await user.save();
    return res.status(201).json({ msg: 'Signup successful' });

  } catch (error) {
    // optional: only log errors to a file, not CMD
    if (error.code === 11000) {
      if (error.keyPattern.email) return res.status(400).json({ msg: 'Email already exists' });
      if (error.keyPattern.mobile) return res.status(400).json({ msg: 'Phone number already exists' });
    }
    return res.status(500).json({ msg: 'Internal Server Error' });
  }
};





/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    console.log('LOGIN BODY:', req.body);

    const { mobile, password } = req.body;

    const cleanMobile = String(mobile).trim();
    console.log('CLEAN MOBILE:', cleanMobile);

    const user = await User.findOne({
      mobile: cleanMobile,
      role: 'user'
    }).select('+password');

    console.log('USER FROM DB:', user); // 🔥 ADD THIS

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
    console.log('PASSWORD MATCH:', isMatch); // 🔥 ADD THIS

    if (!isMatch) {
      console.log('PASSWORD MISMATCH');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      role: 'user'
    });

  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
