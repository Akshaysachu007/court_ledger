const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isAdmin } = require("../middleware/authMiddleware");

const isStrongPassword = (password) => {
  // Require at least one number and one special character.
  return /^(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(password);
};

// --- 1. LOGIN ---
router.post("/login", async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    // Check for Super Admin (Hardcoded in .env)
    if (
      email === process.env.SUPER_ADMIN_EMAIL &&
      password === process.env.SUPER_ADMIN_PASSWORD
    ) {
      const token = jwt.sign(
        { id: "SUPER_ADMIN", role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
      return res.json({ token, role: "admin", userId: "SUPER_ADMIN" });
    }

    // Check Database Users
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, role: user.role, userId: user._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 2. GET ALL USERS (ADMIN ONLY) ---
router.get("/users", isAdmin, async (req, res) => {
  try {
    // Return all users except passwords and sensitive data
    // We exclude 'admin' roles to prevent accidental modification of other admins if they exist
    const users = await User.find({ role: { $ne: "admin" } }).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 3. CREATE USER (ADMIN ONLY) ---
router.post("/create-user", isAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const emailNormalized = email.trim().toLowerCase();

    if (!password || !isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password must contain at least one number and one special character"
      });
    }

    if (role !== "clerk" && role !== "judge") {
      return res.status(400).json({ message: "Invalid role assignment" });
    }

    const userExists = await User.findOne({ email: emailNormalized });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email: emailNormalized,
      password: hashedPassword,
      role
    });

    await newUser.save();
    res.json({ message: `${role} created successfully!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 4. UPDATE USER (ADMIN ONLY) ---
router.put("/users/:id", isAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const updateData = { name, email: email.trim().toLowerCase(), role };

    // If a new password is provided, hash it
    if (password && password.trim() !== "") {
      if (!isStrongPassword(password)) {
        return res.status(400).json({
          message: "Password must contain at least one number and one special character"
        });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 5. DELETE USER (ADMIN ONLY) ---
router.delete("/users/:id", isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User access revoked successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;