import { useState, useEffect } from "react";
import api from "../api/axios";
import {
  Search,
  Plus,
  X,
  Edit,
  Trash2,
  Calendar,
  IndianRupee,
  Filter,
  Columns,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  PenTool,
  FileText,
  Download,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import WhiteboardModal from "../components/WhiteboardModal";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All Products");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [editingOrder, setEditingOrder] = useState(null);

  const [scheduleData, setScheduleData] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(null);
  const [activeWhiteboard, setActiveWhiteboard] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: "",
    method: "Cash",
    transactionId: "",
  });
  const { user } = useAuth();

  const initialForm = {
    customer: "",
    customerName: "",
    customerPhone: "",
    dressType: "",
    fabricDetails: "",
    deliveryDate: "",
    assignedStaff: "",
    pricing: { totalAmount: "", advancePaid: "" },
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get(`/orders`);
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders", error);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [custData, staffData] = await Promise.all([
        api.get("/customers"),
        api.get("/staff"),
      ]);
      setCustomers(custData.data);
      setStaffList(staffData.data);
    } catch (error) {
      console.error("Failed to fetch dependencies", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDependencies();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "totalAmount" || name === "advancePaid") {
      setFormData({
        ...formData,
        pricing: { ...formData.pricing, [name]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    setFormData(initialForm);
    setModalStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modalStep < (user?.role === "Owner" ? 3 : 2)) {
      setModalStep(modalStep + 1);
      return;
    }

    try {
      const payload = {
        ...formData,
        pricing: {
          totalAmount: Number(formData.pricing.totalAmount),
          advancePaid: Number(formData.pricing.advancePaid || 0),
        },
      };

      // Basic fallback since we allow raw name/phone entry in step 1 UI
      if (!payload.customer && customers.length > 0) {
        payload.customer = customers[0]._id; // fallback for mocked step 1
      }

      if (!payload.assignedStaff) delete payload.assignedStaff;

      if (editingOrder) {
        await api.put(`/orders/${editingOrder._id}`, payload);
      } else {
        await api.post("/orders", payload);
      }
      closeModal();
      fetchOrders();
    } catch (error) {
      console.error("Failed to save order", error);
      alert(error.response?.data?.message || "Error saving order");
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/payments", {
        orderId: paymentOrder._id,
        amountPaid: Number(paymentForm.amountPaid),
        method: paymentForm.method,
        transactionId: paymentForm.transactionId,
      });
      setPaymentOrder(null);
      setPaymentForm({ amountPaid: "", method: "Cash", transactionId: "" });
      fetchOrders();
    } catch (error) {
      console.error("Failed to record payment", error);
      alert(error.response?.data?.message || "Error recording payment");
    }
  };

  const editOrder = (order) => {
    setEditingOrder(order);
    setFormData({
      customer: order.customer?._id || "",
      customerName: order.customer?.name || "",
      customerPhone: order.customer?.phone || "",
      dressType: order.dressType || "",
      fabricDetails: order.fabricDetails || "",
      deliveryDate: order.deliveryDate
        ? new Date(order.deliveryDate).toISOString().split("T")[0]
        : "",
      assignedStaff: order.assignedStaff?._id || "",
      pricing: {
        totalAmount: order.pricing?.totalAmount || "",
        advancePaid: order.pricing?.advancePaid || "",
      },
    });
    setModalStep(1);
    setIsModalOpen(true);
  };

  const deleteOrder = async (id) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await api.delete(`/orders/${id}`);
        fetchOrders();
      } catch (error) {
        console.error("Failed to delete", error);
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      "Measurement done": "bg-gray-100 text-gray-600 border-gray-200",
      Cutting: "bg-blue-50 text-blue-600 border-blue-200",
      Stitching: "bg-orange-50 text-orange-600 border-orange-200",
      Trial: "bg-purple-50 text-purple-600 border-purple-200",
      "Final adjustment": "bg-pink-50 text-pink-600 border-pink-200",
      Ready: "bg-[#E5F6E5] text-[#059669] border-[#A7F3D0]",
      Delivered: "bg-gray-100 text-gray-500 border-gray-200",
    };
    return badges[status] || "bg-gray-50 text-gray-600 border-gray-200";
  };

  const generateOfficialBill = (order) => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(109, 40, 217);
    doc.text("OFFICIAL BILL", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Order & Customer Info
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const section1 = [
      { label: "Order ID:", value: order.orderId || "N/A" },
      { label: "Customer Name:", value: order.customer?.name || "N/A" },
      { label: "Phone:", value: order.customer?.phone || "N/A" },
    ];

    section1.forEach((item) => {
      doc.setFont(undefined, "bold");
      doc.text(item.label, 20, yPos);
      doc.setFont(undefined, "normal");
      doc.text(item.value, 70, yPos);
      yPos += 8;
    });

    yPos += 5;

    // Product Details
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("PRODUCT DETAILS", 20, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(11);

    const section2 = [
      { label: "Product:", value: order.dressType || "N/A" },
      {
        label: "Fabric Details:",
        value: (order.fabricDetails || "N/A").substring(0, 50),
      },
    ];

    section2.forEach((item) => {
      doc.setFont(undefined, "bold");
      doc.text(item.label, 20, yPos);
      doc.setFont(undefined, "normal");
      doc.text(item.value, 70, yPos);
      yPos += 8;
    });

    yPos += 5;

    // Payment Section
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("PAYMENT DETAILS", 20, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(11);

    const totalAmount = order.pricing?.totalAmount || 0;
    const advancePaid = order.pricing?.advancePaid || 0;
    const balance = totalAmount - advancePaid;

    const section3 = [
      { label: "Total Amount:", value: `₹ ${totalAmount.toLocaleString()}` },
      { label: "Advance Paid:", value: `₹ ${advancePaid.toLocaleString()}` },
      { label: "Balance Due:", value: `₹ ${balance.toLocaleString()}` },
    ];

    section3.forEach((item) => {
      doc.setFont(undefined, "bold");
      doc.text(item.label, 20, yPos);
      doc.setFont(undefined, "normal");
      const textWidth = doc.getTextWidth(item.value);
      doc.text(item.value, pageWidth - 20 - textWidth, yPos);
      yPos += 8;
    });

    yPos += 5;

    // Delivery Info
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("DELIVERY INFORMATION", 20, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(11);

    const deliveryDate = new Date(order.deliveryDate).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );

    doc.text(`Delivery Date: ${deliveryDate}`, 20, yPos);
    yPos += 8;
    doc.text(`Status: ${order.status}`, 20, yPos);
    yPos += 15;

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Thank you for your business!", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 6;
    doc.text(
      `Generated on: ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      yPos,
      { align: "center" },
    );

    doc.save(`${order.orderId}_Official_Bill.pdf`);
  };

  const generateCompleteReport = (order) => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(109, 40, 217);
    doc.text("COMPLETE ORDER REPORT", pageWidth / 2, yPos, { align: "center" });
    yPos += 12;

    // Order Summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "bold");
    doc.text(
      `Order: ${order.orderId} | Customer: ${order.customer?.name}`,
      20,
      yPos,
    );
    yPos += 8;

    const whiteboard = order.whiteboard || {};

    // Extra Data and Notes
    if (whiteboard.extraDataAndNotes) {
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("EXTRA DATA AND NOTES:", 20, yPos);
      yPos += 6;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      const extraLines = doc.splitTextToSize(
        whiteboard.extraDataAndNotes,
        pageWidth - 40,
      );
      doc.text(extraLines, 20, yPos);
      yPos += extraLines.length * 4 + 5;
    }

    doc.save(`${order.orderId}_Complete_Report.pdf`);
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      (o.orderId || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.customer?.name || "").toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (activeTab === "All Products") return true;
    if (activeTab === "Current" && o.status !== "Delivered") return true;
    if (activeTab === "Delayed") {
      const days = Math.ceil(
        (new Date(o.deliveryDate) - new Date()) / (1000 * 60 * 60 * 24),
      );
      return days < 0 && o.status !== "Delivered";
    }
    // simple matching for other tabs conceptually
    return o.status === activeTab;
  });

  const tabs = [
    "All Products",
    "Current",
    "Delayed",
    "Alteration",
    "Out for Delivery",
  ];

  const getAIGuess = (order) => {
    const start = new Date(order.orderDate || order.createdAt || Date.now());
    const end = new Date(order.deliveryDate);
    const totalDays = Math.max(
      1,
      Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
    );

    let cuttingDays = Math.max(1, Math.floor(totalDays * 0.22));
    let stitchingDays = Math.max(2, Math.floor(totalDays * 0.42));
    let trialDays = Math.max(1, Math.floor(totalDays * 0.18));
    let finalDays = totalDays - cuttingDays - stitchingDays - trialDays;
    if (finalDays < 1) finalDays = 1;

    const cuttingDate = new Date(start);
    cuttingDate.setDate(cuttingDate.getDate() + cuttingDays);

    const stitchingEnd = new Date(cuttingDate);
    stitchingEnd.setDate(stitchingEnd.getDate() + stitchingDays);

    const trialDate = new Date(stitchingEnd);
    trialDate.setDate(trialDate.getDate() + trialDays);

    const finalDate = new Date(trialDate);
    finalDate.setDate(finalDate.getDate() + finalDays);

    return {
      cuttingEndDate: cuttingDate.toISOString().split("T")[0],
      stitchingEndDate: stitchingEnd.toISOString().split("T")[0],
      trialEndDate: trialDate.toISOString().split("T")[0],
      finalWorkEndDate:
        finalDate > end
          ? end.toISOString().split("T")[0]
          : finalDate.toISOString().split("T")[0],
      deliveryDate: end.toISOString().split("T")[0],
    };
  };

  const applyScheduleToOrder = async (order) => {
    try {
      const schedule = scheduleForm || getAIGuess(order);
      await api.put(`/orders/${order._id}`, { schedule });
      setScheduleData(null);
      setScheduleForm(null);
      fetchOrders();
      toast.success("Schedule applied to order");
    } catch (error) {
      console.error("Failed to apply schedule", error);
      toast.error("Could not save schedule");
    }
  };

  const buildScheduleForm = (order) => {
    if (!order) return null;
    const rawSchedule = order.schedule || {};

    const getDate = (stageKey, fallbackKey, fallbackDate) => {
      const stage = rawSchedule[stageKey] || rawSchedule[fallbackKey];
      if (!stage)
        return fallbackDate ? fallbackDate.toISOString().split("T")[0] : "";
      if (typeof stage === "string" || stage instanceof Date)
        return new Date(stage).toISOString().split("T")[0];
      const dateValue = stage.endDate || stage.date || null;
      return dateValue
        ? new Date(dateValue).toISOString().split("T")[0]
        : fallbackDate
          ? fallbackDate.toISOString().split("T")[0]
          : "";
    };

    const delivery = new Date(order.deliveryDate);
    const fallbackTrial = new Date(delivery);
    fallbackTrial.setDate(fallbackTrial.getDate() - 1);
    const fallbackStitching = new Date(delivery);
    fallbackStitching.setDate(fallbackStitching.getDate() - 2);
    const fallbackCutting = new Date(delivery);
    fallbackCutting.setDate(fallbackCutting.getDate() - 4);

    return {
      cuttingEndDate: getDate("cutting", "cuttingDate", fallbackCutting),
      stitchingEndDate: getDate(
        "stitching",
        "stitchingDate",
        fallbackStitching,
      ),
      trialEndDate: getDate("trial", "trialDate", fallbackTrial),
      finalWorkEndDate: getDate("finalWork", "finalWorkDate", delivery),
      deliveryDate: getDate("delivery", "deliveryDate", delivery),
    };
  };

  const getScheduleDates = (order) => {
    const rawSchedule = order.schedule || {};

    const getStageEndDate = (stageKey, fallbackKey) => {
      const stage = rawSchedule[stageKey] || rawSchedule[fallbackKey];
      if (!stage) return null;
      if (typeof stage === "string" || stage instanceof Date)
        return new Date(stage);
      return new Date(stage.endDate || stage.date || null);
    };

    const delivery = new Date(order.deliveryDate);
    const fallbackTrial = new Date(delivery);
    fallbackTrial.setDate(fallbackTrial.getDate() - 1);

    const fallbackStitching = new Date(delivery);
    fallbackStitching.setDate(fallbackStitching.getDate() - 2);

    const fallbackCutting = new Date(delivery);
    fallbackCutting.setDate(fallbackCutting.getDate() - 4);

    const cuttingDate =
      getStageEndDate("cutting", "cuttingDate") || fallbackCutting;
    const stitchingEnd =
      getStageEndDate("stitching", "stitchingDate") || fallbackStitching;
    const trialDate = getStageEndDate("trial", "trialDate") || fallbackTrial;
    const finalDate = getStageEndDate("finalWork", "finalWorkDate") || delivery;

    const hasCustomSchedule =
      Boolean(rawSchedule.cutting) ||
      Boolean(rawSchedule.stitching) ||
      Boolean(rawSchedule.trial) ||
      Boolean(rawSchedule.finalWork) ||
      Boolean(rawSchedule.cuttingDate) ||
      Boolean(rawSchedule.stitchingDate) ||
      Boolean(rawSchedule.trialDate) ||
      Boolean(rawSchedule.finalWorkDate);

    return {
      cuttingDate,
      stitchingEnd,
      trialDate,
      finalDate,
      delivery,
      hasCustomSchedule,
    };
  };

  const renderScheduleModal = (order) => {
    const {
      cuttingDate,
      stitchingEnd,
      trialDate,
      finalDate,
      delivery,
      hasCustomSchedule,
    } = getScheduleDates(order);

    const values = scheduleForm || {
      cuttingEndDate: cuttingDate.toISOString().split("T")[0],
      stitchingEndDate: stitchingEnd.toISOString().split("T")[0],
      trialEndDate: trialDate.toISOString().split("T")[0],
      finalWorkEndDate: finalDate.toISOString().split("T")[0],
      deliveryDate: delivery.toISOString().split("T")[0],
    };

    return (
      <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative max-h-[calc(100vh-4rem)] overflow-y-auto">
          <button
            onClick={() => {
              setScheduleData(null);
              setScheduleForm(null);
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-lg font-bold text-gray-800 mb-3">
            Smart Work Schedule
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="text-sm text-gray-500">
              Edit or save the schedule for this order.
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setScheduleForm(getAIGuess(order))}
                className="inline-flex items-center justify-center rounded-lg border border-[#6D28D9] px-4 py-2 text-sm font-semibold text-[#6D28D9] shadow-sm transition-colors hover:bg-[#EEF2FF]"
              >
                AI Suggestion
              </button>
              <button
                type="button"
                onClick={() => applyScheduleToOrder(order)}
                className="inline-flex items-center justify-center rounded-lg bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5B21B6]"
              >
                Save Schedule
              </button>
            </div>
          </div>
          {hasCustomSchedule && (
            <div className="mb-4 text-xs text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
              This schedule uses the order&apos;s saved manual/AI configuration
              when available.
            </div>
          )}

          <div className="space-y-4 text-sm">
            <label className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="font-semibold text-purple-600">
                ✂️ Cutting Complete
              </span>
              <input
                type="date"
                value={values.cuttingEndDate}
                onChange={(e) =>
                  setScheduleForm({ ...values, cuttingEndDate: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm focus:border-[#6D28D9] focus:outline-none focus:ring-2 focus:ring-[#EEF2FF]"
              />
            </label>
            <label className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="font-semibold text-blue-600">
                🧵 Stitching Complete
              </span>
              <input
                type="date"
                value={values.stitchingEndDate}
                onChange={(e) =>
                  setScheduleForm({
                    ...values,
                    stitchingEndDate: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm focus:border-[#6D28D9] focus:outline-none focus:ring-2 focus:ring-[#EEF2FF]"
              />
            </label>
            <label className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="font-semibold text-orange-600">
                👗 Trial Ready
              </span>
              <input
                type="date"
                value={values.trialEndDate}
                onChange={(e) =>
                  setScheduleForm({ ...values, trialEndDate: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm focus:border-[#6D28D9] focus:outline-none focus:ring-2 focus:ring-[#EEF2FF]"
              />
            </label>
            <label className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="font-semibold text-pink-600">
                ✨ Final Work Done
              </span>
              <input
                type="date"
                value={values.finalWorkEndDate}
                onChange={(e) =>
                  setScheduleForm({
                    ...values,
                    finalWorkEndDate: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm focus:border-[#6D28D9] focus:outline-none focus:ring-2 focus:ring-[#EEF2FF]"
              />
            </label>

            <label className="flex flex-col gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
              <span className="font-semibold text-green-700">📦 Delivery</span>
              <input
                type="date"
                value={values.deliveryDate}
                disabled
                className="w-full rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-gray-600"
              />
            </label>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            ⚡ Edit the dates above and click Save Schedule to persist them to
            the order.
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full bg-[#FDFDFD]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-100 pb-4 mb-6">
        <div className="flex gap-6 overflow-x-auto custom-scrollbar w-full md:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 whitespace-nowrap text-sm font-semibold transition-colors relative ${activeTab === tab ? "text-[#6D28D9]" : "text-gray-500 hover:text-gray-800"}`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-t-full"></div>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-1 focus:ring-[#6D28D9] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
          </div>
          <button
            onClick={() => {
              setEditingOrder(null);
              setFormData(initialForm);
              setModalStep(1);
              setIsModalOpen(true);
            }}
            className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm ml-2 tracking-wide"
          >
            Configure Order
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-100 flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#FAF9FF] text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Client Details</th>
                <th className="px-6 py-4 font-semibold">Task Status</th>
                <th className="px-6 py-4 font-semibold">Delivery Date</th>
                <th className="px-6 py-4 font-semibold">Days Left</th>
                <th className="px-6 py-4 font-semibold flex items-center justify-between">
                  Actions
                  <div className="flex items-center gap-1 text-gray-400">
                    <span className="bg-white border border-gray-200 rounded px-2 tracking-normal text-gray-600 text-[10px]">
                      ■ Ongoing
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o, idx) => {
                const days = Math.ceil(
                  (new Date(o.deliveryDate) - new Date()) /
                    (1000 * 60 * 60 * 24),
                );
                const isOverdue = days < 0;
                return (
                  <tr
                    key={o._id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">
                          {o.orderId || o._id.slice(-5)}
                        </span>
                        <span className="text-xs text-gray-400">1 item</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[#6D28D9] font-medium text-sm hover:underline cursor-pointer">
                          {o.customer?.name || "Unknown"} -{" "}
                          {o.dressType.split(" ")[0]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-widest inline-block ${getStatusBadge(o.status)}`}
                      >
                        {o.status.split(" ")[0]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium text-sm">
                      {new Date(o.deliveryDate).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {o.status === "Delivered" ? (
                          <span className="text-sm font-medium text-green-600">
                            ✓ Completed
                          </span>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-gray-700">
                              {Math.abs(days)} day{Math.abs(days) !== 1 && "s"}
                            </span>
                            {isOverdue && (
                              <span className="bg-[#FEF2F2] text-[#EF4444] border border-[#FCA5A5] px-1.5 py-0.5 rounded text-[10px] font-bold uppercase hidden md:inline-block">
                                Overdue
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      <div className="flex gap-3 flex-wrap">
                        {o.status === "Delivered" ? (
                          <>
                            <button
                              onClick={() => generateOfficialBill(o)}
                              className="hover:text-blue-600 transition-colors"
                              title="Download Official Bill"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => generateCompleteReport(o)}
                              className="hover:text-purple-600 transition-colors"
                              title="Download Complete Report"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {user?.role === "Owner" && (
                              <button
                                onClick={() => setPaymentOrder(o)}
                                className="hover:text-emerald-500 transition-colors"
                                title="Record Payment"
                              >
                                <IndianRupee className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setActiveWhiteboard(o)}
                              className="hover:text-purple-600 transition-colors"
                              title="Whiteboard & PDF"
                            >
                              <PenTool className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setScheduleData(o);
                                setScheduleForm(buildScheduleForm(o));
                              }}
                              className="hover:text-[#6D28D9] transition-colors"
                              title="AI Schedule"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => editOrder(o)}
                          className="hover:text-blue-500 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {user?.role === "Owner" && (
                          <button
                            onClick={() => deleteOrder(o._id)}
                            className="hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    No products match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination mock */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-white mt-auto">
          <span>Total {filteredOrders.length} Items</span>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-gray-100 rounded text-gray-400">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-6 h-6 rounded flex items-center justify-center bg-[#6D28D9] text-white font-medium shadow-sm">
              1
            </button>
            <button className="p-1 hover:bg-gray-100 rounded text-gray-400">
              <ChevronRight className="w-4 h-4" />
            </button>
            <select className="ml-3 outline-none bg-transparent cursor-pointer font-medium text-gray-600 border border-gray-200 rounded px-1 py-0.5">
              <option>10 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create Order Stepper Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div
            className="bg-[#fcfcfc] rounded-2xl shadow-xl w-full max-w-4xl flex overflow-hidden border border-gray-200"
            style={{ height: "70vh" }}
          >
            {/* Left side stepper indicators */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 p-8 flex flex-col justify-center gap-10">
              <h2 className="text-xl font-bold text-gray-800 absolute top-8 left-8">
                Create new order
              </h2>

              <div className="flex gap-4 items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${modalStep >= 1 ? "bg-[#2563EB] text-white" : "bg-gray-200 text-gray-500"}`}
                >
                  1
                </div>
                <span
                  className={`font-semibold text-sm ${modalStep >= 1 ? "text-gray-800" : "text-gray-400"}`}
                >
                  Client Details
                </span>
              </div>
              <div className="flex gap-4 items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${modalStep >= 2 ? "bg-[#2563EB] text-white" : "bg-gray-200 text-gray-500"}`}
                >
                  2
                </div>
                <span
                  className={`font-semibold text-sm ${modalStep >= 2 ? "text-gray-800" : "text-gray-400"}`}
                >
                  Product Details
                </span>
              </div>
              {user?.role === "Owner" && (
                <div className="flex gap-4 items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${modalStep >= 3 ? "bg-[#2563EB] text-white" : "bg-gray-200 text-gray-500"}`}
                  >
                    3
                  </div>
                  <span
                    className={`font-semibold text-sm ${modalStep >= 3 ? "text-gray-800" : "text-gray-400"}`}
                  >
                    Payment Details
                  </span>
                </div>
              )}
            </div>

            {/* Right side form content */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
              <div className="flex justify-end p-4 pb-0">
                <button
                  onClick={closeModal}
                  type="button"
                  className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 pt-4 flex flex-col justify-center pb-24">
                <form
                  onSubmit={handleSubmit}
                  className="w-full max-w-md mx-auto"
                >
                  {/* STEP 1: Client Details */}
                  {modalStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          * Mobile Number
                        </label>
                        <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                          <div className="bg-gray-50 px-3 py-2 border-r border-gray-300 flex items-center gap-2">
                            <span className="text-sm font-medium">🇮🇳</span>{" "}
                            <span className="text-sm font-medium text-gray-600">
                              +91
                            </span>
                          </div>
                          <input
                            required
                            type="text"
                            name="customerPhone"
                            value={formData.customerPhone}
                            onChange={handleInputChange}
                            className="flex-1 px-3 py-2 text-sm focus:outline-none"
                            placeholder="9876543210"
                            disabled={!!editingOrder}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Please enter a valid 10-digit phone number.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          * Name
                        </label>
                        <input
                          required
                          type="text"
                          name="customerName"
                          value={formData.customerName}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                          placeholder="Client name"
                          disabled={!!editingOrder}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Address
                        </label>
                        <textarea
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow min-h-[80px]"
                          placeholder="Client address..."
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Product Details */}
                  {modalStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          * Dress Type
                        </label>
                        <input
                          required
                          type="text"
                          name="dressType"
                          value={formData.dressType}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                          placeholder="e.g. Blouse"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          * Delivery Date
                        </label>
                        <input
                          required
                          type="date"
                          name="deliveryDate"
                          value={formData.deliveryDate}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-700"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Fabric / Notes
                        </label>
                        <textarea
                          name="fabricDetails"
                          value={formData.fabricDetails}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow min-h-[80px]"
                          placeholder="Fabric details, measurements..."
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Payment Details (Owner Only) */}
                  {modalStep === 3 && user?.role === "Owner" && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          * Total Amount (₹)
                        </label>
                        <input
                          required
                          type="number"
                          name="totalAmount"
                          value={formData.pricing.totalAmount}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                          placeholder="ex: 5000"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Advance Paid (₹)
                        </label>
                        <input
                          type="number"
                          name="advancePaid"
                          value={formData.pricing.advancePaid}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                          placeholder="ex: 2000"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Assign to Staff (Optional)
                        </label>
                        <select
                          name="assignedStaff"
                          value={formData.assignedStaff}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white text-gray-700"
                        >
                          <option value="">-- Unassigned --</option>
                          {staffList.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-8 right-12 left-12 flex justify-between">
                    {modalStep > 1 ? (
                      <button
                        type="button"
                        onClick={() => setModalStep(modalStep - 1)}
                        className="px-6 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                      >
                        Back
                      </button>
                    ) : (
                      <div></div>
                    )}
                    <button
                      type="submit"
                      className="px-8 py-2.5 rounded-lg font-bold bg-[#2563EB] hover:bg-blue-700 text-white shadow-md transition-colors text-sm tracking-wide"
                    >
                      {modalStep < (user?.role === "Owner" ? 3 : 2)
                        ? "Next"
                        : "Save Order"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal (Unchanged styling for now, just functional) */}
      {scheduleData && renderScheduleModal(scheduleData)}

      {/* Payment Modal (Keep simple) */}
      {paymentOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setPaymentOrder(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Record Payment
            </h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="text-sm font-medium text-gray-600">
                Balance:{" "}
                <span className="text-red-500 font-bold">
                  ₹{paymentOrder.pricing?.balance}
                </span>
              </div>
              <input
                required
                type="number"
                value={paymentForm.amountPaid}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amountPaid: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                placeholder="Amount"
              />
              <select
                value={paymentForm.method}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, method: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
              </select>
              <button
                type="submit"
                className="w-full bg-[#6D28D9] text-white py-2.5 rounded-lg font-bold text-sm"
              >
                Save Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Whiteboard Modal */}
      {activeWhiteboard && (
        <WhiteboardModal
          order={activeWhiteboard}
          onClose={() => setActiveWhiteboard(null)}
          fetchOrders={fetchOrders}
        />
      )}
    </div>
  );
};

export default Orders;
