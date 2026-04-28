const express = require('express');
const router = express.Router();
const videoController = require('../controllers/video.controller');

router.post('/analyze', videoController.analyzeVideo);

module.exports = router;