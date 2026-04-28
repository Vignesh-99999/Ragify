const Chat = require('../models/AIUsage');
const { getSummary } = require('../services/ai.service');

exports.summarize = async (req, res) => {
  try {

    const { userId, text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const summary = await getSummary(text);

    await new Chat({
      userId,
      userMessage: text,
      aiResponse: summary,
      action: "SUMMARIZE"
    }).save();


  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Summarize failed" });
  }
};