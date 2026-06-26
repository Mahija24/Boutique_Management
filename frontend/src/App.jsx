import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Workflow from './pages/Workflow';
import Staff from './pages/Staff';
import Profile from './pages/Profile';
import CalendarSystem from './pages/CalendarSystem';
import TaskAnalyzer from './pages/TaskAnalyzer';
import Appointments from './pages/Appointments';
import Gallery from './pages/Gallery';

// Protected Route Wrapper
const ProtectedRoute = ({ children, ownerOnly }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; // Or a global loading spinner
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (ownerOnly && user.role !== 'Owner') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="customers/*" element={<Customers />} />
        <Route path="orders/*" element={<Orders />} />
        <Route path="workflow/*" element={<Workflow />} />
        <Route path="task-analyzer" element={<TaskAnalyzer />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="calendar/*" element={<CalendarSystem />} />
        <Route path="profile" element={<Profile />} />
        <Route path="staff/*" element={<ProtectedRoute ownerOnly><Staff /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
