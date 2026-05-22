import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true }, // Optional for staff
    password: { type: String }, // Optional for staff
    phone: { type: String },
    address: { type: String },
    role: { type: String, enum: ["Owner", "Staff"], default: "Staff" },
    staffRoles: [
      {
        type: String,
        enum: ["Cutting", "Stitching", "Finishing", "General Staff"],
      },
    ],
    salary: {
      type: {
        type: String,
        enum: ["Per Day", "Per Week", "Per 15 Days", "Per Month"],
      },
      amount: { type: Number },
    },
    notes: { type: String },
    overtimeEnabled: { type: Boolean, default: true },
    workingHours: { type: Number, default: 8 },
    salaryPaymentHistory: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        month: { type: String },
      },
    ],
    totalSalaryPaid: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
