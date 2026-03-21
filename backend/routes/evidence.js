const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const fs = require("fs");
const pinata = require("../config/pinata");
const Evidence = require("../models/Evidence");
const upload = require("../middleware/upload");
const contract = require("../config/blockchain");
const Case = require("../models/Case");

const deleteFileIfExists = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// 1. Upload Evidence
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }

  const filePath = req.file.path;

  try {
    const { caseId, uploadedBy, description } = req.body;

    if (!uploadedBy) {
      deleteFileIfExists(filePath);
      return res.status(400).json({ error: "uploadedBy is required" });
    }

    // ✅ CHECK CASE STATUS BEFORE UPLOAD
    const caseData = await Case.findById(caseId);

    if (!caseData) {
      deleteFileIfExists(filePath);
      return res.status(404).json({ error: "Case not found" });
    }

    // Evidence requests can be submitted only for judge-approved cases.
    if (caseData.status !== "approved") {
      deleteFileIfExists(filePath);
      return res.status(403).json({
        error: "Evidence request allowed only after case approval"
      });
    }

    // Save as pending. Judge approval will finalize IPFS + blockchain upload.
    const evidence = new Evidence({
      caseId: caseId.toString(),
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      description: (description || "").trim(),
      tempFilePath: filePath,
      uploadedBy,
      status: "pending_approval"
    });

    await evidence.save();

    res.json({
      message: "Evidence submitted for judge approval",
      evidenceId: evidence._id,
      status: evidence.status
    });

  } catch (error) {
    deleteFileIfExists(filePath);
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
    const includeAll = req.query.includeAll === "true";
    const filter = { caseId: caseId.toString() };

    if (!includeAll) {
      filter.status = "approved";
    }

    const evidence = await Evidence.find(filter).sort({ uploadedAt: -1 });
    res.json(evidence || []);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 3. Fetch Pending Evidence Requests for Judge
router.get("/pending/judge/:judgeId", async (req, res) => {
  try {
    const { judgeId } = req.params;

    const assignedCases = await Case.find({ assignedJudge: judgeId })
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    const caseMap = new Map();
    const caseIdList = [];

    assignedCases.forEach((c) => {
      const id = c._id.toString();
      caseMap.set(id, c);
      caseIdList.push(id);
    });

    const pendingEvidence = await Evidence.find({
      status: "pending_approval",
      caseId: { $in: caseIdList }
    }).sort({ uploadedAt: -1 });

    const payload = pendingEvidence.map((e) => {
      const caseData = caseMap.get(e.caseId);
      return {
        _id: e._id,
        caseId: e.caseId,
        fileName: e.fileName,
        fileSize: e.fileSize,
        mimeType: e.mimeType,
        description: e.description,
        uploadedBy: e.uploadedBy,
        uploadedAt: e.uploadedAt,
        status: e.status,
        caseDetails: caseData
          ? {
              _id: caseData._id,
              caseNumber: caseData.caseNumber,
              title: caseData.title,
              description: caseData.description,
              status: caseData.status,
              createdBy: caseData.createdBy,
              createdAt: caseData.createdAt,
              updatedAt: caseData.updatedAt
            }
          : null
      };
    });

    res.json(payload);
  } catch (error) {
    console.error("Pending evidence fetch error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 4. Fetch Evidence Requests for Clerk
router.get("/requests/clerk/:clerkId", async (req, res) => {
  try {
    const { clerkId } = req.params;

    const requests = await Evidence.find({ uploadedBy: clerkId })
      .sort({ uploadedAt: -1 });

    const caseIds = [...new Set(requests.map((item) => item.caseId))];
    const relatedCases = await Case.find({ _id: { $in: caseIds } });
    const caseMap = new Map(relatedCases.map((c) => [c._id.toString(), c]));

    const payload = requests.map((item) => {
      const caseData = caseMap.get(item.caseId);
      return {
        _id: item._id,
        caseId: item.caseId,
        fileName: item.fileName,
        fileSize: item.fileSize,
        mimeType: item.mimeType,
        description: item.description,
        status: item.status,
        uploadedAt: item.uploadedAt,
        approvedAt: item.approvedAt,
        rejectedAt: item.rejectedAt,
        rejectionReason: item.rejectionReason,
        blockchainTx: item.blockchainTx,
        ipfsHash: item.ipfsHash,
        caseDetails: caseData
          ? {
              caseNumber: caseData.caseNumber,
              title: caseData.title,
              status: caseData.status
            }
          : null
      };
    });

    res.json(payload);
  } catch (error) {
    console.error("Clerk evidence request fetch error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 5. Preview Pending Evidence File (Assigned Judge Only)
router.get("/preview/:evidenceId", async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { judgeId } = req.query;

    if (!judgeId) {
      return res.status(400).json({ error: "judgeId is required" });
    }

    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: "Evidence request not found" });
    }

    if (evidence.status !== "pending_approval") {
      return res.status(400).json({ error: "Only pending evidence can be previewed here" });
    }

    const caseData = await Case.findById(evidence.caseId);
    if (!caseData) {
      return res.status(404).json({ error: "Case not found for this evidence" });
    }

    if (caseData.assignedJudge.toString() !== judgeId) {
      return res.status(403).json({ error: "Only assigned judge can preview this evidence" });
    }

    if (!evidence.tempFilePath || !fs.existsSync(evidence.tempFilePath)) {
      return res.status(404).json({ error: "Temporary evidence file not found" });
    }

    res.setHeader("Content-Disposition", `inline; filename=\"${evidence.fileName}\"`);
    res.setHeader("Content-Type", evidence.mimeType || "application/octet-stream");
    return res.sendFile(evidence.tempFilePath);
  } catch (error) {
    console.error("Evidence preview error:", error);
    res.status(500).json({ error: "Preview failed", details: error.message });
  }
});

// 6. Judge Approves Evidence Request
router.put("/approve/:evidenceId", async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { judgeId } = req.body;

    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: "Evidence request not found" });
    }

    if (evidence.status !== "pending_approval") {
      return res.status(400).json({ error: "Evidence request is not pending approval" });
    }

    const caseData = await Case.findById(evidence.caseId);
    if (!caseData) {
      return res.status(404).json({ error: "Case not found for this evidence" });
    }

    if (caseData.assignedJudge.toString() !== judgeId) {
      return res.status(403).json({ error: "Only assigned judge can approve this evidence" });
    }

    if (caseData.status !== "approved") {
      return res.status(400).json({ error: "Case must be approved before evidence can be finalized" });
    }

    if (!evidence.tempFilePath || !fs.existsSync(evidence.tempFilePath)) {
      return res.status(400).json({ error: "Evidence file is missing from temporary storage" });
    }

    const fileBuffer = fs.readFileSync(evidence.tempFilePath);
    const hash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    const readableStream = fs.createReadStream(evidence.tempFilePath);
    const result = await pinata.pinFileToIPFS(readableStream, {
      pinataMetadata: { name: evidence.fileName }
    });
    const cid = result.IpfsHash;

    const tx = await contract.storeEvidence(evidence.caseId.toString(), hash, cid);
    const receipt = await tx.wait();

    const tempFilePath = evidence.tempFilePath;

    evidence.fileHash = hash;
    evidence.ipfsHash = cid;
    evidence.blockchainTx = receipt.hash;
    evidence.approvedBy = judgeId;
    evidence.approvedAt = new Date();
    evidence.status = "approved";
    evidence.tempFilePath = "";
    await evidence.save();

    deleteFileIfExists(tempFilePath);

    res.json({
      message: "Evidence approved and uploaded to blockchain",
      evidenceId: evidence._id,
      hash,
      cid,
      blockchainTx: receipt.hash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    console.error("Evidence approval error:", error);
    res.status(500).json({ error: "Approval failed", details: error.message });
  }
});

// 7. Judge Rejects Evidence Request
router.put("/reject/:evidenceId", async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { judgeId, reason } = req.body;

    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: "Evidence request not found" });
    }

    if (evidence.status !== "pending_approval") {
      return res.status(400).json({ error: "Evidence request is not pending approval" });
    }

    const caseData = await Case.findById(evidence.caseId);
    if (!caseData) {
      return res.status(404).json({ error: "Case not found for this evidence" });
    }

    if (caseData.assignedJudge.toString() !== judgeId) {
      return res.status(403).json({ error: "Only assigned judge can reject this evidence" });
    }

    deleteFileIfExists(evidence.tempFilePath);

    evidence.rejectedBy = judgeId;
    evidence.rejectedAt = new Date();
    evidence.rejectionReason = reason || "Rejected by assigned judge";
    evidence.status = "rejected";
    evidence.tempFilePath = "";
    await evidence.save();

    res.json({ message: "Evidence request rejected", evidenceId: evidence._id });
  } catch (error) {
    console.error("Evidence rejection error:", error);
    res.status(500).json({ error: "Rejection failed", details: error.message });
  }
});

// 8. Verify against Blockchain
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
      blockNumber: (e.blockNumber || e[4])?.toString(),
      blockchainTx: e.blockchainTx || "Verified On-Chain"
    }));

    res.json(timeline);

  } catch (error) {
    console.error("Blockchain Verify Error:", error);
    res.status(500).json({ error: "Blockchain connection failed" });
  }
});

module.exports = router;