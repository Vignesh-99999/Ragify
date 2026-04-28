const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 🔥 MODELS
const Chatbot = require('../models/Chatbot');
const Video = require('../models/Video');
const AIUsage = require('../models/AIUsage');


// ================= ADMIN LOGIN =================
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

    return res.status(200).json({
      message: 'Admin login successful',
      token,
      role: 'admin'
    });

  } catch (error) {
    console.error('ADMIN LOGIN ERROR:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// ================= RESEARCHER COUNT =================
exports.getResearcherCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'researcher' });

    return res.status(200).json({ count });

  } catch (error) {
    console.error('RESEARCHER COUNT ERROR:', error);
    return res.status(500).json({ message: error.message });
  }
};


// ================= GET ALL RESEARCHERS =================
exports.getResearchers = async (req, res) => {
  try {
    const researchers = await User.find({ role: 'researcher' })
      .select('name email isActive subscriptionType');

    return res.status(200).json(researchers);

  } catch (error) {
    console.error('GET RESEARCHERS ERROR:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// ================= 🔥 ANALYTICS DASHBOARD =================
exports.getAnalytics = async (req, res) => {
  try {

    // 👤 USER STATS
    const totalUsers = await User.countDocuments();
    const totalResearchers = await User.countDocuments({ role: 'researcher' });

    // 📊 FEATURE USAGE STATS
    const chatbotCount = await Chatbot.countDocuments({});
    const videoCount = await Video.countDocuments({});
    const aiCount = await AIUsage.countDocuments({});

    // 📚 CHATBOT CATEGORY STATS
    const mcqCount = await Chatbot.countDocuments({ category: 'mcq' });
    const flashcardCount = await Chatbot.countDocuments({ category: 'flashcard' });
    const summaryCount = await Chatbot.countDocuments({ category: 'summary' });
    const qaCount = await Chatbot.countDocuments({ category: 'qa' });

    // 🔍 DEBUG LOGS (VERY IMPORTANT FOR YOU)
    console.log("📊 ANALYTICS DATA:");
    console.log("Users:", totalUsers);
    console.log("Researchers:", totalResearchers);
    console.log("Videos:", videoCount);

    return res.status(200).json({
      totalUsers,
      totalResearchers,
      chatbotCount,
      videoCount,
      aiCount,
      mcqCount,
      flashcardCount,
      summaryCount,
      qaCount
    });

  } catch (error) {
    console.error('ANALYTICS ERROR:', error);
    return res.status(500).json({ message: error.message });
  }
};