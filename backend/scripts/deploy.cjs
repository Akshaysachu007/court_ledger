const hre = require("hardhat");
const { ethers } = require("ethers");


async function main() {
  const { deployments, ethers, network } = hre;
  const { save } = deployments;
  

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  console.log("Wallet address:", wallet.address);

  console.log(`Starting deployment to ${network.name}...`);

  const EvidenceStorage = await ethers.getContractFactory("EvidenceStorage");
  const evidenceStorage = await EvidenceStorage.deploy();
  await evidenceStorage.waitForDeployment();

  const address = await evidenceStorage.getAddress();
  console.log(`✅ EvidenceStorage deployed to: ${address}`);

  // Correct ABI extraction
  const abiJson = JSON.parse(EvidenceStorage.interface.formatJson());

  // This saves the deployment info to ./deployments/sepolia/EvidenceStorage.json
  await save("EvidenceStorage", {
    address: address,
    abi: abiJson,
  });

  console.log(`📝 Deployment info saved to ./deployments/${network.name}/EvidenceStorage.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});