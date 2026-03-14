const mongoose = require("mongoose");

const CaseSchema = new mongoose.Schema({
  caseNumber: {
    type: String,
    required: true,
    unique: true // Added unique constraint to prevent duplicate case numbers
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // This must match your User model name
    required: true
  },
  assignedJudge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: [
      "pending_review",
      "approved",
      "rejected",
      "inactive"
    ],
    default: "pending_review"
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  approvedAt: {
    type: Date
  }
}, { 
  timestamps: true // Automatically creates createdAt and updatedAt fields
});

module.exports = mongoose.model("Case", CaseSchema);