const Video = require('../models/video');
const { processVideo } = require('../services/video.service');

exports.analyzeVideo = async (req, res) => {
  try {

    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: "URL missing" });
    }

    let result;

    // 🔥 CALL FLASK (SAFE)
    try {
      result = await processVideo(url);
      console.log("FLASK SUCCESS");
    } catch (err) {
      console.log("❌ Flask failed");
      result = { summary: "Transcript not available" };
    }

    // ✅ ALWAYS SAVE (VERY IMPORTANT)
    const savedVideo = await Video.create({
      userId: "guest",
      youtubeUrl: url
    });

    res.json({
      message: "Done",
      summary: result.summary
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};