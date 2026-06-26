import mongoose from "mongoose";

const loginRequestSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const LoginRequest = mongoose.model("LoginRequest", loginRequestSchema);
export default LoginRequest;
