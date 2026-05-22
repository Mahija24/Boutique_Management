import express from "express";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
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
      address,
      staffRoles,
      salary,
      notes,
      overtimeEnabled,
      workingHours,
      role: "Staff",
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

export default router;
