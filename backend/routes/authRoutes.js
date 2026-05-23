import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect, ownerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

const generateToken = (res, userId) => {
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "30d" },
  );
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return token;
};

// Login user
router.post("/login", async (req, res) => {
  const { email, password, phone, role } = req.body;
  try {
    if (!email && !phone) {
      return res
        .status(400)
        .json({ message: "Email or phone number is required" });
    }
    if (!password && role !== "Staff") {
      return res.status(400).json({ message: "Password is required" });
    }

    let user;
    if (role === "Staff" && phone) {
      user = await User.findOne({ phone, role: "Staff" });
      if (!user)
        return res
          .status(401)
          .json({ message: "Staff member not found with this phone number" });
    } else if (email && password) {
      user = await User.findOne({ email });
      if (!user) {
        return res
          .status(401)
          .json({ message: "User not found with this email" });
      }
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }
    } else {
      return res.status(400).json({ message: "Invalid login credentials" });
    }

    const token = generateToken(res, user._id);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Logout user
router.post("/logout", (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
});

// Get user profile
router.get("/profile", protect, async (req, res) => {
  res.json(req.user);
});

// Update user profile
router.put("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Register user (Owner only or first user)
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists)
      return res
        .status(400)
        .json({ message: "User already exists with this email" });

    // If it's the first ever user, make them Owner. Otherwise respect requested role.
    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? "Owner" : role || "Staff";

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
    });
    if (user) {
      if (userCount === 0) {
        generateToken(res, user._id);
      }
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        message: "Registration successful",
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
