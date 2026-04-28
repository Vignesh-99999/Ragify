const mongoose = require('mongoose');

const chatbotSchema = new mongoose.Schema({
  userId: String,
  category: String
}, { timestamps: true });

module.exports = mongoose.model('Chatbot', chatbotSchema);