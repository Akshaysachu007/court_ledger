const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const fs = require("fs");
const pinata = require("../config/pinata");
const Evidence = require("../models/Evidence");
const upload = require("../middleware/upload");
const contract = require("../config/blockchain");
const Case = require("../models/Case");

// 1. Upload Evidence
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }

  const filePath = req.file.path;

  try {
    const { caseId, uploadedBy } = req.body;

    // ✅ CHECK CASE STATUS BEFORE UPLOAD
    const caseData = await Case.findById(caseId);

    if (!caseData) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(404).json({ error: "Case not found" });
    }

    // Ensure status matches your Schema: "approved"
    if (caseData.status !== "approved") {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(403).json({
        error: "Evidence upload allowed only after judge approval"
      });
    }

    // READ FILE
    const fileBuffer = fs.readFileSync(filePath);

    // CREATE SHA256 HASH
    const hash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    // UPLOAD TO IPFS
    const readableStream = fs.createReadStream(filePath);

    const result = await pinata.pinFileToIPFS(readableStream, {
      pinataMetadata: { name: req.file.originalname }
    });

    const cid = result.IpfsHash;

    // STORE HASH + CID ON BLOCKCHAIN
    // Ensure caseId is passed as a string
    const tx = await contract.storeEvidence(caseId.toString(), hash, cid);

    const receipt = await tx.wait();

    // SAVE METADATA IN DATABASE
    const evidence = new Evidence({
      caseId: caseId.toString(),
      fileName: req.file.originalname,
      fileHash: hash,
      ipfsHash: cid,
      uploadedBy,
      blockchainTx: receipt.hash // or receipt.transactionHash depending on ethers version
    });

    await evidence.save();

    // DELETE TEMP FILE
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      message: "Evidence secured",
      hash,
      cid,
      blockchainTx: receipt.hash,
      blockNumber: receipt.blockNumber
    });

  } catch (error) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error("Upload Error:", error);
    res.status(500).json({
      error: "Upload Failed",
      details: error.message
    });
  }
});

// 2. Fetch Evidence for a Case
router.get("/case/:caseId", async (req, res) => {
  try {
    const { caseId } = req.params;
    const evidence = await Evidence.find({ caseId: caseId });
    res.json(evidence || []);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 3. Verify against Blockchain
router.get("/verify/:caseId", async (req, res) => {
  try {
    const { caseId } = req.params;

    // Fetch from Smart Contract
    const blockchainData = await contract.getEvidence(caseId);

    // If your contract returns a single object instead of an array:
    if (!blockchainData || !blockchainData.fileHash || blockchainData.fileHash === "") {
        // Fallback check if it returns an array
        if (!Array.isArray(blockchainData) || blockchainData.length === 0) {
            return res.status(404).json({ error: "No blockchain record found" });
        }
    }

    // Transform data for the Frontend Timeline
    // This handles both single objects and arrays
    const rawList = Array.isArray(blockchainData) ? blockchainData : [blockchainData];

    const timeline = rawList.map((e, index) => ({
      order: index + 1,
      fileHash: e.fileHash || e[1], // Handles both named properties and index returns
      cid: e.cid || e[2],
      timestamp: (e.timestamp || e[3]).toString(),
      blockchainTx: e.blockchainTx || "Verified On-Chain"
    }));

    res.json(timeline);

  } catch (error) {
    console.error("Blockchain Verify Error:", error);
    res.status(500).json({ error: "Blockchain connection failed" });
  }
});

module.exports = router;