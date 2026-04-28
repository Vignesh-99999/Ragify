const dns = require('dns'); // Import the built-in DNS module
dns.setDefaultResultOrder('ipv4first'); // Force IPv4 to bypass DNS SRV issues

require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check if URI exists before trying to connect
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from your .env file!");
    }

    console.log("Attempting to connect to MongoDB Atlas...");
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
    });

    console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n❌ Connection Error!`);
    console.error(`Type: ${error.name}`);
    console.error(`Code: ${error.code || 'N/A'}`);
    console.error(`Message: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log("\n💡 POSSIBLE FIXES:");
      console.log("1. Go to Atlas > Network Access > Add '0.0.0.0/0' (Allow All).");
      console.log("2. Your ISP/Firewall might be blocking Port 27017.");
    }
    process.exit(1);
  }
};

connectDB();