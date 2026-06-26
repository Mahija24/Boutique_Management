import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    dressType: { type: String },
    measurements: {
      fullLength: { type: Number },
      fullShoulder: { type: Number },
      shoulderStrap: { type: Number },
      backNeckDepth: { type: Number },
      frontNeckDepth: { type: Number },
      point: { type: Number },
      frontLength: { type: Number },
      upperBust: { type: Number },
      bustAround: { type: Number },
      waistAround: { type: Number },
      tummy: { type: Number },
      seat: { type: Number },
      slitOpen: { type: Number },
      armHole: { type: Number },
      armRound: { type: Number },
      sleeveLength: { type: Number },
      sleeveRound: { type: Number },
      biceps: { type: Number },
      option: { type: String },
      pantLength: { type: Number },
      hip: { type: Number },
      thigh: { type: Number },
      knee: { type: Number },
      ankle: { type: Number },
      halfLength: { type: Number },
    },
    items: [
      {
        dressType: { type: String, required: true },
        designType: { type: String },
        quantity: { type: Number, default: 1 },
        costPerPiece: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 },
        measurements: { type: Map, of: String },
        selectedOptions: [{ type: String }],
        customOptions: [{ type: String }], // For 'Other' option custom entries
        referenceImages: [{ type: String }],
        voiceNotes: [{ type: String }],
        deliveryDate: { type: Date }, // Item-specific delivery date
        notes: { type: String },
        customMeasurements: [
          {
            name: { type: String },
            value: { type: String },
          },
        ],
        whiteboards: [
          {
            id: { type: String },
            title: { type: String },
            extraDataAndNotes: { type: String },
            imageUrls: [{ type: String }],
            drawingUrls: [{ type: String }],
            audioNotes: [{ type: String }],
            createdAt: { type: Date, default: Date.now },
          },
        ],
        aiSchedule: {
          cutting: { startDate: { type: Date }, endDate: { type: Date }, status: { type: String } },
          stitching: { startDate: { type: Date }, endDate: { type: Date }, status: { type: String } },
          trial: { startDate: { type: Date }, endDate: { type: Date }, status: { type: String } },
          finalWork: { startDate: { type: Date }, endDate: { type: Date }, status: { type: String } },
        },
        itemStatus: {
          type: String,
          enum: ["Measurement done", "Cutting", "Stitching", "Trial", "Final adjustment", "Ready", "Delivered"],
          default: "Measurement done",
        },
      },
    ],
    fabricDetails: { type: String },
    orderType: { type: String, default: "New stitching" },
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
