const mongoose = require('mongoose');

const aiUsageSchema = new mongoose.Schema({
  userId: String,
  userMessage: String,
  aiResponse: String,
  action: String
}, { timestamps: true });

module.exports = mongoose.model('AIUsage', aiUsageSchema);