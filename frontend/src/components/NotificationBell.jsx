import { useState, useRef, useEffect } from 'react';
import { Bell, Truck, IndianRupee, AlertTriangle, UserPlus } from 'lucide-react';
import api from '../api/axios';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Click outside to close
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Fetch mock notifications from calendar/dashboard
    const fetchNotifications = async () => {
       try {
           const { data } = await api.get('/calendar');
           // Filter for upcoming/due ones as notifications
           const upcoming = data.slice(0, 5); // Just take first 5 for mockup
           setNotifications(upcoming);
       } catch (error) {
           console.error("Failed to load notifications", error);
       }
    };
    if (isOpen && notifications.length === 0) {
        fetchNotifications();
    }
  }, [isOpen, notifications.length]);

  const getIconForType = (type) => {
    switch(type) {
      case 'Delivery': return <Truck className="w-4 h-4 text-blue-500" />;
      case 'Payment': return <IndianRupee className="w-4 h-4 text-emerald-500" />;
      case 'Staff': return <AlertTriangle className="w-4 h-4 text-purple-500" />; // Salary alerts
      case 'Customer': return <UserPlus className="w-4 h-4 text-pink-500" />;
      case 'RedAlert': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getBgForType = (type) => {
    switch(type) {
      case 'Delivery': return 'bg-blue-50 border-blue-100';
      case 'Payment': return 'bg-emerald-50 border-emerald-100';
      case 'Staff': return 'bg-purple-50 border-purple-100';
      case 'Customer': return 'bg-pink-50 border-pink-100';
      case 'RedAlert': return 'bg-red-50 border-red-100';
      default: return 'bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-[#6D28D9] hover:bg-purple-50 rounded-full transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {/* Mock unread badge */}
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
          <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
             <h3 className="font-bold text-gray-800">Notifications</h3>
             <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">New</span>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
             {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm font-medium">
                   Loading...
                </div>
             ) : (
                <div className="divide-y divide-gray-50">
                    {notifications.map((n, i) => (
                       <div key={i} className={`p-4 hover:bg-gray-50 transition-colors flex gap-3 ${getBgForType(n.type)}`}>
                          <div className="bg-white p-2 rounded-full shadow-sm h-fit">
                             {getIconForType(n.type)}
                          </div>
                          <div>
                             <p className="text-sm font-bold text-gray-800">{n.title}</p>
                             <p className="text-xs text-gray-500 mt-0.5">{n.description}</p>
                             <p className="text-[10px] text-gray-400 mt-1 font-medium">{new Date(n.date).toLocaleDateString()}</p>
                          </div>
                       </div>
                    ))}
                </div>
             )}
          </div>
          
          <div className="p-3 border-t border-gray-100 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
             <span className="text-xs font-bold text-[#6D28D9]">View All in Calendar</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
