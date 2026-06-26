import express from "express";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Customer from "../models/Customer.js";
import Expense from "../models/Expense.js";
import User from "../models/User.js";
import DashboardSetting from "../models/DashboardSetting.js";
import { protect, ownerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Owner Dashboard Stats
router.get("/stats", protect, ownerOnly, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: "Delivered" });
    const pendingOrders = await Order.countDocuments({
      status: { $ne: "Delivered" },
    });
    const totalCustomers = await Customer.countDocuments();
    const settings =
      (await DashboardSetting.findOne()) ||
      (await DashboardSetting.create({ rentPending: 0, billsPending: 0 }));

    const orders = await Order.find().populate("customer", "name");
    let totalPendingPayments = 0;

    const totalOrderRevenue = orders.reduce(
      (sum, order) => sum + (order.pricing?.totalAmount || 0),
      0,
    );

    const totalCollectedFromOrders = orders.reduce(
      (sum, order) =>
        sum +
        Math.max(
          0,
          (order.pricing?.totalAmount || 0) - (order.pricing?.balance || 0),
        ),
      0,
    );

    orders.forEach((o) => {
      totalPendingPayments += o.pricing?.balance || 0;
    });

    const activeOrders = orders.filter((o) => o.status !== "Delivered");

    const stageCounts = activeOrders.reduce((acc, order) => {
      const status = order.status || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueSoonDate = new Date(today);
    dueSoonDate.setDate(dueSoonDate.getDate() + 5);

    const overdueOrders = activeOrders.filter(
      (order) => new Date(order.deliveryDate) < today,
    );
    const dueSoonOrders = [...activeOrders]
      .filter((order) => {
        const delivery = new Date(order.deliveryDate);
        return delivery >= today && delivery <= dueSoonDate;
      })
      .sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate))
      .slice(0, 5)
      .map((order) => ({
        _id: order._id,
        orderId: order.orderId,
        dressType: order.dressType,
        deliveryDate: order.deliveryDate,
        status: order.status,
        customer: order.customer,
      }));

    const topDueOrders = dueSoonOrders;

    const orderRevenueDetails = orders.map((order) => {
      const totalAmount = order.pricing?.totalAmount || 0;
      const balance = order.pricing?.balance || 0;
      const advancePaid = order.pricing?.advancePaid || 0;
      return {
        orderId: order.orderId,
        customerName: order.customer?.name || "Unknown",
        totalAmount,
        advancePaid,
        balance,
        collected: totalAmount - balance,
        deliveryDate: order.deliveryDate,
        status: order.status,
      };
    });

    const payments = await Payment.find({ status: { $regex: /^success$/i } })
      .populate({
        path: "order",
        populate: { path: "customer", select: "name" },
      })
      .populate("recordedBy", "name");
    const paymentMethods = { Cash: 0, UPI: 0, Card: 0, Online: 0 };
    let totalCompletedPayments = 0;

    const paymentDetails = payments.map((p) => ({
      orderId: p.order?.orderId || "N/A",
      customerName: p.order?.customer?.name || "Unknown",
      amountPaid: p.amountPaid,
      method: p.method,
      date: p.createdAt,
      recordedBy: p.recordedBy?.name || "System",
      totalAmount: p.order?.pricing?.totalAmount || 0,
      balance: p.order?.pricing?.balance || 0,
    }));

    // Compute month boundaries explicitly (server local time)
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfNextMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      1,
    );

    const monthlyRevenueDetails = paymentDetails.filter((p) => {
      const paymentDate = new Date(p.date || Date.now());
      return paymentDate >= startOfThisMonth && paymentDate < startOfNextMonth;
    });

    payments.forEach((p) => {
      if (paymentMethods[p.method] !== undefined) {
        paymentMethods[p.method] += p.amountPaid;
      }
      totalCompletedPayments += p.amountPaid;
    });

    const totalRevenue = totalCollectedFromOrders || totalCompletedPayments;

    const cashVsOnline = {
      Cash: paymentMethods.Cash,
      Online: paymentMethods.Online + paymentMethods.UPI,
    };

    const onlineOffline = {
      Online: cashVsOnline.Online,
      Offline: paymentMethods.Cash + paymentMethods.Card,
    };

    // Use the already-fetched `payments` array and filter by createdAt
    const monthlyPayments = payments.filter((p) => {
      const dt = new Date(p.createdAt || p.date || p.updatedAt || Date.now());
      return dt >= startOfThisMonth && dt < startOfNextMonth;
    });

    const monthlyEarnings = monthlyPayments.reduce(
      (sum, p) => sum + (p.amountPaid || 0),
      0,
    );

    const monthlyCollectedFromOrders = orders.reduce((sum, order) => {
      const orderDate = new Date(order.createdAt || order.updatedAt || order.deliveryDate || Date.now());
      if (
        orderDate.getFullYear() === today.getFullYear() &&
        orderDate.getMonth() === today.getMonth()
      ) {
        return (
          sum +
          Math.max(
            0,
            (order.pricing?.totalAmount || 0) - (order.pricing?.balance || 0),
          )
        );
      }
      return sum;
    }, 0);

    const effectiveMonthlyEarnings = monthlyEarnings || monthlyCollectedFromOrders;

    // Extra Dashboard Cards
    const expenses = await Expense.find({ status: "Pending" });
    const rentExpenses = expenses
      .filter((e) => e.title.toLowerCase().includes("rent"))
      .reduce((sum, e) => sum + e.amount, 0);
    const billExpenses = expenses
      .filter((e) => e.title.toLowerCase().includes("bill"))
      .reduce((sum, e) => sum + e.amount, 0);

    // Simplified Salary Expense for now (just fetch staff list)
    const staffList = await User.find({ role: "Staff" }).select(
      "name salary totalSalaryPaid",
    );
    const staffCount = staffList.length;

    const staffPayoutDetails = staffList.map((staff) => {
      const estimatedPayout = staff.salary || 12000;
      const paid = staff.totalSalaryPaid || 0;
      return {
        name: staff.name,
        estimate: estimatedPayout,
        paid,
        amountDue: Math.max(0, estimatedPayout - paid),
      };
    });

    const pendingBalanceDetails = orders
      .filter((o) => (o.pricing?.balance || 0) > 0)
      .map((o) => ({
        orderId: o.orderId,
        customerName: o.customer?.name || "Unknown",
        amountDue: o.pricing?.balance || 0,
        totalAmount: o.pricing?.totalAmount || 0,
        advancePaid: o.pricing?.advancePaid || 0,
        dueDays: Math.max(
          0,
          Math.ceil((new Date(o.deliveryDate) - today) / (1000 * 60 * 60 * 24)),
        ),
      }));

    // reuse `payments` fetched earlier and `today` defined above
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6);
    const startOfMonth = new Date(today);
    startOfMonth.setMonth(today.getMonth() - 5);
    startOfMonth.setDate(1);
    const startOfYear = new Date(today);
    startOfYear.setFullYear(today.getFullYear() - 1);
    startOfYear.setMonth(0);
    startOfYear.setDate(1);

    const dailyPaidMap = {};
    const weeklyPaidMap = {};
    const monthlyPaidMap = {};
    const dailyPendingMap = {};
    const weeklyPendingMap = {};
    const monthlyPendingMap = {};

    const normalizeDateKey = (date) =>
      date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
      });

    const normalizeMonthKey = (date) =>
      date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

    const normalizeYearKey = (date) => date.getFullYear().toString();

    payments.forEach((payment) => {
      const paymentDate = new Date(
        payment.createdAt || payment.date || payment.updatedAt || Date.now(),
      );
      const dayKey = normalizeDateKey(paymentDate);
      const monthKey = normalizeMonthKey(paymentDate);
      const yearKey = normalizeYearKey(paymentDate);

      if (paymentDate >= startOfWeek) {
        dailyPaidMap[dayKey] = (dailyPaidMap[dayKey] || 0) + payment.amountPaid;
      }
      if (paymentDate >= startOfMonth) {
        weeklyPaidMap[monthKey] = (weeklyPaidMap[monthKey] || 0) + payment.amountPaid;
      }
      if (paymentDate >= startOfYear) {
        monthlyPaidMap[yearKey] = (monthlyPaidMap[yearKey] || 0) + payment.amountPaid;
      }
    });

    activeOrders.forEach((order) => {
      const orderBalance = order.pricing?.balance || 0;
      if (orderBalance <= 0 || !order.deliveryDate) return;
      const deliveryDate = new Date(order.deliveryDate);
      const dayKey = normalizeDateKey(deliveryDate);
      const monthKey = normalizeMonthKey(deliveryDate);
      const yearKey = normalizeYearKey(deliveryDate);

      if (deliveryDate >= startOfWeek) {
        dailyPendingMap[dayKey] =
          (dailyPendingMap[dayKey] || 0) + orderBalance;
      }
      if (deliveryDate >= startOfMonth) {
        weeklyPendingMap[monthKey] =
          (weeklyPendingMap[monthKey] || 0) + orderBalance;
      }
      if (deliveryDate >= startOfYear) {
        monthlyPendingMap[yearKey] =
          (monthlyPendingMap[yearKey] || 0) + orderBalance;
      }
    });

    const revenueGraph = {
      daily: Array.from({ length: 7 }).map((_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        const label = normalizeDateKey(date);
        return {
          name: label,
          paid: dailyPaidMap[label] || 0,
          balance: dailyPendingMap[label] || 0,
        };
      }),
      monthly: Array.from({ length: 4 }).map((_, index) => {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (3 - index) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const name = `Week ${index + 1}`;

        const paid = payments
          .filter((payment) => {
            const paymentDate = new Date(
              payment.createdAt || payment.date || payment.updatedAt || Date.now(),
            );
            return paymentDate >= weekStart && paymentDate <= weekEnd;
          })
          .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

        const balance = activeOrders
          .filter((order) => {
            const delivery = new Date(order.deliveryDate);
            return order.pricing?.balance > 0 && delivery >= weekStart && delivery <= weekEnd;
          })
          .reduce((sum, order) => sum + (order.pricing?.balance || 0), 0);

        return {
          name,
          paid,
          balance,
        };
      }),
      yearly: Array.from({ length: 12 }).map((_, index) => {
        const monthDate = new Date(today.getFullYear(), index, 1);
        const label = monthDate.toLocaleDateString("en-GB", { month: "short" });
        const paid = payments
          .filter((payment) => {
            const paymentDate = new Date(
              payment.createdAt || payment.date || payment.updatedAt || Date.now(),
            );
            return (
              paymentDate.getFullYear() === today.getFullYear() &&
              paymentDate.getMonth() === index
            );
          })
          .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        const balance = activeOrders
          .filter((order) => {
            const delivery = new Date(order.deliveryDate);
            return (
              order.pricing?.balance > 0 &&
              delivery.getFullYear() === today.getFullYear() &&
              delivery.getMonth() === index
            );
          })
          .reduce((sum, order) => sum + (order.pricing?.balance || 0), 0);
        return { name: label, paid, balance };
      }),
    };

    const orderGraph = {
      weekly: Array.from({ length: 7 }).map((_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        return {
          name: date.toLocaleDateString("en-GB", { weekday: "short" }),
          orders: orders.filter((order) => {
            const orderDate = new Date(
              order.orderDate || order.createdAt || Date.now(),
            );
            return orderDate.toDateString() === date.toDateString();
          }).length,
        };
      }),
      monthly: Array.from({ length: 4 }).map((_, index) => {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (3 - index) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return {
          name: `Week ${index + 1}`,
          orders: orders.filter((order) => {
            const orderDate = new Date(
              order.orderDate || order.createdAt || Date.now(),
            );
            return orderDate >= weekStart && orderDate <= weekEnd;
          }).length,
        };
      }),
      yearly: Array.from({ length: 12 }).map((_, index) => {
        const monthDate = new Date(today.getFullYear(), index, 1);
        const label = monthDate.toLocaleDateString("en-GB", { month: "short" });
        return {
          name: label,
          orders: orders.filter((order) => {
            const orderDate = new Date(
              order.orderDate || order.createdAt || Date.now(),
            );
            return (
              orderDate.getFullYear() === today.getFullYear() &&
              orderDate.getMonth() === index
            );
          }).length,
        };
      }),
    };

    res.json({
      totalOrders,
      completedOrders,
      pendingOrders,
      totalCustomers,
      totalOrderRevenue,
      totalRevenue,
      totalPendingPayments,
      activeOrders,
      stageCounts,
      overdueCount: overdueOrders.length,
      dueSoonCount: dueSoonOrders.length,
      topDueOrders,
      paymentMethods,
      cashVsOnline,
      totalCompletedPayments,
      monthlyEarnings: effectiveMonthlyEarnings,
      monthlyRevenueDetails,
      onlineOffline,
      paymentDetails,
      pendingBalanceDetails,
      orderRevenueDetails,
      dueSoonOrders,
      staffPayoutDetails,
      extraCards: {
        rentPending: settings.rentPending ?? rentExpenses,
        billsPending: settings.billsPending ?? billExpenses,
        staffCount: staffCount,
      },
      graphs: {
        revenueGraph,
        orderGraph,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/settings", protect, ownerOnly, async (req, res) => {
  try {
    const { rentPending, billsPending } = req.body;
    const updated = await DashboardSetting.findOneAndUpdate(
      {},
      {
        rentPending: Number(rentPending) || 0,
        billsPending: Number(billsPending) || 0,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/debug", protect, ownerOnly, async (req, res) => {
  try {
    const allOrders = await Order.find()
      .select("orderId pricing deliveryDate paymentStatus")
      .populate("customer", "name");
    const allPayments = await Payment.find()
      .populate({
        path: "order",
        populate: { path: "customer", select: "name" },
        select: "orderId",
      })
      .select("order amountPaid method status createdAt")
      .sort({ createdAt: -1 });

    const orderRevenueSum = allOrders.reduce(
      (sum, order) => sum + (order.pricing?.totalAmount || 0),
      0,
    );
    const pendingBalanceSum = allOrders.reduce(
      (sum, order) => sum + (order.pricing?.balance || 0),
      0,
    );
    const collectedPaymentSum = allPayments
      .filter((p) => /^success$/i.test(p.status))
      .reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
    const nonSuccessPayments = allPayments.filter(
      (p) => !/^success$/i.test(p.status),
    );

    res.json({
      orderRevenueSum,
      pendingBalanceSum,
      collectedPaymentSum,
      totalRevenueFromOrders: orderRevenueSum,
      totalRevenueCalculated: collectedPaymentSum + pendingBalanceSum,
      nonSuccessPayments,
      allOrders,
      allPayments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
