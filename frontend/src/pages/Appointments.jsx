import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'react-toastify';

const getMonthDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  const startDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  for (let i = 0; i < startDay; i += 1) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d += 1) {
    days.push(new Date(year, month, d));
  }
  return days;
};

const formatDateKey = (date) => date.toISOString().split('T')[0];

export default function Appointments() {
  const today = new Date();
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(formatDateKey(today));
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    customerName: '',
    purpose: '',
    notes: '',
    date: formatDateKey(today),
    time: '10:00',
  });

  const fetchAppointments = async () => {
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data || []);
    } catch (e) {
      console.error('Failed to fetch appointments', e);
      toast.error('Failed to fetch appointments');
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchAppointments();
    };
    init();
  }, []);

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    try {
      const dateTime = new Date(`${appointmentForm.date}T${appointmentForm.time}`);
      await api.post('/appointments', {
        customerName: appointmentForm.customerName,
        purpose: appointmentForm.purpose,
        notes: appointmentForm.notes,
        date: dateTime.toISOString(),
        status: 'Scheduled',
      });
      toast.success('Appointment created successfully!');
      setAppointmentForm({ customerName: '', purpose: '', notes: '', date: formatDateKey(today), time: '10:00' });
      setIsAppointmentFormOpen(false);
      fetchAppointments();
    } catch (error) {
      console.error('Failed to create appointment', error);
      toast.error('Failed to create appointment');
    }
  };

  const calendarDays = getMonthDays(viewMonth.getFullYear(), viewMonth.getMonth());
  const appointmentsByDate = appointments.reduce((acc, appointment) => {
    const dateKey = appointment.date ? new Date(appointment.date).toISOString().split('T')[0] : null;
    if (!dateKey) return acc;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(appointment);
    return acc;
  }, {});

  const selectedAppointments = appointmentsByDate[selectedDate] || [];
  const monthName = viewMonth.toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-gray-500">Calendar view with status by selected date.</p>
        </div>
        <button
          onClick={() => setIsCalendarModalOpen(true)}
          className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          title="Open Calendar"
        >
          <Calendar className="w-6 h-6" />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.8fr_1.2fr]">
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{monthName} {viewMonth.getFullYear()}</h2>
              <p className="text-sm text-gray-500">Select a date to view appointments.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="rounded-full border border-gray-200 p-2 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="rounded-full border border-gray-200 p-2 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 uppercase tracking-[0.16em] mb-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const dateKey = day ? formatDateKey(day) : null;
              const isSelected = dateKey === selectedDate;
              const hasAppointments = dateKey && appointmentsByDate[dateKey]?.length > 0;

              return (
                <button
                  key={`${day?.toString() || 'empty'}-${index}`}
                  type="button"
                  onClick={() => day && setSelectedDate(dateKey)}
                  className={`min-h-[72px] rounded-2xl border p-2 text-left transition ${
                    day
                      ? isSelected
                        ? 'border-[#6D28D9] bg-[#EEF2FF] text-[#111827]'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      : 'pointer-events-none bg-transparent border-transparent'
                  }`}
                >
                  {day ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{day.getDate()}</span>
                      {hasAppointments && <span className="h-2 w-2 rounded-full bg-[#6D28D9]" />}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Selected Date</h2>
              <p className="text-sm text-gray-500">{new Date(selectedDate).toLocaleDateString()}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(formatDateKey(today));
                setIsAppointmentFormOpen(true);
              }}
              className="rounded-full border border-[#6D28D9] bg-[#EEF2FF] px-3 py-1 text-sm text-[#6D28D9] hover:bg-[#E0E7FF] transition-colors font-medium"
            >
              + Add
            </button>
          </div>

          {selectedAppointments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              No appointments scheduled for this day.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedAppointments.map((appointment) => (
                <div key={appointment._id} className="rounded-3xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-semibold text-gray-900">{appointment.customerName || appointment.name || 'Customer'}</div>
                    <div className="text-sm text-gray-500">{new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    {appointment.purpose && <div className="text-sm text-[#6D28D9]">Purpose: {appointment.purpose}</div>}
                    {appointment.status && <div className="text-sm text-[#6D28D9]">Status: {appointment.status}</div>}
                    {appointment.notes && <div className="text-sm text-gray-600">{appointment.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Calendar Modal */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Calendar</h2>
              <button
                onClick={() => setIsCalendarModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="rounded-full border border-gray-200 p-2 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-semibold">{monthName} {viewMonth.getFullYear()}</h3>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="rounded-full border border-gray-200 p-2 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 uppercase tracking-wider mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {calendarDays.map((day, index) => {
                const dateKey = day ? formatDateKey(day) : null;
                const isSelected = dateKey === selectedDate;
                const hasAppointments = dateKey && appointmentsByDate[dateKey]?.length > 0;

                return (
                  <button
                    key={`${day?.toString() || 'empty'}-${index}`}
                    type="button"
                    onClick={() => {
                      if (day) {
                        setSelectedDate(dateKey);
                        setIsCalendarModalOpen(false);
                      }
                    }}
                    className={`p-2 text-sm rounded-lg border transition ${
                      day
                        ? isSelected
                          ? 'border-[#6D28D9] bg-[#EEF2FF] text-[#6D28D9] font-bold'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        : 'border-transparent bg-transparent'
                    }`}
                  >
                    {day ? (
                      <div className="flex flex-col items-center">
                        <span>{day.getDate()}</span>
                        {hasAppointments && <span className="h-1 w-1 rounded-full bg-[#6D28D9] mt-1" />}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsAppointmentFormOpen(true)}
              className="w-full bg-[#6D28D9] text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Add Appointment on {new Date(selectedDate).toLocaleDateString()}
            </button>
          </div>
        </div>
      )}

      {/* Appointment Creation Form Modal */}
      {isAppointmentFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Add Appointment</h2>
              <button
                onClick={() => setIsAppointmentFormOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  * Person Name
                </label>
                <input
                  required
                  type="text"
                  value={appointmentForm.customerName}
                  onChange={(e) =>
                    setAppointmentForm({ ...appointmentForm, customerName: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                  placeholder="Name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  * Purpose of Meeting
                </label>
                <input
                  required
                  type="text"
                  value={appointmentForm.purpose}
                  onChange={(e) =>
                    setAppointmentForm({ ...appointmentForm, purpose: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                  placeholder="e.g., Measurements, Fitting, Delivery"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={appointmentForm.date}
                  onChange={(e) =>
                    setAppointmentForm({ ...appointmentForm, date: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={appointmentForm.time}
                  onChange={(e) =>
                    setAppointmentForm({ ...appointmentForm, time: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Notes
                </label>
                <textarea
                  value={appointmentForm.notes}
                  onChange={(e) =>
                    setAppointmentForm({ ...appointmentForm, notes: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9] min-h-[80px]"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAppointmentFormOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#6D28D9] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Save Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
