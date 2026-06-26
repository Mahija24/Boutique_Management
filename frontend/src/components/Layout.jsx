import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart2, 
  Users, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  Menu,
  ListTodo,
  CalendarCheck,
  Calendar,
  LayoutDashboard,
  Heart,
  PackageSearch,
  Receipt,
  IndianRupee,
  UserCircle,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const Layout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Map existing pages to the new 'fabriplay' style navigation
  // We include extra items as placeholders to match the visual design
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Orders', icon: ShoppingBag, path: '/orders' },
    { name: 'Tasks', icon: ListTodo, path: '/workflow' },
    { name: 'Task Analyzer', icon: CalendarCheck, path: '/task-analyzer' },
    { name: 'CRM', icon: Users, path: '/customers' },
    { name: 'Appointments', icon: Calendar, path: '/appointments' },
    { name: 'Calendar', icon: Calendar, path: '/calendar' },
  ];

  if (user?.role === 'Owner') {
    navItems.push({ name: 'Employees', icon: UserCircle, path: '/staff' });
    navItems.push({ name: 'Gallery', icon: ImageIcon, path: '/gallery' });
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-sans text-gray-800">
      {/* Sidebar background overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-[240px] bg-white border-r border-gray-100 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Area */}
        <div className="flex items-center justify-center h-20">
          <div className="text-2xl font-bold text-[#6D28D9] flex items-center gap-2">
            <span className="bg-[#6D28D9] text-white p-1 rounded-md text-sm font-black">f</span>
            fabriplay
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 space-y-1">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.name}>
                {item.placeholder ? (
                  <div className="flex items-center w-full px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 cursor-not-allowed opacity-70">
                    <item.icon className="w-4 h-4 mr-3 opacity-70" strokeWidth={2} />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                ) : (
                  <NavLink 
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center w-full px-3 py-2.5 rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-[#6D28D9] text-white shadow-md shadow-purple-200/50' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                    `}
                  >
                    <item.icon className={`w-4 h-4 mr-3 ${item.name === 'Dashboard' ? 'fill-current' : ''}`} strokeWidth={item.name === 'Dashboard' ? 0 : 2} />
                    <span className="font-medium text-sm">{item.name}</span>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header restored for Desktop and Mobile */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 border-b border-gray-100 sticky top-0 z-20">
          <div className="flex items-center gap-4 lg:hidden">
            <div className="text-xl font-bold text-[#6D28D9]">fabriplay</div>
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="text-gray-500 hover:text-[#6D28D9] focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
          <div className="hidden lg:block">
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Management Portal</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800">{user?.name}</p>
              <p className="text-xs text-[#F472B6] font-semibold">{user?.role}</p>
            </div>
            {user?.role === 'Owner' && <NotificationBell />}
            <NavLink to="/profile" className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#F472B6] text-white flex items-center justify-center font-bold text-lg shadow-md hover:scale-105 transition-transform" title="Profile Settings">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </NavLink>
            <button
              onClick={logout}
              className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#FDFDFD] p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

