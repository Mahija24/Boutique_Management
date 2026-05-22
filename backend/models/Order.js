import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    dressType: { type: String, required: true },
    fabricDetails: { type: String },
    designReference: { type: String }, // optional image or text
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, required: true },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: [
        "Measurement done",
        "Cutting",
        "Stitching",
        "Trial",
        "Final adjustment",
        "Ready",
        "Delivered",
      ],
      default: "Measurement done",
    },
    pricing: {
      totalAmount: { type: Number, required: true },
      advancePaid: { type: Number, default: 0 },
      balance: { type: Number, required: true },
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Partial", "Pending"],
      default: "Pending",
    },
    whiteboard: {
      extraDataAndNotes: { type: String },
      imageUrls: [{ type: String }],
      drawingUrls: [{ type: String }],
      audioBlob: { type: String }, // base64 encoded audio data
    },
    schedule: {
      cutting: { startDate: { type: Date }, endDate: { type: Date } },
      stitching: { startDate: { type: Date }, endDate: { type: Date } },
      trial: { startDate: { type: Date }, endDate: { type: Date } },
      finalWork: { startDate: { type: Date }, endDate: { type: Date } },
    },
  },
  { timestamps: true },
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
