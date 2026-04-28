const axios = require('axios');

exports.processVideo = async (url) => {
    try {
        const response = await axios.post('http://localhost:5001/analyze', {
            url: url
        });

        return response.data;

    } catch (error) {
        console.error("Flask API Error:", error.message);

        // If Flask sends error response
        if (error.response) {
            console.error("Flask Response Error:", error.response.data);
            throw error.response.data;
        }

        throw "Failed to process video";
    }
};