import express from "express";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Customer from "../models/Customer.js";
import Expense from "../models/Expense.js";
import User from "../models/User.js";
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

    const orders = await Order.find();
    let totalRevenue = 0;
    let totalPendingPayments = 0;

    orders.forEach((o) => {
      // revenue from advance paid on orders, plus we also have explicit payments
      totalRevenue += o.pricing?.totalAmount || 0; // Total expected revenue
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
    dueSoonDate.setDate(dueSoonDate.getDate() + 3);

    const overdueOrders = activeOrders.filter(
      (order) => new Date(order.deliveryDate) < today,
    );
    const dueSoonOrders = activeOrders.filter((order) => {
      const delivery = new Date(order.deliveryDate);
      return delivery >= today && delivery <= dueSoonDate;
    });

    const topDueOrders = [...activeOrders]
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

    const payments = await Payment.find({ status: "success" });
    const paymentMethods = { Cash: 0, UPI: 0, Card: 0, Online: 0 };
    let totalCompletedPayments = 0;

    payments.forEach((p) => {
      if (paymentMethods[p.method] !== undefined) {
        paymentMethods[p.method] += p.amountPaid;
      }
      totalCompletedPayments += p.amountPaid;
    });

    const onlineOffline = {
      Online: paymentMethods.UPI + paymentMethods.Online,
      Offline: paymentMethods.Cash + paymentMethods.Card,
    };

    const startOfThisMonth = new Date();
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0, 0, 0, 0);
    const monthlyPayments = await Payment.find({
      status: "success",
      createdAt: { $gte: startOfThisMonth },
    });
    const monthlyEarnings = monthlyPayments.reduce(
      (sum, p) => sum + p.amountPaid,
      0,
    );

    // Extra Dashboard Cards
    const expenses = await Expense.find({ status: "Pending" });
    const rentExpenses = expenses
      .filter((e) => e.title.toLowerCase().includes("rent"))
      .reduce((sum, e) => sum + e.amount, 0);
    const billExpenses = expenses
      .filter((e) => e.title.toLowerCase().includes("bill"))
      .reduce((sum, e) => sum + e.amount, 0);

    // Simplified Salary Expense for now (just fetch staff count)
    const staffCount = await User.countDocuments({ role: "Staff" });

    // reuse `payments` fetched earlier and `today` defined above
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6);
    const startOfMonth = new Date(today);
    startOfMonth.setMonth(today.getMonth() - 5);
    startOfMonth.setDate(1);
    const startOfYear = new Date(today);
    startOfYear.setFullYear(today.getFullYear() - 2);
    startOfYear.setMonth(0);
    startOfYear.setDate(1);

    const dailyRevenueMap = {};
    const monthlyRevenueMap = {};
    const yearlyRevenueMap = {};

    payments.forEach((payment) => {
      const paymentDate = new Date(
        payment.createdAt || payment.date || payment.updatedAt || Date.now(),
      );
      const dayKey = paymentDate.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
      });
      const monthKey = paymentDate.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });
      const yearKey = paymentDate.getFullYear().toString();

      if (paymentDate >= startOfWeek) {
        dailyRevenueMap[dayKey] =
          (dailyRevenueMap[dayKey] || 0) + payment.amountPaid;
      }
      if (paymentDate >= startOfMonth) {
        monthlyRevenueMap[monthKey] =
          (monthlyRevenueMap[monthKey] || 0) + payment.amountPaid;
      }
      if (paymentDate >= startOfYear) {
        yearlyRevenueMap[yearKey] =
          (yearlyRevenueMap[yearKey] || 0) + payment.amountPaid;
      }
    });

    const revenueGraph = {
      daily: Array.from({ length: 7 }).map((_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        const label = date.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
        });
        return {
          name: label,
          paid: dailyRevenueMap[label] || 0,
          balance: 0,
        };
      }),
      // Monthly view: show current month's 4 week buckets
      monthly: Array.from({ length: 4 }).map((_, index) => {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const weekStart = new Date(monthStart);
        weekStart.setDate(1 + index * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const paid = payments
          .filter((payment) => {
            const paymentDate = new Date(
              payment.createdAt ||
                payment.date ||
                payment.updatedAt ||
                Date.now(),
            );
            return paymentDate >= weekStart && paymentDate <= weekEnd;
          })
          .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

        return {
          name: `Week ${index + 1}`,
          paid,
          balance: 0,
        };
      }),
      // Yearly view: show each month of the current year
      yearly: Array.from({ length: 12 }).map((_, index) => {
        const monthDate = new Date(today.getFullYear(), index, 1);
        const label = monthDate.toLocaleDateString("en-GB", { month: "short" });
        const paid = payments
          .filter((payment) => {
            const paymentDate = new Date(
              payment.createdAt ||
                payment.date ||
                payment.updatedAt ||
                Date.now(),
            );
            return (
              paymentDate.getFullYear() === today.getFullYear() &&
              paymentDate.getMonth() === index
            );
          })
          .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        return {
          name: label,
          paid,
          balance: 0,
        };
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
      totalRevenue,
      totalPendingPayments,
      activeOrders,
      stageCounts,
      overdueCount: overdueOrders.length,
      dueSoonCount: dueSoonOrders.length,
      topDueOrders,
      paymentMethods,
      totalCompletedPayments,
      monthlyEarnings,
      onlineOffline,
      extraCards: {
        rentPending: rentExpenses,
        billsPending: billExpenses,
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

export default router;
