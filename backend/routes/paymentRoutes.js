import express from "express";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import { protect, ownerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create payment
router.post("/", protect, async (req, res) => {
  try {
    const { orderId, amountPaid, method, transactionId } = req.body;

    const payment = await Payment.create({
      order: orderId, // Accept orderId from frontend
      amountPaid,
      method,
      transactionId,
      recordedBy: req.user._id,
    });

    // Update order amounts
    const order = await Order.findById(orderId);
    if (order) {
      order.pricing.advancePaid = (order.pricing.advancePaid || 0) + amountPaid;
      order.pricing.balance =
        order.pricing.totalAmount - order.pricing.advancePaid;

      if (order.pricing.advancePaid >= order.pricing.totalAmount) {
        order.paymentStatus = "Paid";
      } else {
        order.paymentStatus = "Partial";
      }
      await order.save();
    }

    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get payments by order
router.get("/order/:orderId", protect, async (req, res) => {
  try {
    const payments = await Payment.find({ order: req.params.orderId }).populate(
      "recordedBy",
      "name",
    );
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
