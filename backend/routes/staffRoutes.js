import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import LoginRequest from "../models/LoginRequest.js";
import { sendEmail } from "../utils/mailer.js";
import { protect, ownerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all staff
router.get("/", protect, async (req, res) => {
  try {
    const staff = await User.find({ role: "Staff" }).select("-password");
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create staff (Owner only)
router.post("/", protect, ownerOnly, async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      staffRoles,
      salary,
      notes,
      overtimeEnabled,
      workingHours,
    } = req.body;
    const staff = await User.create({
      name,
      phone,
      mobile: phone,
      address,
      staffRoles,
      salary,
      notes,
      overtimeEnabled,
      workingHours,
      role: "Staff",
      createdBy: req.user._id,
    });
    res.status(201).json(staff);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update staff (Owner only)
router.put("/:id", protect, ownerOnly, async (req, res) => {
  try {
    const staff = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).select("-password");
    if (!staff) return res.status(404).json({ message: "Staff not found" });
    res.json(staff);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete staff (Owner only)
router.delete("/:id", protect, ownerOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "Owner")
      return res.status(400).json({ message: "Cannot delete owner" });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Staff removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ATTENDANCE ENDPOINTS

// Mark IN
router.post("/:id/attendance/in", protect, async (req, res) => {
  try {
    const today = new Date().setHours(0, 0, 0, 0);
    const existing = await Attendance.findOne({
      staffId: req.params.id,
      date: today,
    });
    if (existing)
      return res.status(400).json({ message: "Already marked IN today" });

    const attendance = await Attendance.create({
      staffId: req.params.id,
      date: today,
      inTime: new Date(),
    });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark OUT
router.post("/:id/attendance/out", protect, async (req, res) => {
  try {
    const today = new Date().setHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({
      staffId: req.params.id,
      date: today,
    });
    if (!attendance)
      return res.status(400).json({ message: "Not marked IN today" });
    if (attendance.outTime)
      return res.status(400).json({ message: "Already marked OUT today" });

    attendance.outTime = new Date();

    // Calculate total hours
    const hours = (attendance.outTime - attendance.inTime) / (1000 * 60 * 60);
    attendance.totalHours = hours;

    // Check staff overtime settings
    const staff = await User.findById(req.params.id);
    if (staff.overtimeEnabled && hours > staff.workingHours) {
      attendance.overtimeHours = hours - staff.workingHours;
    }

    attendance.status = "Present";
    await attendance.save();

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark Leave
router.post("/:id/attendance/leave", protect, async (req, res) => {
  try {
    const { leaveType, leaveReason } = req.body;
    const today = new Date().setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({
      staffId: req.params.id,
      date: today,
    });
    if (existing)
      return res
        .status(400)
        .json({ message: "Attendance already marked for today" });

    const attendance = await Attendance.create({
      staffId: req.params.id,
      date: today,
      status: "Leave",
      leaveType,
      leaveReason,
    });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve/Reject Overtime (Owner only)
router.put(
  "/:id/attendance/:attendanceId/overtime",
  protect,
  ownerOnly,
  async (req, res) => {
    try {
      const { approved } = req.body;
      const attendance = await Attendance.findById(req.params.attendanceId);

      if (!attendance || attendance.staffId.toString() !== req.params.id) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      attendance.isOvertimeApproved = approved;
      await attendance.save();

      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Edit attendance manually (Owner only)
router.put(
  "/attendance/:attendanceId",
  protect,
  ownerOnly,
  async (req, res) => {
    try {
      const attendance = await Attendance.findByIdAndUpdate(
        req.params.attendanceId,
        req.body,
        { new: true },
      );
      if (!attendance)
        return res.status(404).json({ message: "Attendance record not found" });

      // Recalculate overtime if inTime/outTime provided
      if (attendance.inTime && attendance.outTime) {
        const hours =
          (new Date(attendance.outTime) - new Date(attendance.inTime)) /
          (1000 * 60 * 60);
        attendance.overtimeHours = hours > 8 ? hours - 8 : 0;
        attendance.status = "Complete";
        await attendance.save();
      }

      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Get staff attendance history
router.get("/:id/attendance", protect, async (req, res) => {
  try {
    const history = await Attendance.find({ staffId: req.params.id }).sort({
      date: -1,
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Process salary payment (Owner only)
router.post("/:id/salary/process", protect, ownerOnly, async (req, res) => {
  try {
    const { amountPaid } = req.body;
    if (!amountPaid || amountPaid <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const staff = await User.findById(req.params.id);
    if (!staff || staff.role !== "Staff") {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Initialize salaryPaymentHistory if it doesn't exist
    if (!staff.salaryPaymentHistory) {
      staff.salaryPaymentHistory = [];
    }

    // Add payment record
    staff.salaryPaymentHistory.push({
      amount: amountPaid,
      date: new Date(),
      month: new Date().toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
    });

    // Update total paid (optional: track cumulative payments)
    if (!staff.totalSalaryPaid) {
      staff.totalSalaryPaid = 0;
    }
    staff.totalSalaryPaid += amountPaid;

    await staff.save();

    res.json({
      message: "Salary payment processed successfully",
      amountPaid,
      staff: { name: staff.name, totalPaid: staff.totalSalaryPaid },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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

// Staff Login Request
// POST /api/staff/login
router.post("/login", async (req, res) => {
  const { name, mobile } = req.body;
  try {
    if (!name || !mobile) {
      return res.status(400).json({ message: "Name and mobile are required." });
    }

    const normalizedMobile = mobile.replace(/\D/g, "");
    
    // Step 1: Check existing login request
    const existingRequest = await LoginRequest.findOne({ mobile: normalizedMobile }).sort({ createdAt: -1 });

    if (existingRequest) {
      if (existingRequest.status === "approved") {
        // Ensure staff member exists in the User collection under role = "Staff"
        let staff = await User.findOne({
          $or: [{ phone: normalizedMobile }, { mobile: normalizedMobile }],
          role: "Staff",
        });

        if (!staff) {
          staff = await User.create({
            name: existingRequest.name,
            phone: normalizedMobile,
            mobile: normalizedMobile,
            role: "Staff",
          });
        }

        // Generate token and login successfully
        const token = generateToken(res, staff._id);
        return res.json({
          status: "approved",
          token,
          user: {
            _id: staff._id,
            name: staff.name,
            phone: staff.phone || staff.mobile,
            role: staff.role,
          },
        });
      } else if (existingRequest.status === "pending") {
        return res.json({
          status: "pending",
          message: "Your login request is pending. Waiting for owner approval.",
        });
      }
    }

    // Step 2: Create login request (if no request exists, or if previous request was rejected)
    const loginRequest = await LoginRequest.create({
      name: name,
      mobile: normalizedMobile,
      status: "pending",
      requestedAt: new Date(),
    });

    // Step 4: Send approval mail to owner/admin mail
    const adminEmail = process.env.ADMIN_EMAIL || "mahijareddy872@gmail.com";
    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:5000";
    const approveLink = `${appBaseUrl}/api/staff/approve/${loginRequest._id}`;
    const rejectLink = `${appBaseUrl}/api/staff/reject/${loginRequest._id}`;

    const mailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #7C3AED, #9F67FF); color: white; padding: 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 24px; letter-spacing: 0.5px;">Boutique Login Request</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Staff requesting dashboard access</p>
        </div>
        <div style="padding: 24px; background-color: #fff;">
          <p style="font-size: 16px; line-height: 1.5; color: #555;">Hello Admin,</p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">A staff member is requesting access to the Boutique Management System. Please review the details below and approve or reject their access request.</p>
          
          <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #666; width: 120px;">Staff Name:</td>
                <td style="padding: 6px 0; color: #111;">${loginRequest.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #666;">Mobile:</td>
                <td style="padding: 6px 0; color: #111;">${loginRequest.mobile}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #666;">Requested At:</td>
                <td style="padding: 6px 0; color: #111;">${loginRequest.requestedAt.toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin: 32px 0; text-align: center; display: flex; justify-content: center; gap: 16px;">
            <a href="${approveLink}" style="display: inline-block; padding: 12px 28px; background-color: #10b981; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2); transition: all 0.2s;">Approve Access</a>
            <a href="${rejectLink}" style="display: inline-block; padding: 12px 28px; background-color: #ef4444; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.2); transition: all 0.2s; margin-left: 10px;">Reject Access</a>
          </div>
          
          <p style="font-size: 13px; color: #888; text-align: center; margin-top: 24px; border-t: 1px solid #eee; padding-top: 16px;">
            This email is auto-generated by the BoutiquePro Premium management platform.
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: adminEmail,
      subject: `[BoutiquePro] Login Approval Request: ${loginRequest.name}`,
      html: mailHtml,
      text: `Staff Login Request.\n\nName: ${loginRequest.name}\nMobile: ${loginRequest.mobile}\nTime: ${loginRequest.requestedAt.toLocaleString()}\n\nApprove: ${approveLink}\nReject: ${rejectLink}`,
    });

    return res.json({
      status: "pending",
      message: "Login request submitted. Waiting for owner approval.",
    });

  } catch (error) {
    console.error("Staff login request error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Approve Request
// GET /api/staff/approve/:id
router.get("/approve/:id", async (req, res) => {
  try {
    const request = await LoginRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).send("Login request not found.");
    }
    request.status = "approved";
    
    // Automatically create/upsert the User record upon approval
    const staff = await User.findOneAndUpdate(
      { phone: request.mobile, role: "Staff" },
      { name: request.name, mobile: request.mobile, role: "Staff" },
      { upsert: true, new: true }
    );
    
    request.staffId = staff._id;
    await request.save();

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Access Approved</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f0fdf4;
              color: #14532d;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .card {
              background: white;
              border: 1px solid #bbf7d0;
              border-radius: 20px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 10px 25px rgba(22, 163, 74, 0.05);
              max-width: 480px;
              width: 100%;
            }
            .icon-circle {
              width: 72px;
              height: 72px;
              background-color: #dcfce7;
              color: #16a34a;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
              font-size: 36px;
              font-weight: bold;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 12px 0;
              color: #166534;
            }
            p {
              font-size: 16px;
              line-height: 1.6;
              color: #14532d;
              margin: 0 0 24px 0;
              opacity: 0.9;
            }
            .badge {
              display: inline-block;
              background-color: #f0fdf4;
              border: 1px solid #dcfce7;
              padding: 8px 16px;
              border-radius: 8px;
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 24px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon-circle">✓</div>
            <h1>Approval Successful</h1>
            <p>Access request for <strong>${request.name}</strong> has been approved.</p>
            <div class="badge">Mobile: ${request.mobile}</div>
            <p style="font-size: 14px;">The staff member may now log in to the BoutiquePro app on their device.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Approve request error:", error);
    res.status(500).send("Unable to approve login request.");
  }
});

// Reject Request
// GET /api/staff/reject/:id
router.get("/reject/:id", async (req, res) => {
  try {
    const request = await LoginRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).send("Login request not found.");
    }
    request.status = "rejected";
    await request.save();

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Access Rejected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #fef2f2;
              color: #7f1d1d;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .card {
              background: white;
              border: 1px solid #fecaca;
              border-radius: 20px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 10px 25px rgba(220, 38, 38, 0.05);
              max-width: 480px;
              width: 100%;
            }
            .icon-circle {
              width: 72px;
              height: 72px;
              background-color: #fee2e2;
              color: #dc2626;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
              font-size: 36px;
              font-weight: bold;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 12px 0;
              color: #991b1b;
            }
            p {
              font-size: 16px;
              line-height: 1.6;
              color: #7f1d1d;
              margin: 0 0 24px 0;
              opacity: 0.9;
            }
            .badge {
              display: inline-block;
              background-color: #fef2f2;
              border: 1px solid #fee2e2;
              padding: 8px 16px;
              border-radius: 8px;
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 24px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon-circle">✕</div>
            <h1>Request Rejected</h1>
            <p>Access request for <strong>${request.name}</strong> has been rejected.</p>
            <div class="badge">Mobile: ${request.mobile}</div>
            <p style="font-size: 14px;">The staff member will not be allowed to log in.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Reject request error:", error);
    res.status(500).send("Unable to reject login request.");
  }
});

export default router;
