import { useState, useEffect } from "react";
import api from "../api/axios";
import {
  Plus,
  Trash2,
  X,
  ShieldAlert,
  CheckCircle2,
  Clock,
  IndianRupee,
  Bell,
  Edit,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Staff = () => {
  const [activeTab, setActiveTab] = useState("Directory"); // Directory, Attendance, Salary
  const [staffList, setStaffList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const { user } = useAuth();

  const initialForm = {
    name: "",
    phone: "",
    address: "",
    staffRoles: [],
    otherRoleInput: "",
    salary: { type: "Per Month", amount: "" },
    notes: "",
    overtimeEnabled: true,
    workingHours: 8,
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchStaff = async () => {
    try {
      const { data } = await api.get("/staff");
      setStaffList(data);
    } catch (error) {
      console.error("Failed to fetch staff", error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const { data } = await api.get("/staff");
      // Fetch history for all staff. In a real app, create a bulk endpoint.
      let allRecords = [];
      for (let s of data) {
        const res = await api.get(`/staff/${s._id}/attendance`);
        allRecords = [...allRecords, ...res.data];
      }
      setAttendanceRecords(allRecords);
    } catch (error) {
      console.error("Failed to fetch attendance", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (user?.role === "Owner") {
        await fetchStaff();
        await fetchAttendance();
      }
    };
    init();
  }, [user]);

  const markAttendance = async (staffId, type) => {
    try {
      if (type === "in") {
        await api.post(`/staff/${staffId}/attendance/in`);
      } else {
        await api.post(`/staff/${staffId}/attendance/out`);
      }
      alert(`Checked ${type === "in" ? "IN" : "OUT"} successfully!`);
      fetchAttendance();
    } catch (error) {
      alert(error.response?.data?.message || `Error checking ${type === "in" ? "in" : "out"}`);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.name === "salaryType") {
      setFormData({
        ...formData,
        salary: { ...formData.salary, type: e.target.value },
      });
    } else if (e.target.name === "salaryAmount") {
      setFormData({
        ...formData,
        salary: { ...formData.salary, amount: e.target.value },
      });
    } else if (e.target.name === "otherRoleInput") {
      setFormData({ ...formData, otherRoleInput: e.target.value });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const toggleRole = (role) => {
    const current = formData.staffRoles;
    if (role === "Other") {
      if (current.includes("Other")) {
        setFormData({
          ...formData,
          staffRoles: current.filter((r) => r !== "Other"),
          otherRoleInput: "",
        });
      } else {
        setFormData({ ...formData, staffRoles: [...current, "Other"] });
      }
      return;
    }

    if (current.includes(role)) {
      setFormData({
        ...formData,
        staffRoles: current.filter((r) => r !== role),
      });
    } else {
      setFormData({ ...formData, staffRoles: [...current, role] });
    }
  };

  const addCustomRole = () => {
    const role = formData.otherRoleInput.trim();
    if (!role) return;
    const current = formData.staffRoles.filter((r) => r !== "Other");
    if (!current.includes(role)) {
      setFormData({
        ...formData,
        staffRoles: [...current, role],
        otherRoleInput: "",
      });
    } else {
      setFormData({ ...formData, otherRoleInput: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await api.put(`/staff/${editingStaff._id}`, formData);
      } else {
        await api.post("/staff", formData);
      }
      setIsModalOpen(false);
      setFormData(initialForm);
      setEditingStaff(null);
      fetchStaff();
    } catch (error) {
      alert(error.response?.data?.message || "Error saving staff");
    }
  };

  const deleteStaff = async (id) => {
    if (window.confirm("Remove this staff member?")) {
      try {
        await api.delete(`/staff/${id}`);
        fetchStaff();
      } catch {
        alert("Failed to delete staff");
      }
    }
  };

  const markLeave = async (staffId) => {
    const leaveType = prompt(
      "Enter leave type (Sick Leave, Casual Leave, Emergency Leave, Vacation):",
    );
    if (!leaveType) return;

    const leaveReason = prompt("Enter reason for leave:");

    try {
      await api.post(`/staff/${staffId}/attendance/leave`, {
        leaveType,
        leaveReason,
      });
      alert("Leave marked successfully");
      fetchAttendance();
    } catch (error) {
      alert(error.response?.data?.message || "Error marking leave");
    }
  };

  const approveOvertime = async (staffId, attendanceId, approved) => {
    try {
      await api.put(`/staff/${staffId}/attendance/${attendanceId}/overtime`, {
        approved,
      });
      alert(`Overtime ${approved ? "approved" : "rejected"}`);
      fetchAttendance();
    } catch {
      alert("Error updating overtime status");
    }
  };

  // Calculate salary data for a staff member
  const calculateSalaryData = (staff) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Get attendance records for current month
    const monthlyRecords = attendanceRecords.filter((record) => {
      const recordDate = new Date(record.date);
      return (
        recordDate.getMonth() === currentMonth &&
        recordDate.getFullYear() === currentYear &&
        record.staffId === staff._id
      );
    });

    // Calculate days worked (Present or completed attendance)
    const daysWorked = monthlyRecords.filter(
      (record) =>
        record.status === "Present" || (record.inTime && record.outTime),
    ).length;

    // Calculate total hours worked
    const totalHours = monthlyRecords.reduce((sum, record) => {
      return sum + (record.totalHours || 0);
    }, 0);

    // Calculate overtime hours (only approved ones)
    const overtimeHours = monthlyRecords.reduce((sum, record) => {
      return sum + (record.isOvertimeApproved ? record.overtimeHours || 0 : 0);
    }, 0);

    // Calculate salary based on type
    let baseSalary = 0;
    let overtimePay = 0;
    let salaryCycleDays = 30; // Default for monthly
    let nextPaymentDate = new Date(currentYear, currentMonth + 1, 1); // Default to start of next month

    if (staff.salary?.amount && staff.salary?.type) {
      const rate = staff.salary.amount;
      const type = staff.salary.type;

      switch (type) {
        case "Per Day":
          baseSalary = daysWorked * rate;
          overtimePay = overtimeHours * (rate / staff.workingHours); // hourly rate
          salaryCycleDays = 1;
          nextPaymentDate = new Date(); // Daily - payment due today
          nextPaymentDate.setDate(nextPaymentDate.getDate() + 1);
          break;
        case "Per Week": {
          const weeksWorked = daysWorked / 7;
          baseSalary = weeksWorked * rate;
          overtimePay = overtimeHours * (rate / (staff.workingHours * 7)); // hourly rate
          salaryCycleDays = 7;
          // Calculate next Friday as payment date
          nextPaymentDate = new Date();
          const daysUntilFriday = (5 - nextPaymentDate.getDay() + 7) % 7;
          nextPaymentDate.setDate(
            nextPaymentDate.getDate() + (daysUntilFriday || 7),
          );
          break;
        }
        case "Per 15 Days": {
          const periodsWorked = daysWorked / 15;
          baseSalary = periodsWorked * rate;
          overtimePay = overtimeHours * (rate / (staff.workingHours * 15)); // hourly rate
          salaryCycleDays = 15;
          // Calculate next 15th or end of month
          nextPaymentDate = new Date(currentYear, currentMonth, 15);
          if (new Date() > nextPaymentDate) {
            nextPaymentDate = new Date(currentYear, currentMonth + 1, 15);
          }
          break;
        }
        case "Per Month": {
          // For monthly salary, prorate based on days worked
          const daysInMonth = new Date(
            currentYear,
            currentMonth + 1,
            0,
          ).getDate();
          baseSalary = (daysWorked / daysInMonth) * rate;
          overtimePay =
            overtimeHours * (rate / (staff.workingHours * daysInMonth)); // hourly rate
          salaryCycleDays = daysInMonth;
          nextPaymentDate = new Date(currentYear, currentMonth + 1, 1);
          break;
        }
        default:
          baseSalary = 0;
      }
    }

    const totalEarned = baseSalary + overtimePay;
    const amountPaid = staff.totalSalaryPaid || 0;
    const remainingBalance = totalEarned - amountPaid;

    // Calculate days until payment due
    const today = new Date();
    const daysUntilDue = Math.ceil(
      (nextPaymentDate - today) / (1000 * 60 * 60 * 24),
    );

    // Calculate partial payment details
    const dailyRate = staff.salary?.amount || 0;
    const daysPaid = dailyRate > 0 ? amountPaid / dailyRate : 0;
    const remainingDaysValue = dailyRate > 0 ? remainingBalance / dailyRate : 0;

    return {
      daysWorked,
      totalHours: totalHours.toFixed(1),
      overtimeHours: overtimeHours.toFixed(1),
      baseSalary: Math.round(baseSalary),
      overtimePay: Math.round(overtimePay),
      totalEarned: Math.round(totalEarned),
      amountPaid,
      remainingBalance: Math.round(remainingBalance),
      daysUntilDue,
      isOverdue: daysUntilDue < 0,
      salaryCycleDays,
      daysPaid: daysPaid.toFixed(1),
      remainingDays: Math.max(0, remainingDaysValue.toFixed(1)),
      nextPaymentDate,
    };
  };

  if (user?.role !== "Owner") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-gray-500">You must be an Owner to view this page.</p>
      </div>
    );
  }

  const roleOptions = [
    "Cutting",
    "Stitching",
    "Finishing",
    "General Staff",
    "Other",
  ];
  const tabs = ["Directory", "Attendance", "Salary"];

  return (
    <div className="flex flex-col h-full bg-[#FDFDFD]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
          <p className="text-sm text-gray-500">
            Manage boutique employees, attendance, and payroll
          </p>
        </div>
        <button
          onClick={() => {
            setEditingStaff(null);
            setFormData(initialForm);
            setIsModalOpen(true);
          }}
          className="bg-[#7C3AED] hover:bg-[#6c2bd9] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition-colors"
        >
          <Plus className="w-5 h-5" /> Add Staff
        </button>
      </div>

      <div className="flex gap-6 border-b border-gray-100 pb-4 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-1 text-sm font-semibold transition-colors relative ${activeTab === tab ? "text-[#6D28D9]" : "text-gray-500 hover:text-gray-800"}`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-t-full"></div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden">
        {/* DIRECTORY TAB */}
        {activeTab === "Directory" && (
          <div className="overflow-x-auto h-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9FF] text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Roles</th>
                  <th className="px-6 py-4 font-semibold">Salary Structure</th>
                  <th className="px-6 py-4 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((s) => (
                  <tr
                    key={s._id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-gray-800 font-bold">
                      {s.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      <div>{s.phone}</div>
                      <div className="text-xs text-gray-400">{s.address}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {s.staffRoles?.map((r) => (
                          <span
                            key={r}
                            className="bg-[#C4B5FD]/20 text-[#7C3AED] px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm font-medium">
                      ₹{s.salary?.amount} / {s.salary?.type.replace("Per ", "")}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingStaff(s);
                          setFormData({
                            name: s.name,
                            phone: s.phone,
                            address: s.address,
                            staffRoles: s.staffRoles || [],
                            salary: s.salary || {
                              type: "Per Month",
                              amount: "",
                            },
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteStaff(s._id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {staffList.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">
                      No staff members found. Add one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "Attendance" && (
          <div className="overflow-x-auto h-full p-6">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-gray-700">Today's Attendance</h2>
              <button
                onClick={async () => {
                  try {
                    await api.post("/staff/attendance/check-incomplete");
                    alert("Incomplete attendance checked and flagged");
                    fetchAttendance();
                  } catch {
                    alert("Error checking incomplete attendance");
                  }
                }}
                className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-sm font-bold border border-red-100 hover:bg-red-100 transition-colors"
              >
                Check Incomplete (Auto-flag)
              </button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
                  <th className="px-4 py-3 font-semibold">Staff Member</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">IN Time</th>
                  <th className="px-4 py-3 font-semibold">OUT Time</th>
                  <th className="px-4 py-3 font-semibold">Total Hours</th>
                  <th className="px-4 py-3 font-semibold">Overtime</th>
                  <th className="px-4 py-3 font-semibold text-right">
                    Quick Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((s) => {
                  const today = new Date().setHours(0, 0, 0, 0);

                  const record = attendanceRecords.find(
                    (a) =>
                      a.staffId === s._id &&
                      new Date(a.date).setHours(0, 0, 0, 0) === today,
                  );

                  return (
                    <tr key={s._id} className="border-b border-gray-50">
                      <td className="px-4 py-4 font-bold text-gray-700">
                        {s.name}
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-4">
                        {record ? (
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              record.status === "Present"
                                ? "bg-green-100 text-green-600"
                                : record.status === "Leave"
                                  ? "bg-blue-100 text-blue-600"
                                  : record.status === "Absent"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {record.status}
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs font-bold">
                            Not Marked
                          </span>
                        )}
                      </td>

                      {/* IN TIME */}
                      <td className="px-4 py-4 text-gray-700 text-sm">
                        {record?.inTime
                          ? new Date(record.inTime).toLocaleTimeString()
                          : "--:--"}
                      </td>

                      {/* OUT TIME */}
                      <td className="px-4 py-4 text-gray-700 text-sm">
                        {record?.outTime
                          ? new Date(record.outTime).toLocaleTimeString()
                          : "--:--"}
                      </td>

                      {/* TOTAL HOURS */}
                      <td className="px-4 py-4 text-gray-700 text-sm">
                        {record?.totalHours
                          ? `${record.totalHours.toFixed(1)} hrs`
                          : "--"}
                      </td>

                      {/* OVERTIME */}
                      <td className="px-4 py-4 text-gray-700 text-sm">
                        {record?.overtimeHours ? (
                          <div className="flex items-center gap-1">
                            <span>{record.overtimeHours.toFixed(1)} hrs</span>
                            {record.isOvertimeApproved ? (
                              <span className="text-green-600 text-xs">✓</span>
                            ) : record.overtimeHours > 0 ? (
                              <span className="text-orange-600 text-xs">
                                Pending
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          "--"
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-1 justify-end">
                            <button
                              disabled={record?.inTime}
                              onClick={() => markAttendance(s._id, "in")}
                              className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                                record?.inTime
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              }`}
                            >
                              IN
                            </button>

                            <button
                              disabled={!record?.inTime || record?.outTime}
                              onClick={() => markAttendance(s._id, "out")}
                              className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                                !record?.inTime || record?.outTime
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                              }`}
                            >
                              OUT
                            </button>

                            <button
                              disabled={record?.status === "Leave"}
                              onClick={() => markLeave(s._id)}
                              className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                                record?.status === "Leave"
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              }`}
                            >
                              LEAVE
                            </button>
                          </div>

                          {record?.overtimeHours > 0 &&
                            !record?.isOvertimeApproved && (
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() =>
                                    approveOvertime(s._id, record._id, true)
                                  }
                                  className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200"
                                >
                                  ✓ OT
                                </button>
                                <button
                                  onClick={() =>
                                    approveOvertime(s._id, record._id, false)
                                  }
                                  className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200"
                                >
                                  ✗ OT
                                </button>
                              </div>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* SALARY TAB */}
        {activeTab === "Salary" && (
          <div className="overflow-x-auto h-full p-6 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {staffList.map((s) => {
                const salaryData = calculateSalaryData(s);
                return (
                  <div
                    key={s._id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">
                          {s.name}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium tracking-wide">
                          ₹{s.salary?.amount} /{" "}
                          {s.salary?.type.replace("Per ", "")}
                        </p>
                      </div>
                      <button className="bg-purple-50 p-2 rounded-full text-purple-600 hover:bg-purple-100">
                        <IndianRupee className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Days Worked:</span>
                        <span className="font-bold text-gray-700">
                          {salaryData.daysWorked} days
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Hours:</span>
                        <span className="font-bold text-gray-700">
                          {salaryData.totalHours} hrs
                        </span>
                      </div>
                      {salaryData.overtimeHours > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Overtime Hours:</span>
                          <span className="font-bold text-orange-600">
                            {salaryData.overtimeHours} hrs
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Base Salary:</span>
                        <span className="font-bold text-gray-700">
                          ₹{salaryData.baseSalary.toLocaleString()}
                        </span>
                      </div>
                      {salaryData.overtimePay > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Overtime Pay:</span>
                          <span className="font-bold text-orange-600">
                            ₹{salaryData.overtimePay.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Earned:</span>
                        <span className="font-bold text-green-600">
                          ₹{salaryData.totalEarned.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Amount Paid:</span>
                        <span className="font-bold text-gray-700">
                          ₹{salaryData.amountPaid.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-gray-50 pt-2">
                        <span className="text-gray-600 font-bold">
                          Remaining Bal:
                        </span>
                        <span
                          className={`font-black ${salaryData.remainingBalance > 0 ? "text-red-500" : "text-green-500"}`}
                        >
                          ₹
                          {Math.abs(
                            salaryData.remainingBalance,
                          ).toLocaleString()}
                        </span>
                      </div>
                      {salaryData.amountPaid > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Days Paid:</span>
                          <span className="font-bold text-blue-600">
                            {salaryData.daysPaid} days
                          </span>
                        </div>
                      )}
                      {salaryData.remainingBalance > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Remaining Days:</span>
                          <span className="font-bold text-red-600">
                            {salaryData.remainingDays} days
                          </span>
                        </div>
                      )}
                    </div>

                    {s.salaryPaymentHistory &&
                      s.salaryPaymentHistory.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-bold text-gray-700 mb-2">
                            Recent Payments
                          </h4>
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {s.salaryPaymentHistory
                              .slice(-3)
                              .reverse()
                              .map((payment, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between text-xs bg-gray-50 p-2 rounded"
                                >
                                  <span className="text-gray-600">
                                    {new Date(
                                      payment.date,
                                    ).toLocaleDateString()}{" "}
                                    ({payment.month})
                                  </span>
                                  <span className="font-bold text-green-600">
                                    ₹{payment.amount.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {salaryData.daysUntilDue >= 0 ? (
                      <div
                        className={`bg-${salaryData.daysUntilDue <= 3 ? "red" : "amber"}-50 border border-${salaryData.daysUntilDue <= 3 ? "red" : "amber"}-100 rounded-lg p-2 flex items-center gap-2 text-${salaryData.daysUntilDue <= 3 ? "red" : "amber"}-700 text-xs font-bold mb-4`}
                      >
                        <Bell className="w-4 h-4" /> Payment due in{" "}
                        {salaryData.daysUntilDue} days
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-2 flex items-center gap-2 text-red-700 text-xs font-bold mb-4">
                        <Bell className="w-4 h-4" /> Payment overdue by{" "}
                        {Math.abs(salaryData.daysUntilDue)} days
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        const amount = prompt(
                          "Enter salary payment amount (₹):",
                        );
                        if (amount && !isNaN(amount)) {
                          try {
                            await api.post(`/staff/${s._id}/salary/process`, {
                              amountPaid: Number(amount),
                            });
                            alert("Salary payment processed successfully");
                            fetchStaff();
                            fetchAttendance(); // Refresh attendance data for salary calculations
                          } catch (error) {
                            alert(
                              error.response?.data?.message ||
                                "Error processing salary payment",
                            );
                          }
                        }
                      }}
                      className="w-full bg-[#6D28D9] text-white py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-purple-700 transition-colors"
                    >
                      Process Payment
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-[95vw] md:max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {editingStaff ? "Edit Staff" : "Add New Staff"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      required
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Roles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {roleOptions.map((role) => (
                      <button
                        type="button"
                        key={role}
                        onClick={() => toggleRole(role)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${formData.staffRoles.includes(role) ? "bg-[#7C3AED] text-white border-[#7C3AED]" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  {formData.staffRoles.includes("Other") && (
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          name="otherRoleInput"
                          value={formData.otherRoleInput}
                          onChange={handleInputChange}
                          placeholder="Enter custom role"
                          className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                        />
                        <button
                          type="button"
                          onClick={addCustomRole}
                          className="bg-[#7C3AED] text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-[#6c2bd9] transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Enter any role not listed in the default options.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Hours & Overtime Settings
                  </label>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">
                        Daily Working Hours
                      </label>
                      <input
                        type="number"
                        name="workingHours"
                        value={formData.workingHours}
                        onChange={handleInputChange}
                        min="1"
                        max="24"
                        className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="overtimeEnabled"
                        name="overtimeEnabled"
                        checked={formData.overtimeEnabled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            overtimeEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-[#7C3AED] focus:ring-[#7C3AED] border-gray-300 rounded"
                      />
                      <label
                        htmlFor="overtimeEnabled"
                        className="text-sm text-gray-700"
                      >
                        Enable Overtime Tracking
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary Information
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Salary Type
                      </label>
                      <select
                        name="salaryType"
                        value={formData.salary.type}
                        onChange={handleInputChange}
                        className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                      >
                        <option value="Per Day">Per Day</option>
                        <option value="Per Week">Per Week</option>
                        <option value="Per 15 Days">Per 15 Days</option>
                        <option value="Per Month">Per Month</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Salary Amount (₹)
                      </label>
                      <input
                        type="number"
                        required
                        name="salaryAmount"
                        value={formData.salary.amount}
                        onChange={handleInputChange}
                        placeholder="Enter amount"
                        min="0"
                        className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes about the staff member..."
                    rows="3"
                    className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl font-medium bg-[#7C3AED] hover:bg-[#6c2bd9] text-white shadow-md"
                  >
                    Save Staff
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
