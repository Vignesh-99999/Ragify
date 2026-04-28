const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  userId: String,
  youtubeUrl: String
}, { timestamps: true });

// ✅ FIX: Prevent overwrite error
module.exports = mongoose.models.Video || mongoose.model('Video', videoSchema);