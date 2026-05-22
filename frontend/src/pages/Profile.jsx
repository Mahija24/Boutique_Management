import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { User, Mail, Lock, CheckCircle } from 'lucide-react';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      const payload = { name, email };
      if (password) payload.password = password;
      const { data } = await api.put('/auth/profile', payload);
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      setMsg('Profile updated successfully!');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-full">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Profile Settings</h1>
      
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex-1">
        {msg && <div className="bg-green-50 text-emerald-600 p-4 rounded-xl mb-6 flex items-center gap-2 font-medium"><CheckCircle className="w-5 h-5"/> {msg}</div>}
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium">{error}</div>}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full pl-11 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-gray-50 focus:bg-white transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full pl-11 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-gray-50 focus:bg-white transition-colors" />
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Change Password</h3>
            <p className="text-sm text-gray-500 mb-4">Leave blank if you don't want to change your password.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-11 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-gray-50 focus:bg-white transition-colors" />
              </div>
            </div>
          </div>
          
          <div className="pt-6">
            <button type="submit" className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-3 rounded-xl shadow-md transition-colors">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default Profile;
