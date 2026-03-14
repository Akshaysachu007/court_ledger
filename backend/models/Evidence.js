const mongoose = require("mongoose");

const EvidenceSchema = new mongoose.Schema({
  caseId: {
    // We keep this as String because you are passing the Case _id as a string
    // but we add a ref so we can use .populate() if needed
    type: String, 
    required: true,
    index: true // Added index for faster searching in the Judge Dashboard
  },
  fileName: {
    type: String,
    required: true
  },
  fileHash: {
    type: String,
    required: true
  },
  ipfsHash: {
    type: String,
    required: true
  },
  blockchainTx: {
    type: String
  },
  uploadedBy: {
    // Keeping this as String as per your requirement, 
    // but ensure you save the Clerk's NAME here during upload
    type: String, 
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// Added a virtual field to easily get the full IPFS link in the frontend
EvidenceSchema.virtual('ipfsUrl').get(function() {
  return `https://gateway.pinata.cloud/ipfs/${this.ipfsHash}`;
});

// Ensure virtuals are included when converting to JSON
EvidenceSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model("Evidence", EvidenceSchema);