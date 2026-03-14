const express = require("express");
const router = express.Router();
const Case = require("../models/Case");

/* 1. CREATE CASE (CLERK) */
router.post("/create", async (req, res) => {
  try {
    const { caseNumber, title, description, createdBy, assignedJudge } = req.body;

    const newCase = new Case({
      caseNumber,
      title,
      description,
      createdBy,
      assignedJudge,
      // Status must match the enum in your CaseSchema
      status: "pending_review" 
    });

    await newCase.save();

    res.json({
      message: "Case created successfully",
      case: newCase
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* 2. GET CASES CREATED BY CLERK (For Clerk Dashboard) */
router.get("/clerk/:clerkId", async (req, res) => {
  try {
    const cases = await Case.find({ createdBy: req.params.clerkId })
      .sort({ createdAt: -1 }); // Show newest cases first
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* 3. GET CASES ASSIGNED TO JUDGE (For Judge Dashboard) */
router.get("/judge/:judgeId", async (req, res) => {
  try {
    // We use .populate to get the 'name' or 'username' of the Clerk 
    // This allows the Judge Dashboard to show "Uploaded by: [Name]"
    const cases = await Case.find({ assignedJudge: req.params.judgeId })
      .populate("createdBy", "name username") 
      .sort({ createdAt: -1 });

    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* 4. CLERK TOGGLE STATUS (Active / Inactive) */
router.put("/status/:caseId", async (req, res) => {
  try {
    const { status } = req.body;
    const updatedCase = await Case.findByIdAndUpdate(
      req.params.caseId,
      { status },
      { new: true }
    );
    res.json(updatedCase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* 5. JUDGE APPROVE CASE */
router.put("/approve/:caseId", async (req, res) => {
  try {
    const { caseId } = req.params;
    const { judgeId } = req.body;

    const updatedCase = await Case.findByIdAndUpdate(
      caseId,
      {
        status: "approved",
        approvedBy: judgeId,
        approvedAt: new Date()
      },
      { new: true }
    );

    if (!updatedCase) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json({
      message: "Case approved successfully",
      case: updatedCase
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* 6. JUDGE REJECT CASE */
router.put("/reject/:caseId", async (req, res) => {
  try {
    const { caseId } = req.params;

    const updatedCase = await Case.findByIdAndUpdate(
      caseId,
      { status: "rejected" },
      { new: true }
    );

    if (!updatedCase) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json({
      message: "Case rejected successfully",
      case: updatedCase
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;