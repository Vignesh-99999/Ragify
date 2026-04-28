const fetch = require('node-fetch');

async function getSummary(text) {
  return "Summary: " + text.substring(0, 50); // simple test
}

module.exports = { getSummary };