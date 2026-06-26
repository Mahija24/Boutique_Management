import express from "express";
import Order from "../models/Order.js";
import { protect, ownerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Generate Order ID
const generateOrderId = async () => {
  const lastOrder = await Order.findOne().sort({ _id: -1 }).limit(1);
  const lastNum = lastOrder?.orderId ? parseInt(lastOrder.orderId.replace("ORD-", "")) : 0;
  return `ORD-${(lastNum + 1).toString().padStart(4, "0")}`;
};

const buildStage = (start, end) => ({
  startDate: new Date(start),
  endDate: new Date(end),
});

const normalizeManualSchedule = (manualSchedule, orderDate, deliveryDate) => {
  if (!manualSchedule) return null;

  const start = new Date(orderDate);
  const delivery = new Date(deliveryDate);

  const cuttingEnd =
    manualSchedule.cuttingEndDate ||
    manualSchedule.cuttingDate ||
    manualSchedule.cutting?.endDate ||
    manualSchedule.cutting?.date;
  const stitchingEnd =
    manualSchedule.stitchingEndDate ||
    manualSchedule.stitchingDate ||
    manualSchedule.stitching?.endDate ||
    manualSchedule.stitching?.date;
  const trialEnd =
    manualSchedule.trialEndDate ||
    manualSchedule.trialDate ||
    manualSchedule.trial?.endDate ||
    manualSchedule.trial?.date;
  const finalEnd =
    manualSchedule.finalWorkEndDate ||
    manualSchedule.finalWorkDate ||
    manualSchedule.finalWork?.endDate ||
    manualSchedule.finalWork?.date;
  const stitchingDays =
    manualSchedule.stitchingDays != null
      ? Number(manualSchedule.stitchingDays)
      : null;

  let cuttingEndDate = cuttingEnd ? new Date(cuttingEnd) : null;
  let stitchingEndDate = stitchingEnd ? new Date(stitchingEnd) : null;
  let trialEndDate = trialEnd ? new Date(trialEnd) : null;
  let finalEndDate = finalEnd ? new Date(finalEnd) : null;

  if (!cuttingEndDate || !trialEndDate || !finalEndDate) {
    return null;
  }

  if (!stitchingEndDate && stitchingDays != null) {
    stitchingEndDate = new Date(cuttingEndDate);
    stitchingEndDate.setDate(stitchingEndDate.getDate() + stitchingDays);
  }

  if (!stitchingEndDate && trialEndDate) {
    stitchingEndDate = new Date(trialEndDate);
    stitchingEndDate.setDate(stitchingEndDate.getDate() - 1);
  }

  if (!stitchingEndDate) {
    return null;
  }

  if (
    cuttingEndDate < start ||
    finalEndDate > delivery ||
    stitchingEndDate < cuttingEndDate ||
    trialEndDate < stitchingEndDate ||
    finalEndDate < trialEndDate
  ) {
    return null;
  }

  const stitchingStart = new Date(cuttingEndDate);
  stitchingStart.setDate(stitchingStart.getDate() + 1);

  const trialStart = new Date(stitchingEndDate);
  trialStart.setDate(trialStart.getDate() + 1);

  const finalStart = new Date(trialEndDate);
  finalStart.setDate(finalStart.getDate() + 1);

  return {
    cutting: buildStage(start, cuttingEndDate),
    stitching: buildStage(stitchingStart, stitchingEndDate),
    trial: buildStage(trialStart, trialEndDate),
    finalWork: buildStage(finalStart, finalEndDate),
  };
};

// AI Scheduler (Logic: Spread evenly, then avoid workload clashes)
const generateSchedule = async (
  orderDate,
  deliveryDate,
  manualSchedule = null,
) => {
  const start = new Date(orderDate);
  const end = new Date(deliveryDate);

  if (end <= start) return {};

  const normalizedManual = normalizeManualSchedule(
    manualSchedule,
    orderDate,
    deliveryDate,
  );
  if (manualSchedule && normalizedManual) {
    return normalizedManual;
  }

  const totalDays = Math.max(
    1,
    Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
  );
  const minCutting = 1;
  const minStitching = 2;
  const minTrial = 1;
  const minFinal = 1;

  let cuttingDays = Math.max(minCutting, Math.floor(totalDays * 0.22));
  let stitchingDays = Math.max(minStitching, Math.floor(totalDays * 0.42));
  let trialDays = Math.max(minTrial, Math.floor(totalDays * 0.18));
  let finalDays = totalDays - cuttingDays - stitchingDays - trialDays;

  if (finalDays < minFinal) {
    finalDays = minFinal;
    const extra = minFinal - finalDays;
    stitchingDays = Math.max(minStitching, stitchingDays - extra);
  }

  if (totalDays <= 4) {
    cuttingDays = 1;
    stitchingDays = 1;
    trialDays = 1;
    finalDays = Math.max(minFinal, totalDays - 3);
  }

  let cuttingEnd = new Date(start);
  cuttingEnd.setDate(cuttingEnd.getDate() + cuttingDays);

  let stitchingEnd = new Date(cuttingEnd);
  stitchingEnd.setDate(stitchingEnd.getDate() + stitchingDays);

  let trialEnd = new Date(stitchingEnd);
  trialEnd.setDate(trialEnd.getDate() + trialDays);

  let finalEnd = new Date(trialEnd);
  finalEnd.setDate(finalEnd.getDate() + finalDays);

  if (finalEnd > end) finalEnd = new Date(end);
  if (trialEnd > finalEnd) trialEnd = new Date(finalEnd);
  if (stitchingEnd > trialEnd) stitchingEnd = new Date(trialEnd);
  if (cuttingEnd > stitchingEnd) cuttingEnd = new Date(stitchingEnd);

  const adjustForClashes = async (baseDate, field) => {
    const offsets = [0, -1, 1, -2, 2];

    for (let offset of offsets) {
      const test = new Date(baseDate);
      test.setDate(test.getDate() + offset);

      if (test < start || test > end) continue;

      const dayStart = new Date(test);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(test);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await Order.countDocuments({
        [`schedule.${field}`]: { $gte: dayStart, $lte: dayEnd },
      });

      if (count < 3) return test;
    }

    return baseDate;
  };

  cuttingEnd = await adjustForClashes(cuttingEnd, "cutting.endDate");
  stitchingEnd = await adjustForClashes(stitchingEnd, "stitching.endDate");
  trialEnd = await adjustForClashes(trialEnd, "trial.endDate");
  finalEnd = await adjustForClashes(finalEnd, "finalWork.endDate");

  if (trialEnd < stitchingEnd) trialEnd = new Date(stitchingEnd);
  if (finalEnd < trialEnd) finalEnd = new Date(trialEnd);

  return {
    cutting: buildStage(start, cuttingEnd),
    stitching: buildStage(cuttingEnd, stitchingEnd),
    trial: buildStage(stitchingEnd, trialEnd),
    finalWork: buildStage(trialEnd, finalEnd),
  };
};

// Create a new order
router.post("/", protect, async (req, res) => {
  try {
    if (!req.body.customer || req.body.customer === "") {
      return res
        .status(400)
        .json({ message: "A valid customer ID is required to create an order." });
    }

    const orderId = await generateOrderId();
    const orderDate = req.body.orderDate || Date.now();
    let schedule = req.body.schedule;

    if (schedule) {
      const normalizedSchedule = normalizeManualSchedule(
        schedule,
        orderDate,
        req.body.deliveryDate,
      );
      if (normalizedSchedule) {
        schedule = normalizedSchedule;
      }
    }

    if (!schedule) {
      schedule = await generateSchedule(orderDate, req.body.deliveryDate);
    }

    // Auto calculate balance
    const pricing = req.body.pricing;
    if (pricing) {
      pricing.balance = pricing.totalAmount - (pricing.advancePaid || 0);
    }

    let paymentStatus = "Pending";
    if (pricing && pricing.advancePaid > 0) {
      paymentStatus =
        pricing.advancePaid >= pricing.totalAmount ? "Paid" : "Partial";
    }

    const order = await Order.create({
      ...req.body,
      orderId,
      schedule,
      paymentStatus,
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all orders (with filters)
router.get("/", protect, async (req, res) => {
  try {
    const { status, staff, customer, search } = req.query;
    let query = {};
    if (status) query.status = status;
    if (staff) query.assignedStaff = staff;
    if (customer) query.customer = customer;

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { orderId: regex },
        { dressType: regex },
        { fabricDetails: regex },
      ];
    }

    const orders = await Order.find(query)
      .populate("customer", "name phone")
      .populate("assignedStaff", "name")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single order
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer")
      .populate("assignedStaff", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order status/details
router.put("/:id", protect, async (req, res) => {
  try {
    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder)
      return res.status(404).json({ message: "Order not found" });

    if (req.body.customer === "") {
      return res
        .status(400)
        .json({ message: "A valid customer ID is required to update an order." });
    }

    if (req.body.schedule) {
      const normalizedSchedule = normalizeManualSchedule(
        req.body.schedule,
        existingOrder.orderDate,
        existingOrder.deliveryDate,
      );
      if (normalizedSchedule) {
        req.body.schedule = normalizedSchedule;
      }
    }

    // If pricing gets updated, recalculate balance
    if (req.body.pricing) {
      req.body.pricing.balance =
        req.body.pricing.totalAmount - (req.body.pricing.advancePaid || 0);
      if (req.body.pricing.advancePaid >= req.body.pricing.totalAmount) {
        req.body.paymentStatus = "Paid";
      } else if (req.body.pricing.advancePaid > 0) {
        req.body.paymentStatus = "Partial";
      } else {
        req.body.paymentStatus = "Pending";
      }
    }

    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .populate("customer", "name phone")
      .populate("assignedStaff", "name");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete order (Owner only)
router.delete("/:id", protect, ownerOnly, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
