require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy"); 
require("dotenv").config(); // Load variables from .env

module.exports = {
  solidity: "0.8.20",
  networks: {
    // Local Ganache (Keep this for local testing)
    localhost: {
      url: "http://127.0.0.1:7545",
    },
    // Ethereum Sepolia (New live network)
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};