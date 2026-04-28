  const express = require('express');
  const router = express.Router();
  const { adminLogin } = require('../controllers/adminController');
  const User = require('../models/User');
  const adminController = require('../controllers/adminController');

  router.post('/login', adminLogin);

  // 📊 TOTAL USERS COUNT
  router.get("/users/count", async (req, res) => {
    try {
      const count = await User.countDocuments({ role: "user" });
      res.json({ totalUsers: count });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  router.get('/researchers/count', adminController.getResearcherCount);
  router.get('/researchers', adminController.getResearchers);

  router.get('/analytics', adminController.getAnalytics);



  /* 🔹 GET ALL USERS */
  router.get('/users', async (req, res) => {
    try {
      const users = await User.find({ role: 'user' }).select('-password');
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  /* 🔹 BAN / UNBAN USER */
  router.patch('/users/:id/ban', async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.isBanned = !user.isBanned; // toggle ban
      await user.save();

      res.json({ message: 'User status updated', isBanned: user.isBanned });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  /* 🔹 SUSPEND / UNSUSPEND USER */
  router.patch('/users/:id/suspend', async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.isSuspended = !user.isSuspended; // toggle suspend
      await user.save();

      res.json({
        message: 'User suspension updated',
        isSuspended: user.isSuspended
      });

    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });



  module.exports = router;
