const jwt = require('jsonwebtoken');

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Hardcoded admin credentials
    if (email !== 'admin@gmail.com' || password !== 'Admin@123') {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      role: 'admin'
    });

  } catch (error) {
    console.error('ADMIN LOGIN ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
