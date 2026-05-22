import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, required: true },
    inTime: { type: Date },
    outTime: { type: Date },
    overtimeHours: { type: Number, default: 0 },
    isOvertimeApproved: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Present", "Absent", "Leave", "Half Day", "Incomplete"],
      default: "Incomplete",
    },
    leaveType: {
      type: String,
      enum: ["Sick Leave", "Casual Leave", "Emergency Leave", "Vacation"],
      required: false,
    },
    leaveReason: { type: String },
    totalHours: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
