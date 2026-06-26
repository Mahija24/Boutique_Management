import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import LoginRequest from "../models/LoginRequest.js";
import { sendEmail } from "../utils/mailer.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mahijareddy872@gmail.com";
const LOGIN_REQUEST_EXPIRY_MINUTES = Number(process.env.LOGIN_REQUEST_EXPIRY_MINUTES) || 10;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return token;
};

const generateApprovalToken = (requestId) =>
  jwt.sign({ requestId }, JWT_SECRET, {
    expiresIn: `${LOGIN_REQUEST_EXPIRY_MINUTES}m`,
  });

const verifyApprovalToken = (token) => jwt.verify(token, JWT_SECRET);

const sendLoginRequestEmail = async (request) => {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:5000";
  const emailToken = generateApprovalToken(request._id);
  const approveLink = `${baseUrl}/api/auth/login-request/resolve?requestId=${request._id}&action=approve&token=${encodeURIComponent(
    emailToken,
  )}`;
  const rejectLink = `${baseUrl}/api/auth/login-request/resolve?requestId=${request._id}&action=reject&token=${encodeURIComponent(
    emailToken,
  )}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>Staff login request</h2>
      <p><strong>Name:</strong> ${request.name}</p>
      <p><strong>Phone:</strong> ${request.phone}</p>
      <p>The requester is asking to log in to the boutique management system.</p>
      <div style="margin: 24px 0; display:flex; gap:12px;">
        <a href="${approveLink}" style="padding: 12px 18px; background: #16a34a; color: white; text-decoration:none; border-radius: 8px;">Approve Request</a>
        <a href="${rejectLink}" style="padding: 12px 18px; background: #dc2626; color: white; text-decoration:none; border-radius: 8px;">Reject Request</a>
      </div>
      <p style="font-size: 13px; color: #666;">This request expires at ${request.expiresAt.toISOString()}.</p>
    </div>
  `;
  const text = `Staff login request for ${request.name} (${request.phone}). Approve: ${approveLink} Reject: ${rejectLink}`;

  const info = await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Boutique login approval request for ${request.name}`,
    html,
    text,
  });
  return info;
};

router.post("/request-login", async (req, res) => {
  const { name, phone } = req.body;
  try {
    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required." });
    }

    const normalizedPhone = phone.replace(/\D/g, "");
    const existingPending = await LoginRequest.findOne({
      phone: normalizedPhone,
      status: "pending",
    }).sort({ createdAt: -1 });

    if (existingPending) {
      return res.status(200).json({
        message:
          "A login request is already pending. Please wait for approval.",
      });
    }

    const expiresAt = new Date(Date.now() + LOGIN_REQUEST_EXPIRY_MINUTES * 60 * 1000);
    const request = await LoginRequest.create({
      name,
      phone: normalizedPhone,
      status: "pending",
      expiresAt,
    });
    const approvalToken = generateApprovalToken(request._id.toString());
    request.approvalToken = approvalToken;
    await request.save();
    await sendLoginRequestEmail(request);
    res.status(201).json({
      message:
        "Login request submitted. Approval has been sent to admin email.",
    });
  } catch (error) {
    console.error("Login request error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/login-request/resolve", async (req, res) => {
  const { requestId, action, token } = req.query;
  try {
    if (!requestId || !token || !["approve", "reject"].includes(action)) {
      return res.status(400).send("Invalid request approval link.");
    }
    const decoded = verifyApprovalToken(token);
    if (decoded.requestId !== requestId) {
      return res.status(401).send("Invalid or expired approval token.");
    }

    const request = await LoginRequest.findById(requestId);
    if (!request) {
      return res.status(404).send("Login request not found.");
    }
    if (request.status !== "pending") {
      return res
        .status(400)
        .send(`Request has already been ${request.status}.`);
    }
    if (new Date() > new Date(request.expiresAt)) {
      request.status = "rejected";
      request.resolvedAt = new Date();
      request.resolvedBy = "admin";
      await request.save();
      return res.status(410).send("This login request has expired.");
    }

    request.status = action === "approve" ? "approved" : "rejected";
    request.resolvedAt = new Date();
    request.resolvedBy = "admin";
    await request.save();

    if (action === "approve") {
      await User.findOneAndUpdate(
        { phone: request.phone, role: "Staff" },
        { name: request.name, role: "Staff" },
        { upsert: true, new: true },
      );
      return res.send(
        `Login request for ${request.name} has been approved. The staff member may now log in with their name and phone number.`,
      );
    }

    return res.send(
      `Login request for ${request.name} has been rejected. The user will not be able to log in.`,
    );
  } catch (error) {
    console.error("Login approval error:", error);
    return res.status(500).send("Unable to process login approval.");
  }
});

router.post("/login", async (req, res) => {
  const { email, password, phone, name, role } = req.body;
  try {
    if (role === "Staff") {
      if (!name || !phone) {
        return res.status(400).json({ message: "Name and phone are required." });
      }
      const normalizedPhone = phone.replace(/\D/g, "");
      const request = await LoginRequest.findOne({
        name,
        phone: normalizedPhone,
      }).sort({ createdAt: -1 });

      if (!request || request.status === "pending") {
        return res.status(401).json({
          message:
            "Your login request is pending approval. Please wait for the admin to approve it.",
        });
      }
      if (request.status === "rejected") {
        return res.status(401).json({
          message:
            "Your login request has been rejected by the admin.",
        });
      }
      if (new Date() > new Date(request.expiresAt)) {
        return res.status(401).json({
          message: "Your login request has expired. Please request login again.",
        });
      }

      let user = await User.findOne({ phone: normalizedPhone, role: "Staff" });
      if (!user) {
        user = await User.create({
          name,
          phone: normalizedPhone,
          role: "Staff",
        });
      }
      const token = generateToken(res, user._id);
      return res.json({
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        token,
      });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User not found with this email" });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
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

router.get("/profile", protect, async (req, res) => {
  res.json(req.user);
});

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
      phone: updatedUser.phone,
      role: updatedUser.role,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/register", async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  try {
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? "Owner" : role || "Staff";

    if (assignedRole === "Owner") {
      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required for Owner registration",
        });
      }
    } else if (assignedRole === "Staff") {
      return res.status(400).json({
        message:
          "Staff accounts cannot be created here. Please use Staff Login Request.",
      });
    }

    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });

    const userExists = query.length ? await User.findOne({ $or: query }) : null;
    if (userExists) {
      return res.status(400).json({
        message: "User already exists with this email or phone",
      });
    }

    const user = await User.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      password: password || undefined,
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
        phone: user.phone,
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
