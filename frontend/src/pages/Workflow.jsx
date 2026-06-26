import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import {
  ChevronRight,
  Clock,
  User as UserIcon,
  Calendar,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const WORKFLOW_STAGES = [
  "Measurement done",
  "Cutting",
  "Stitching",
  "Trial",
  "Final adjustment",
  "Ready",
  "Delivered",
];

const Workflow = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(null);
  const { user } = useAuth();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/orders");
      // If staff, filter only their orders
      if (user?.role === "Staff") {
        setOrders(data.filter((o) => o.assignedStaff?._id === user._id));
      } else {
        setOrders(data);
      }
    } catch (error) {
      console.error("Failed to fetch workflow", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      await fetchOrders();
    };
    init();
  }, [fetchOrders]);

  const advanceStatus = async (orderId, currentStatus) => {
    const currentIndex = WORKFLOW_STAGES.indexOf(currentStatus);
    if (currentIndex < WORKFLOW_STAGES.length - 1) {
      const nextStatus = WORKFLOW_STAGES[currentIndex + 1];
      try {
        await api.put(`/orders/${orderId}`, { status: nextStatus });
        fetchOrders();
      } catch (error) {
        console.error("Failed to update status", error);
      }
    }
  };

  const buildScheduleDates = (order) => {
    const schedule = order.schedule || {};

    const pickDate = (stageKey) => {
      const stage = schedule[stageKey];
      if (!stage) return "";
      const dateValue = stage.endDate || stage.date || stage;
      return dateValue ? new Date(dateValue).toISOString().split("T")[0] : "";
    };

    return {
      cuttingEndDate: pickDate("cutting"),
      stitchingEndDate: pickDate("stitching"),
      trialEndDate: pickDate("trial"),
      finalWorkEndDate: pickDate("finalWork"),
    };
  };

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

    const cuttingEnd = new Date(start);
    cuttingEnd.setDate(cuttingEnd.getDate() + cuttingDays);

    const stitchingEnd = new Date(cuttingEnd);
    stitchingEnd.setDate(stitchingEnd.getDate() + stitchingDays);

    const trialEnd = new Date(stitchingEnd);
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    const finalEnd = new Date(trialEnd);
    finalEnd.setDate(finalEnd.getDate() + finalDays);

    return {
      cuttingEndDate: cuttingEnd.toISOString().split("T")[0],
      stitchingEndDate: stitchingEnd.toISOString().split("T")[0],
      trialEndDate: trialEnd.toISOString().split("T")[0],
      finalWorkEndDate:
        finalEnd > end
          ? end.toISOString().split("T")[0]
          : finalEnd.toISOString().split("T")[0],
    };
  };

  const handleEditSchedule = (order) => {
    setEditingSchedule(order);
    setScheduleForm(buildScheduleDates(order));
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/orders/${editingSchedule._id}`, {
        schedule: {
          cuttingEndDate: scheduleForm.cuttingEndDate,
          stitchingEndDate: scheduleForm.stitchingEndDate,
          trialEndDate: scheduleForm.trialEndDate,
          finalWorkEndDate: scheduleForm.finalWorkEndDate,
        },
      });
      setEditingSchedule(null);
      fetchOrders();
      alert("Schedule updated successfully");
    } catch (error) {
      alert("Failed to update schedule");
    }
  };

  const getStageColor = (stage) => {
    const colors = [
      "border-gray-300 bg-gray-50", // Measurement
      "border-yellow-300 bg-yellow-50", // Cutting
      "border-blue-300 bg-blue-50", // Stitching
      "border-purple-300 bg-purple-50", // Trial
      "border-orange-300 bg-orange-50", // Final
      "border-green-300 bg-green-50", // Ready
      "border-emerald-300 bg-emerald-50", // Delivered
    ];
    return (
      colors[WORKFLOW_STAGES.indexOf(stage)] || "border-gray-200 bg-gray-50"
    );
  };

  // We only show active stages (hide delivered by default to clear clutter)
  const ACTIVE_STAGES = WORKFLOW_STAGES.slice(0, 6);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Workflow Board</h1>
        <p className="text-sm text-gray-500">Track and advance order stages</p>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED]"></div>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {ACTIVE_STAGES.map((stage, idx) => {
            const stageOrders = orders.filter((o) => o.status === stage);
            const isLastActive = idx === ACTIVE_STAGES.length - 1;

            return (
              <div
                key={stage}
                className={`flex-shrink-0 w-80 rounded-2xl border-t-4 ${getStageColor(stage)} shadow-sm p-4 flex flex-col h-full bg-white`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800">{stage}</h3>
                  <span className="bg-white/60 text-gray-600 text-xs px-2 py-1 rounded-full font-bold shadow-sm">
                    {stageOrders.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                  {stageOrders.map((order) => (
                    <div
                      key={order._id}
                      className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded-md">
                          {order.orderId}
                        </span>
                        <span
                          className="text-xs text-gray-400 flex items-center gap-1"
                          title="Delivery Date"
                        >
                          <Clock className="w-3 h-3" />
                          {new Date(order.deliveryDate).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                      </div>
                      <p
                        className="font-semibold text-gray-800 text-sm mb-1 line-clamp-1"
                        title={order.customer?.name}
                      >
                        {order.customer?.name}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        {order.dressType}
                      </p>

                      <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                        <div
                          className="flex items-center gap-1 text-xs text-gray-400"
                          title="Assigned Staff"
                        >
                          <UserIcon className="w-3 h-3" />
                          {order.assignedStaff?.name || "Unassigned"}
                        </div>
                        <div className="flex gap-1">
                          {user?.role === "Owner" && (
                            <button
                              title="Edit AI Schedule"
                              onClick={() => handleEditSchedule(order)}
                              className="bg-gray-50 hover:bg-orange-100 text-gray-600 hover:text-orange-600 p-1.5 rounded-lg transition-colors"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            title={
                              isLastActive ? "Mark Delivered" : "Advance Stage"
                            }
                            onClick={() =>
                              advanceStatus(order._id, order.status)
                            }
                            className="bg-gray-50 hover:bg-[#C4B5FD] text-gray-600 hover:text-[#7C3AED] p-1.5 rounded-lg transition-colors group"
                          >
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageOrders.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Schedule Override Modal */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" /> Edit Schedule
              </h3>
              <button
                onClick={() => setEditingSchedule(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={handleSaveSchedule}
              className="p-5 space-y-4 text-sm"
            >
              <div>
                <label className="block text-gray-600 font-bold mb-1">
                  Cutting Completion Date
                </label>
                <input
                  type="date"
                  value={scheduleForm.cuttingEndDate}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      cuttingEndDate: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-bold mb-1">
                  Stitching Completion Date
                </label>
                <input
                  type="date"
                  value={scheduleForm.stitchingEndDate}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      stitchingEndDate: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-bold mb-1">
                  Trial Completion Date
                </label>
                <input
                  type="date"
                  value={scheduleForm.trialEndDate}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      trialEndDate: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-bold mb-1">
                  Final Work Completion Date
                </label>
                <input
                  type="date"
                  value={scheduleForm.finalWorkEndDate}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      finalWorkEndDate: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setScheduleForm(getAIGuess(editingSchedule))}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg shadow-sm"
                >
                  Reset to AI Suggestion
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg shadow-sm"
                >
                  Save Overrides
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workflow;
