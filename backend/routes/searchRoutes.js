const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");

const router = express.Router();

router.get("/", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    const url = `http://export.arxiv.org/api/query?search_query=all:${query}&start=0&max_results=10`;

    const response = await axios.get(url);

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);

    const entries = result.feed.entry || [];

    const papers = entries.map((entry) => {
      const id = entry.id[0];

      return {
        title: entry.title[0].trim(),
        authors: entry.author.map(a => a.name[0]).join(", "),
        year: entry.published[0].substring(0, 4),
        abstract: entry.summary[0].trim(),
        link: id,
        pdf: id.replace("abs", "pdf") + ".pdf"
      };
    });

    res.json({ results: papers });

  } catch (err) {
    console.error("arXiv error:", err.message);
    res.status(500).json({ error: "Failed to fetch papers" });
  }
});

module.exports = router;