import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Lock, Mail, Loader2, User, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Owner');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      if (isLogin) {
        if (role === 'Staff') {
          if (!name || !phone) {
            setError('Please enter your full name and phone number');
            setLoading(false);
            return;
          }
          await login({ name, phone, role: 'Staff' });
        } else {
          if (!email || !password) {
            setError('Please enter email and password');
            setLoading(false);
            return;
          }
          await login({ email, password, role: 'Owner' });
        }
        navigate('/');
      } else {
        if (role === 'Staff') {
          if (!name || !phone) {
            setError('Please enter your full name and phone number');
            setLoading(false);
            return;
          }
          await register({ name, phone, role: 'Staff' });
          setSuccessMessage(
            'Login request submitted. Please wait for admin approval before signing in.',
          );
        } else {
          if (!name || !email || !password) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
          }
          await register({ name, email, password, role: 'Owner' });
          navigate('/');
        }
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Authentication failed. Please try again.';
      setError(message);
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7C3AED] via-[#9F67FF] to-[#F472B6] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-[#C4B5FD] opacity-20 rounded-full blur-3xl"></div>

      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 md:p-12 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] w-full max-w-md relative z-10 transition-all duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            <ShoppingBag className="w-8 h-8 text-[#7C3AED]" />
          </div>
          <h1 className="text-3xl font-bold text-white text-center">BoutiquePro</h1>
          <p className="text-white/80 mt-2 text-sm text-center">Premium Boutique Management System</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-white px-4 py-3 rounded-xl shadow-inner mb-6 text-sm flex items-center backdrop-blur-md">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 text-white px-4 py-3 rounded-xl shadow-inner mb-6 text-sm flex items-center backdrop-blur-md">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-4 mb-2">
            <label className={`flex-1 flex justify-center cursor-pointer py-2 rounded-xl border transition-all ${role === 'Owner' ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-md' : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'}`}>
              <input type="radio" name="role" value="Owner" className="hidden" onChange={(e) => setRole(e.target.value)} checked={role === 'Owner'} />
              <span className="font-medium text-sm">Owner</span>
            </label>
            <label className={`flex-1 flex justify-center cursor-pointer py-2 rounded-xl border transition-all ${role === 'Staff' ? 'bg-[#F472B6] border-[#F472B6] text-white shadow-md' : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'}`}>
              <input type="radio" name="role" value="Staff" className="hidden" onChange={(e) => setRole(e.target.value)} checked={role === 'Staff'} />
              <span className="font-medium text-sm">Staff</span>
            </label>
          </div>

          {role === 'Owner' && !isLogin && (
            <div className="space-y-1">
              <label className="text-white/90 text-sm font-medium ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white/50 group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:bg-white/10 transition-all font-medium"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          {role === 'Staff' && (
            <>
              <div className="space-y-1">
                <label className="text-white/90 text-sm font-medium ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-white/50 group-focus-within:text-white transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:bg-white/10 transition-all font-medium"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-white/90 text-sm font-medium ml-1">Phone Number</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-white/50 group-focus-within:text-white transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:bg-white/10 transition-all font-medium"
                    placeholder="Enter staff phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {role === 'Owner' && (
            <>
              <div className="space-y-1">
                <label className="text-white/90 text-sm font-medium ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-white/50 group-focus-within:text-white transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:bg-white/10 transition-all font-medium"
                    placeholder="store@boutique.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-white/90 text-sm font-medium ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-white/50 group-focus-within:text-white transition-colors" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl py-3 pl-11 pr-12 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:bg-white/10 transition-all font-medium"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/50 hover:text-white focus:outline-none transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-[#7C3AED] font-bold rounded-xl py-3.5 px-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex justify-center items-center disabled:opacity-70 disabled:hover:translate-y-0 mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
            ) : (
              isLogin ? 'Sign In' : role === 'Staff' ? 'Request Access' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              clearMessages();
            }}
            className="text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
            {isLogin
              ? 'New to BoutiquePro? Request access or create an account'
              : 'Already have an account? Sign In'}
          </button>
        </div>

        <div className="mt-6 text-center border-t border-white/10 pt-4 text-white/60 text-xs">
          Secure, Enterprise-Grade Encryption
        </div>
      </div>
    </div>
  );
};

export default Login;
