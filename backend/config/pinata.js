require('dotenv').config();
const pinataSDK = require("@pinata/sdk");

// Use environment variables instead of hardcoded strings
const pinata = new pinataSDK(
  process.env.PINATA_KEY, 
  process.env.PINATA_SECRET
);

module.exports = pinata;