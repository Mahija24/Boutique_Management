import { useState, useEffect } from "react";
import api from "../api/axios";
import {
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Truck,
  IndianRupee,
  Users,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const CalendarSystem = () => {
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({
    Delivery: true,
    Payment: true,
    Staff: true,
    Customer: true,
    RedAlert: true,
  });
  const [commonEventsLoaded, setCommonEventsLoaded] = useState(false);
  const [upcomingRedAlerts, setUpcomingRedAlerts] = useState([]);
  const { user } = useAuth();

  const formatDateForApi = (date) => {
    return new Date(date).toISOString().split("T")[0];
  };

  const getUpcomingRedAlerts = (eventList) => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);
    return eventList.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        event.type === "Red Alert" &&
        event.status !== "Completed" &&
        eventDate >= today &&
        eventDate <= endDate
      );
    });
  };

  const ensureCommonEvents = async (eventList) => {
    if (!user || commonEventsLoaded) return;
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const hasRent = eventList.some((event) => {
      const d = new Date(event.date);
      return (
        event.title.toLowerCase().includes("rent") &&
        d.getFullYear() === year &&
        d.getMonth() === month
      );
    });

    const hasBill = eventList.some((event) => {
      const d = new Date(event.date);
      return (
        event.title.toLowerCase().includes("bill") &&
        d.getFullYear() === year &&
        d.getMonth() === month
      );
    });

    try {
      if (!hasRent) {
        await api.post("/calendar", {
          title: "Rent Due",
          description: "Monthly rent payment reminder.",
          date: formatDateForApi(new Date(year, month, 1)),
          type: "Payment",
          recurring: "Monthly",
          status: "Active",
        });
      }
      if (!hasBill) {
        await api.post("/calendar", {
          title: "Current Bill",
          description: "Monthly utility and bill reminder.",
          date: formatDateForApi(new Date(year, month, 5)),
          type: "Payment",
          recurring: "Monthly",
          status: "Active",
        });
      }
    } catch (error) {
      console.error("Unable to create common events", error);
    } finally {
      setCommonEventsLoaded(true);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data } = await api.get("/calendar");
      setEvents(data);
      setUpcomingRedAlerts(getUpcomingRedAlerts(data));
      await ensureCommonEvents(data);
    } catch (error) {
      console.error("Failed to fetch calendar events", error);
    }
  };

  useEffect(() => {
    if (user?.role === "Owner") fetchEvents();
  }, [user]);

  const toggleFilter = (key) => {
    setFilters({ ...filters, [key]: !filters[key] });
  };

  const getIconForType = (type) => {
    const normalized = type === "Red Alert" ? "RedAlert" : type;
    switch (normalized) {
      case "Delivery":
        return <Truck className="w-5 h-5 text-blue-500" />;
      case "Payment":
        return <IndianRupee className="w-5 h-5 text-emerald-500" />;
      case "Staff":
        return <Users className="w-5 h-5 text-purple-500" />;
      case "Customer":
        return <UserPlus className="w-5 h-5 text-pink-500" />;
      case "RedAlert":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <CalendarIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getColorForType = (type) => {
    const normalized = type === "Red Alert" ? "RedAlert" : type;
    switch (normalized) {
      case "Delivery":
        return "border-blue-200 bg-blue-50";
      case "Payment":
        return "border-emerald-200 bg-emerald-50";
      case "Staff":
        return "border-purple-200 bg-purple-50";
      case "Customer":
        return "border-pink-200 bg-pink-50";
      case "RedAlert":
        return "border-red-300 bg-red-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  // Filter events based on active toggles
  const filteredEvents = events.filter((e) => {
    const filterKey = e.type === "Red Alert" ? "RedAlert" : e.type;
    return filters[filterKey];
  });

  if (user?.role !== "Owner") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FDFDFD]">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Master Calendar</h1>
          <p className="text-sm text-gray-500">
            Overview of all important dates, deadlines, and alerts
          </p>
          {upcomingRedAlerts.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {upcomingRedAlerts.length} red-day alert(s) starting in the next 7 days
              </span>
            </div>
          )}
        </div>
        <button
          onClick={async () => {
            const title = prompt("Enter event title:");
            if (title) {
              const description = prompt("Enter event description:");
              const dateStr = prompt("Enter event date (YYYY-MM-DD):");
              const redDay = confirm("Make this a red day alert?");
              if (description && dateStr) {
                try {
                  await api.post("/calendar", {
                    title,
                    description,
                    date: new Date(dateStr),
                    type: redDay ? "Red Alert" : "Normal",
                    status: "Active",
                  });
                  alert("Event added successfully");
                  fetchEvents();
                } catch (error) {
                  alert("Error adding event");
                }
              }
            }
          }}
          className="bg-[#6D28D9] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm font-bold text-sm hover:bg-purple-800 transition-colors"
        >
          <CalendarIcon className="w-4 h-4" /> Add Event
        </button>
      </div>

      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        {Object.keys(filters).map((key) => (
          <button
            key={key}
            onClick={() => toggleFilter(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${filters[key] ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
          >
            {key === "RedAlert" ? "Red Day Alerts" : key + "s"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden p-6">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium">
              No events found for the selected filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto h-full pr-2">
            {filteredEvents.map((event) => (
              <div
                key={event._id}
                className={`flex items-start gap-4 p-4 rounded-xl border-l-4 shadow-sm ${getColorForType(event.type)}`}
              >
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  {getIconForType(event.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">
                        {event.title}
                      </h3>
                      {event.type === "Red Alert" && (
                        <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                          <AlertTriangle className="w-3.5 h-3.5" /> Red Day
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                      {new Date(event.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">{event.description}</p>
                </div>
                {event.status !== "Completed" && (
                  <button
                    onClick={async () => {
                      try {
                        await api.put(`/calendar/${event._id}`, {
                          status: "Completed",
                        });
                        alert("Event marked as completed");
                        fetchEvents();
                      } catch (error) {
                        alert("Error marking event as completed");
                      }
                    }}
                    className="bg-white border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300 p-2 rounded-full transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarSystem;
