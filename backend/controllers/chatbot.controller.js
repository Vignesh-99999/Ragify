const Chatbot = require('../models/Chatbot');

await Chatbot.create({
  userId: req.user.id,
  category: req.body.category
});