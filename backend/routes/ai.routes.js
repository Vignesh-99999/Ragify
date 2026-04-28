const express = require('express');
const router = express.Router();

const aiController = require('../controllers/aiaassistantController');

// ✅ ADD THIS LINE (VERY IMPORTANT)
router.post('/summarize', aiController.summarize);

module.exports = router;