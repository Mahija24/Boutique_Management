import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Cell as PieCell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  Receipt,
  Package,
  Clock,
  Truck,
  Sigma,
  Home,
  Zap,
  Users,
  AlertTriangle,
  X,
  UserCheck,
  Calendar,
  Plus,
  Trash2,
  ImageIcon,
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEmployeePopup, setShowEmployeePopup] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [revenueView, setRevenueView] = useState("Daily");
  const [orderView, setOrderView] = useState("Weekly");
  const [editingRent, setEditingRent] = useState(false);
  const [editingBill, setEditingBill] = useState(false);
  const [rentValue, setRentValue] = useState(0);
  const [billValue, setBillValue] = useState(0);
  const [detailModal, setDetailModal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDebugData, setDetailDebugData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [employeeAvailability, setEmployeeAvailability] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [uploadImageName, setUploadImageName] = useState("");
  const [uploadImageFile, setUploadImageFile] = useState(null);

  const buildEmployeeAvailability = (staff) => {
    const roleMap = {};
    staff.forEach((member) => {
      if (!member) return;
      let roles = [];
      if (Array.isArray(member.staffRoles)) {
        roles = member.staffRoles.slice();
      } else if (typeof member.staffRoles === "string") {
        roles = [member.staffRoles];
      }
      if (roles.length === 0) roles = ["General Staff"];

      roles.forEach((role) => {
        const normalizedRole = role || "General Staff";
        if (!roleMap[normalizedRole]) {
          roleMap[normalizedRole] = {
            name: normalizedRole,
            value: 0,
            staff: [],
          };
        }
        roleMap[normalizedRole].value += 1;
        roleMap[normalizedRole].staff.push(member.name || "Unknown");
      });
    });
    return Object.values(roleMap).sort((a, b) => b.value - a.value);
  };

  const saveDashboardSettings = async (rentPending, billsPending) => {
    try {
      const { data } = await api.post("/dashboard/settings", {
        rentPending,
        billsPending,
      });
      setStats((prev) => ({
        ...prev,
        extraCards: {
          ...prev?.extraCards,
          rentPending: data.rentPending,
          billsPending: data.billsPending,
        },
      }));
      return true;
    } catch (error) {
      console.error("Failed to save dashboard settings", error);
      alert(
        error.response?.data?.message ||
          "Failed to save rent/bill settings. Please try again.",
      );
      return false;
    }
  };

  const openDetailModal = async (type) => {
    setDetailModal(null);
    setDetailDebugData(null);
    setDetailLoading(true);
    try {
      const { data } = await api.get("/dashboard/debug");
      setDetailDebugData(data);
    } catch (error) {
      console.error("Failed to fetch dashboard debug details", error);
    } finally {
      setDetailLoading(false);
      setDetailModal(type);
    }
  };

  const closeDetailModal = () => {
    setDetailModal(null);
    setDetailDebugData(null);
  };

  const formatCurrency = (value) =>
    typeof value === "number" ? `₹${value.toLocaleString()}` : "₹0";

  const getDetailModalTitle = () => {
    switch (detailModal) {
      case "revenue":
        return "Payment Breakdown";
      case "monthlyEarnings":
        return "Monthly Revenue";
      case "orderRevenue":
        return "Order Revenue Details";
      case "collected":
        return "Collected Payments";
      case "pending":
        return "Pending Balances";
      case "payout":
        return "Employee Payout Estimate";
      default:
        return "Details";
    }
  };

  const getAllPayments = () => {
    const viewPayments = stats?.paymentDetails || [];
    if (viewPayments.length > 0) return viewPayments;
    if (!detailDebugData?.allPayments) return [];
    return detailDebugData.allPayments
      .filter((p) => /^success$/i.test(p.status))
      .map((p) => ({
        orderId: p.order?.orderId || "N/A",
        customerName: p.order?.customer?.name || "Unknown",
        amountPaid: p.amountPaid,
        method: p.method,
        recordedBy: p.recordedBy?.name || p.recordedBy || "System",
        date: p.createdAt || p.date || new Date().toISOString(),
        totalAmount: p.order?.pricing?.totalAmount || 0,
        balance: p.order?.pricing?.balance || 0,
      }));
  };

  const getMonthlyPayments = () => {
    const monthlyDetails = stats?.monthlyRevenueDetails || [];
    if (monthlyDetails.length > 0) return monthlyDetails;
    
    // Fallback: Calculate from all payments
    const allPayments = getAllPayments();
    if (allPayments.length === 0) return [];
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const filtered = allPayments.filter((item) => {
      const dt = new Date(item.date || item.createdAt);
      return dt.getFullYear() === currentYear && dt.getMonth() === currentMonth;
    });
    
    // If no payments this month, return summary instead
    if (filtered.length === 0) {
      const monthlyTotal = allPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      return allPayments.slice(0, 10).map((p) => ({
        ...p,
        isMonthlyView: true,
        monthlyNote: `Total this month: ₹${monthlyTotal.toLocaleString()}`
      }));
    }
    
    return filtered;
  };

  const getDetailModalItems = () => {
    if (!stats) return [];
    const allPayments = getAllPayments();

    if (detailModal === "revenue" || detailModal === "collected") {
      return allPayments;
    }

    if (detailModal === "monthlyEarnings") {
      return getMonthlyPayments();
    }

    if (detailModal === "orderRevenue") {
      return (
        stats.orderRevenueDetails ||
        (detailDebugData?.allOrders || []).map((o) => ({
          orderId: o.orderId,
          customerName: o.customer?.name || "Unknown",
          totalAmount: o.pricing?.totalAmount || 0,
          advancePaid: o.pricing?.advancePaid || 0,
          balance: o.pricing?.balance || 0,
          collected: (o.pricing?.totalAmount || 0) - (o.pricing?.balance || 0),
          status: o.status,
          deliveryDate: o.deliveryDate,
        }))
      );
    }

    if (detailModal === "pending") {
      const pendingItems = stats.pendingBalanceDetails || [];
      if (pendingItems.length > 0) return pendingItems;
      return (detailDebugData?.allOrders || [])
        .filter((o) => (o.pricing?.balance || 0) > 0)
        .map((o) => ({
          orderId: o.orderId,
          customerName: o.customer?.name || "Unknown",
          amountDue: o.pricing?.balance || 0,
          dueDays: Math.max(
            0,
            Math.ceil(
              (new Date(o.deliveryDate) - new Date()) / (1000 * 60 * 60 * 24),
            ),
          ),
          totalAmount: o.pricing?.totalAmount || 0,
          advancePaid: o.pricing?.advancePaid || 0,
        }));
    }

    if (detailModal === "payout") {
      return stats.staffPayoutDetails || [];
    }

    return [];
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        if (user?.role === "Owner") {
          const { data } = await api.get("/dashboard/stats");
          setStats(data);
          setRentValue(data.extraCards?.rentPending || 0);
          setBillValue(data.extraCards?.billsPending || 0);

          try {
            const apptRes = await api.get("/appointments");
            setAppointments(apptRes.data || []);
          } catch (error) {
            console.error("Failed to fetch appointments", error);
          }

          // Fetch attendance stats
          const attendanceRes = await api.get("/staff");
          const staffList = attendanceRes.data;
          setEmployeeAvailability(buildEmployeeAvailability(staffList));
          const today = new Date().setHours(0, 0, 0, 0);

          let present = 0,
            absent = 0,
            leave = 0,
            incomplete = 0;

          for (let staff of staffList) {
            const attendanceRes = await api.get(
              `/staff/${staff._id}/attendance`,
            );
            const todayRecord = attendanceRes.data.find(
              (a) => new Date(a.date).setHours(0, 0, 0, 0) === today,
            );

            if (!todayRecord) {
              absent++;
            } else if (todayRecord.status === "Present") {
              present++;
            } else if (todayRecord.status === "Leave") {
              leave++;
            } else {
              incomplete++;
            }
          }

          setAttendanceStats({
            present,
            absent,
            leave,
            incomplete,
            total: staffList.length,
          });
        } else {
          const { data } = await api.get("/orders?staff=" + user._id);
          setStats({
            activeOrders: data.filter((o) => o.status !== "Delivered"),
          });

          // Fetch staff attendance
          try {
            const attendanceRes = await api.get(
              `/staff/${user._id}/attendance`,
            );
            const today = new Date().setHours(0, 0, 0, 0);
            const todayRecord = attendanceRes.data.find(
              (a) => new Date(a.date).setHours(0, 0, 0, 0) === today,
            );
            setTodayAttendance(todayRecord);
          } catch (error) {
            console.error("Failed to fetch attendance", error);
          }
        }
      } catch (error) {
        console.error("Failed to fetch dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6D28D9]"></div>
      </div>
    );
  }

  const employeeData =
    employeeAvailability.length > 0
      ? employeeAvailability
      : [{ name: "No employees", value: 0, staff: [] }];

  const handleImageUpload = async () => {
    if (!uploadImageFile || !uploadImageName.trim()) {
      alert("Please provide both a name and an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const newImage = {
        id: `img-${Date.now()}`,
        name: uploadImageName,
        dataUrl: reader.result,
        uploadedAt: new Date().toISOString(),
      };
      setGallery([...gallery, newImage]);
      setUploadImageName("");
      setUploadImageFile(null);
      setShowImageUploadModal(false);
      alert("Image added to gallery!");
    };
    reader.readAsDataURL(uploadImageFile);
  };

  const handleRoleClick = (roleData) => {
    setSelectedRole(roleData);
    setShowEmployeePopup(true);
  };

  const cashVsOnline = stats?.cashVsOnline || {
    Cash: stats?.paymentMethods?.Cash || 0,
    Online:
      (stats?.paymentMethods?.UPI || 0) +
      (stats?.paymentMethods?.Online || 0),
  };

  const paymentMethodData = Object.entries(stats?.paymentMethods || {}).map(
    ([name, value]) => ({
      name,
      value,
      color:
        name === "Cash"
          ? "#10b981"
          : name === "UPI"
            ? "#3b82f6"
            : name === "Card"
              ? "#f59e0b"
              : "#8b5cf6",
    }),
  );

  const totalPaymentMethodAmount = paymentMethodData.reduce(
    (sum, method) => sum + method.value,
    0,
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingAppointments = appointments
    .filter((appointment) => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextAppointments = upcomingAppointments.slice(0, 3);

  const getRevenueChartData = () => {
    const graph = stats?.graphs?.revenueGraph;
    if (!graph) {
      return [
        { name: "Mon", paid: 0, balance: 0 },
        { name: "Tue", paid: 0, balance: 0 },
        { name: "Wed", paid: 0, balance: 0 },
        { name: "Thu", paid: 0, balance: 0 },
        { name: "Fri", paid: 0, balance: 0 },
        { name: "Sat", paid: 0, balance: 0 },
        { name: "Sun", paid: 0, balance: 0 },
      ];
    }
    const key =
      revenueView === "Daily"
        ? "daily"
        : revenueView === "Monthly"
          ? "monthly"
          : "yearly";
    return graph[key] || [];
  };

  const getOrderChartData = () => {
    const graph = stats?.graphs?.orderGraph;
    if (!graph) {
      return [
        { name: "Mon", orders: 0 },
        { name: "Tue", orders: 0 },
        { name: "Wed", orders: 0 },
        { name: "Thu", orders: 0 },
        { name: "Fri", orders: 0 },
        { name: "Sat", orders: 0 },
        { name: "Sun", orders: 0 },
      ];
    }
    const key =
      orderView === "Weekly"
        ? "weekly"
        : orderView === "Monthly"
          ? "monthly"
          : "yearly";
    return graph[key] || [];
  };

  const getMonthlyProductStatus = () => {
    return stats?.stageCounts
      ? Object.entries(stats.stageCounts).map(([stage, count]) => ({
          stage,
          count,
        }))
      : [];
  };

  const overdueCount =
    stats?.overdueCount ??
    (stats?.activeOrders?.filter(
      (order) => new Date(order.deliveryDate) < new Date(),
    ).length ||
      0);
  const dueSoonCount =
    stats?.dueSoonCount ??
    (stats?.activeOrders?.filter((order) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const delivery = new Date(order.deliveryDate);
      const dueSoonDate = new Date(today);
      dueSoonDate.setDate(dueSoonDate.getDate() + 5);
      return delivery >= today && delivery <= dueSoonDate;
    }).length ||
      0);
  const stageCounts = stats?.stageCounts || {};
  const dueOrders = stats?.dueSoonOrders || [];

  return (
    <div className="h-full flex flex-col bg-[#FDFDFD]">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Hello, {user?.name}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your boutique operations effortlessly with real-time insights
          </p>
        </div>
        {user?.role === "Owner" && (
          <div className="flex gap-2">
            <a
              href="#/calendar"
              className="bg-red-50 text-red-600 px-4 py-2 rounded-xl flex items-center gap-2 border border-red-100 shadow-sm cursor-pointer hover:bg-red-100 hover:border-red-200 transition-colors"
            >
              <AlertTriangle className="w-5 h-5" />
              <div className="text-sm">
                <div className="font-bold">
                  {stats?.extraCards?.rentPending ? "Rent Due" : "View Alerts"}
                </div>
                <div className="text-xs">Check calendar for details</div>
              </div>
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Section */}
        <div className="w-full xl:w-[60%] space-y-6">
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#E0F2FE] rounded-2xl p-5 flex flex-col justify-center border border-blue-100 shadow-sm relative">
              <div className="flex items-center gap-2 mb-2 text-blue-500">
                <Package className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                  Active Tasks
                </span>
              </div>
              <div className="text-3xl font-black text-blue-700">
                {stats?.activeOrders?.length || 0}
              </div>
            </div>

            <div className="bg-[#F3E8FF] rounded-2xl p-5 flex flex-col justify-center border border-purple-100 shadow-sm relative">
              <div className="flex items-center gap-2 mb-2 text-purple-500">
                <Sigma className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-purple-600">
                  Total Orders
                </span>
              </div>
              <div className="text-3xl font-black text-purple-700">
                {stats?.totalOrders || stats?.activeOrders?.length || 0}
              </div>
            </div>

            <div className="bg-[#FEF2F2] rounded-2xl p-5 flex flex-col justify-center border border-rose-100 shadow-sm relative">
              <div className="flex items-center gap-2 mb-2 text-rose-500">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-rose-600">
                  Overdue Tasks
                </span>
              </div>
              <div className="text-3xl font-black text-rose-700">
                {overdueCount}
              </div>
            </div>

            <div className="bg-[#FEF3C7] rounded-2xl p-5 flex flex-col justify-center border border-amber-100 shadow-sm relative">
              <div className="flex items-center gap-2 mb-2 text-amber-500">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">
                  Due Soon
                </span>
              </div>
              <div className="text-3xl font-black text-amber-700">
                {dueSoonCount}
              </div>
            </div>

            {attendanceStats && (
              <div className="bg-[#E0F2FE] rounded-2xl p-5 flex flex-col justify-center border border-blue-100 shadow-sm relative">
                <div className="flex items-center gap-2 mb-2 text-blue-500">
                  <UserCheck className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                    Today's Attendance
                  </span>
                </div>
                <div className="text-3xl font-black text-blue-700">
                  {attendanceStats.present}/{attendanceStats.total}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {attendanceStats.leave > 0 &&
                    `${attendanceStats.leave} on leave`}
                  {attendanceStats.incomplete > 0 &&
                    ` • ${attendanceStats.incomplete} incomplete`}
                </div>
              </div>
            )}
          </div>

          {stats?.activeOrders?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(stageCounts).map(([stage, count]) => (
                <div
                  key={stage}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">
                    {stage}
                  </p>
                  <p className="text-2xl font-black text-gray-800">{count}</p>
                </div>
              ))}
            </div>
          )}

          {/* Financial Overview (Owner Only) */}
          {user?.role === "Owner" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                  onClick={() => openDetailModal("revenue")}
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition"
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Total Revenue Collected
                  </p>
                  <p className="text-lg font-black text-gray-800 mt-1">
                    {formatCurrency(stats?.totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Collected of total order value: {formatCurrency(stats?.totalRevenue)} / {formatCurrency(stats?.totalOrderRevenue)}
                  </p>
                </div>
                <div
                  onClick={() => openDetailModal("orderRevenue")}
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition"
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Total Order Value
                  </p>
                  <p className="text-lg font-black text-gray-800 mt-1">
                    {formatCurrency(stats?.totalOrderRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Tap to view order revenue details.
                  </p>
                </div>
                <div
                  onClick={() => openDetailModal("monthlyEarnings")}
                  className="bg-white rounded-xl p-4 border border-green-50 shadow-sm cursor-pointer hover:shadow-md transition"
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Monthly Revenue
                  </p>
                  <p className="text-lg font-black text-emerald-600 mt-1">
                    {formatCurrency(stats?.monthlyEarnings)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Tap to view payments received this month.
                  </p>
                </div>
                <div
                  onClick={() => openDetailModal("pending")}
                  className="bg-white rounded-xl p-4 border border-red-50 shadow-sm cursor-pointer hover:shadow-md transition"
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Pending Balances
                  </p>
                  <p className="text-lg font-black text-rose-500 mt-1">
                    {formatCurrency(stats?.totalPendingPayments)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Rent Due
                      </p>
                      <p className="text-2xl font-black text-red-600 mt-1">
                        {formatCurrency(stats?.extraCards?.rentPending)}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (editingRent) {
                          const value = Number(rentValue) || 0;
                          const success = await saveDashboardSettings(
                            value,
                            stats?.extraCards?.billsPending || 0,
                          );
                          if (success) {
                            setEditingRent(false);
                          }
                        } else {
                          setRentValue(stats?.extraCards?.rentPending || 0);
                          setEditingRent(true);
                        }
                      }}
                      className="text-sm font-semibold text-[#6D28D9] hover:text-purple-700"
                    >
                      {editingRent ? "Done" : "Edit"}
                    </button>
                  </div>
                  {editingRent && (
                    <input
                      type="number"
                      value={rentValue}
                      onChange={(e) =>
                        setRentValue(Number(e.target.value) || 0)
                      }
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#6D28D9] focus:outline-none"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    Owner-only rent adjustment. The updated amount will stay
                    visible after saving.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Current Bill
                      </p>
                      <p className="text-2xl font-black text-orange-600 mt-1">
                        {formatCurrency(stats?.extraCards?.billsPending)}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (editingBill) {
                          const value = Number(billValue) || 0;
                          const success = await saveDashboardSettings(
                            stats?.extraCards?.rentPending || 0,
                            value,
                          );
                          if (success) {
                            setEditingBill(false);
                          }
                        } else {
                          setBillValue(stats?.extraCards?.billsPending || 0);
                          setEditingBill(true);
                        }
                      }}
                      className="text-sm font-semibold text-[#6D28D9] hover:text-purple-700"
                    >
                      {editingBill ? "Done" : "Edit"}
                    </button>
                  </div>
                  {editingBill && (
                    <input
                      type="number"
                      value={billValue}
                      onChange={(e) =>
                        setBillValue(Number(e.target.value) || 0)
                      }
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#6D28D9] focus:outline-none"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    Track monthly utilities and current expenses.
                  </p>
                </div>
                <div
                  onClick={() => openDetailModal("payout")}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition"
                >
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                    Employee Payout Estimate
                  </p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    {formatCurrency(
                      (stats?.extraCards?.staffCount || 0) * 12000,
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-3">
                    Approximate payout to staff this month.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-3">
                    Product Status This Month
                  </p>
                  <div className="space-y-3">
                    {getMonthlyProductStatus()
                      .slice(0, 4)
                      .map((item) => (
                        <div
                          key={item.stage}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-sm text-gray-600">
                            {item.stage}
                          </span>
                          <span className="text-sm font-bold text-gray-800">
                            {item.count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">
                      Revenue Performance
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      View paid revenue and pending balance by period.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {["Daily", "Monthly", "Yearly"].map((view) => (
                      <button
                        key={view}
                        onClick={() => setRevenueView(view)}
                        className={`text-xs font-semibold px-3 py-2 rounded-full border transition ${revenueView === view ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getRevenueChartData()}
                      key={`revenue-${revenueView}`}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f3f4f6"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Bar
                        dataKey="paid"
                        fill="#6D28D9"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="balance"
                        fill="#f97316"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">
                      Orders Overview
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Count of orders by week, month, or year.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {["Weekly", "Monthly", "Yearly"].map((view) => (
                      <button
                        key={view}
                        onClick={() => setOrderView(view)}
                        className={`text-xs font-semibold px-3 py-2 rounded-full border transition ${orderView === view ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getOrderChartData()}
                      key={`orders-${orderView}`}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f3f4f6"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Bar
                        dataKey="orders"
                        fill="#2563EB"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Due Orders Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Due Orders</h3>
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-gray-400 font-medium">
                  <th className="font-medium pb-4 border-b border-gray-50">
                    Order ID
                  </th>
                  <th className="font-medium pb-4 border-b border-gray-50">
                    Product Name
                  </th>
                  <th className="font-medium pb-4 border-b border-gray-50">
                    Delivery Date
                  </th>
                  <th className="font-medium pb-4 border-b border-gray-50">
                    Task Status
                  </th>
                  <th className="font-medium pb-4 border-b border-gray-50">
                    Due Days
                  </th>
                </tr>
              </thead>
              <tbody>
                {dueOrders.length > 0 ? (
                  dueOrders.map((o, idx) => {
                    const days = Math.ceil(
                      (new Date(o.deliveryDate) - new Date()) /
                        (1000 * 60 * 60 * 24),
                    );
                    const isDue = days <= 1;
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-4 text-[#6D28D9] font-medium">
                          {o.orderId}
                        </td>
                        <td className="py-4 text-gray-800 font-medium">
                          {o.dressType}
                        </td>
                        <td className="py-4 text-gray-500">
                          {new Date(o.deliveryDate).toLocaleDateString("en-GB")}
                        </td>
                        <td className="py-4 text-gray-600">{o.status}</td>
                        <td className="py-4">
                          <span
                            className={
                              isDue ? "text-red-500 font-bold" : "text-gray-500"
                            }
                          >
                            {days} day{days !== 1 && "s"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400">
                      No due orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Section (40%) Charts */}
        <div className="w-full xl:w-[40%] space-y-6">
          {/* Employee Availability Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
            <h3 className="font-bold text-gray-800 text-sm mb-6 tracking-wide text-center">
              Employee Availability (Click bar for staff)
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={employeeData}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                  barSize={16}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: "#f3f4f6" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#6D28D9"
                    radius={[0, 4, 4, 0]}
                    onClick={(data) => handleRoleClick(data)}
                    className="cursor-pointer"
                  >
                    {employeeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={"#6D28D9"}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Methods Chart (Owner Only) */}
          {user?.role === "Owner" && stats?.paymentMethods && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-[340px] flex flex-col">
              <h3 className="font-bold text-gray-800 text-sm text-center mb-6 tracking-wide">
                Payment Insights
              </h3>
              <div className="flex-1 relative">
                {totalPaymentMethodAmount > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethodData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {paymentMethodData.map((entry, index) => (
                            <PieCell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Legend
                          layout="horizontal"
                          verticalAlign="top"
                          align="center"
                          wrapperStyle={{ fontSize: "10px", top: -10 }}
                          iconType="square"
                          iconSize={8}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-xs text-gray-500 space-y-1">
                      <p className="font-semibold text-gray-700">Cash vs Online</p>
                      <p>
                        Cash: <span className="font-semibold text-green-600">₹{cashVsOnline.Cash.toLocaleString()}</span>
                      </p>
                      <p>
                        Online: <span className="font-semibold text-blue-600">₹{cashVsOnline.Online.toLocaleString()}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    No payments recorded yet. Add a payment to see insights
                    here.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">Upcoming Appointments</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Brief appointment summary for the next few days.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#6D28D9]">
                {upcomingAppointments.length} upcoming
              </span>
            </div>
            {nextAppointments.length > 0 ? (
              <div className="space-y-3">
                {nextAppointments.map((appointment) => (
                  <div
                    key={appointment._id || appointment.date}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">
                        {appointment.customerName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(appointment.date).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {appointment.purpose}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">
                No upcoming appointments scheduled.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Upload Modal */}
      {showImageUploadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
              <h3 className="font-bold text-purple-800 text-lg">Upload Image</h3>
              <button
                onClick={() => setShowImageUploadModal(false)}
                className="text-purple-400 hover:text-purple-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Image Category/Section Name
                </label>
                <input
                  type="text"
                  value={uploadImageName}
                  onChange={(e) => setUploadImageName(e.target.value)}
                  placeholder="e.g., Lehenga Designs, Blouse References"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadImageFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {uploadImageFile && (
                <div className="rounded-lg border border-gray-200 p-3 text-center">
                  <p className="text-xs text-gray-600">Selected: {uploadImageFile.name}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowImageUploadModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImageUpload}
                  className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Attendance Section */}
      {user?.role === "Staff" && (
        <div className="mt-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-4">
              Today's Attendance
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                      todayAttendance?.status === "Present"
                        ? "bg-green-100 text-green-600"
                        : todayAttendance?.status === "Leave"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {todayAttendance?.status === "Present"
                      ? "✓"
                      : todayAttendance?.status === "Leave"
                        ? "L"
                        : "?"}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {todayAttendance?.status || "Not Marked"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IN Time</p>
                  <p className="font-bold text-gray-800">
                    {todayAttendance?.inTime
                      ? new Date(todayAttendance.inTime).toLocaleTimeString()
                      : "--:--"}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">OUT Time</p>
                  <p className="font-bold text-gray-800">
                    {todayAttendance?.outTime
                      ? new Date(todayAttendance.outTime).toLocaleTimeString()
                      : "--:--"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!todayAttendance?.inTime && (
                  <button
                    onClick={async () => {
                      try {
                        await api.post(`/staff/${user._id}/attendance/in`);
                        // Refresh attendance
                        const attendanceRes = await api.get(
                          `/staff/${user._id}/attendance`,
                        );
                        const today = new Date().setHours(0, 0, 0, 0);
                        const todayRecord = attendanceRes.data.find(
                          (a) =>
                            new Date(a.date).setHours(0, 0, 0, 0) === today,
                        );
                        setTodayAttendance(todayRecord);
                        alert("Checked IN successfully!");
                      } catch {
                        alert("Error checking in");
                      }
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Check IN
                  </button>
                )}
                {todayAttendance?.inTime && !todayAttendance?.outTime && (
                  <button
                    onClick={async () => {
                      try {
                        await api.post(`/staff/${user._id}/attendance/out`);
                        // Refresh attendance
                        const attendanceRes = await api.get(
                          `/staff/${user._id}/attendance`,
                        );
                        const today = new Date().setHours(0, 0, 0, 0);
                        const todayRecord = attendanceRes.data.find(
                          (a) =>
                            new Date(a.date).setHours(0, 0, 0, 0) === today,
                        );
                        setTodayAttendance(todayRecord);
                        alert("Checked OUT successfully!");
                      } catch {
                        alert("Error checking out");
                      }
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Check OUT
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Availability Popup */}
      {showEmployeePopup && selectedRole && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
              <h3 className="font-bold text-purple-800 text-lg">
                {selectedRole.name} Staff
              </h3>
              <button
                onClick={() => setShowEmployeePopup(false)}
                className="text-purple-400 hover:text-purple-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {selectedRole.staff.map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold flex items-center justify-center">
                    {name.charAt(0)}
                  </div>
                  <div className="font-medium text-gray-700">{name}</div>
                </div>
              ))}
              {selectedRole.staff.length === 0 && (
                <p className="text-gray-400 text-center py-4">
                  No staff available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {detailModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {getDetailModalTitle()}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Viewing detailed information for {detailModal}.
                </p>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {detailLoading ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Loading details...
                </div>
              ) : getDetailModalItems().length > 0 ? (
                getDetailModalItems().map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4 shadow-sm"
                  >
                    {(detailModal === "revenue" ||
                      detailModal === "monthlyEarnings" ||
                      detailModal === "collected") && (
                      <>
                        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 mb-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {item.customerName}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(item.amountPaid)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <div>
                            <span className="font-semibold text-slate-400">Order ID:</span>{" "}
                            <span className="bg-purple-50 text-[#6D28D9] px-2 py-0.5 rounded font-mono font-bold">
                              {item.orderId || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Method:</span>{" "}
                            <span className="text-slate-700 font-medium">{item.method}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Total Order:</span>{" "}
                            <span className="text-slate-700">{formatCurrency(item.totalAmount || item.amountPaid)}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Remaining Balance:</span>{" "}
                            <span className={`font-bold ${(item.balance || 0) === 0 ? "text-emerald-600" : "text-rose-500"}`}>
                              {(item.balance || 0) === 0 ? "Paid in Full" : formatCurrency(item.balance)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-[10px] text-slate-400">
                          <span>Recorded by: {item.recordedBy || "Unknown"}</span>
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                      </>
                    )}
                    {detailModal === "orderRevenue" && (
                      <>
                        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 mb-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {item.customerName}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(item.totalAmount)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <div>
                            <span className="font-semibold text-slate-400">Order ID:</span>{" "}
                            <span className="bg-gray-50 text-gray-800 px-2 py-0.5 rounded font-mono font-bold">
                              {item.orderId || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Collected:</span>{" "}
                            <span className="text-slate-700 font-medium">{formatCurrency(item.collected)}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Advance Paid:</span>{" "}
                            <span className="text-slate-700">{formatCurrency(item.advancePaid)}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Balance:</span>{" "}
                            <span className={item.balance === 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                              {formatCurrency(item.balance)}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Status:</span>{" "}
                            <span className="text-slate-700">{item.status || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Delivery:</span>{" "}
                            <span className="text-slate-700">{item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : "N/A"}</span>
                          </div>
                        </div>
                      </>
                    )}
                    {detailModal === "pending" && (
                      <>
                        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 mb-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {item.customerName}
                          </span>
                          <span className="text-sm font-bold text-rose-600">
                            {formatCurrency(item.amountDue)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <div>
                            <span className="font-semibold text-slate-400">Order ID:</span>{" "}
                            <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-mono font-bold">
                              {item.orderId}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Total Order:</span>{" "}
                            <span className="text-slate-700">{formatCurrency(item.totalAmount)}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Advance Paid:</span>{" "}
                            <span className="text-slate-700">{formatCurrency(item.advancePaid)}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400">Status:</span>{" "}
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold text-[10px]">
                              {item.dueDays === 0 ? "Due Today!" : `Due in ${item.dueDays} day${item.dueDays !== 1 ? "s" : ""}`}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                    {detailModal === "payout" && (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {item.name}
                          </span>
                          <span className="text-sm font-bold text-emerald-600">
                            {formatCurrency(item.amountDue)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Estimated: {formatCurrency(item.estimate)} • Paid:{" "}
                          {formatCurrency(item.paid)}
                        </p>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No details available for this section.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
