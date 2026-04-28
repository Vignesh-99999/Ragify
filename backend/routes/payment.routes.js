const express = require('express');
const router = express.Router();

// Import functions correctly
const {
  createCheckoutSession,
  paymentSuccess
} = require('../controllers/payment.controller');

// Use functions directly
router.post('/create-checkout-session', createCheckoutSession);
router.post('/payment-success', paymentSuccess);

module.exports = router;