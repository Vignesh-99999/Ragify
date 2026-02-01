const express = require('express');
const router = express.Router();
const forgotPasswordController = require('../controllers/forgotPasswordController');

router.post('/send-otp', forgotPasswordController.sendPasswordResetOtp);
router.post('/verify-otp', forgotPasswordController.verifyPasswordResetOtp);
router.post('/reset', forgotPasswordController.resetPassword);

module.exports = router;
