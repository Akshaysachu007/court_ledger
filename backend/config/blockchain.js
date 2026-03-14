const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL
);

const wallet = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  provider
);

const contractAddress = "0x65C4817134570098236b191D4A926802B871c0a5";

const abi = [
  "function storeEvidence(string,string,string)",
  "function getEvidence(string) view returns (tuple(string fileHash,string cid,uint256 timestamp,uint256 blockNumber)[])"
];

const contract = new ethers.Contract(
  contractAddress,
  abi,
  wallet
);

module.exports = contract;