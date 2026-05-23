import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          if (parsedUser?.token) {
            localStorage.setItem('token', parsedUser.token);
          }
        }
      } catch (error) {
        console.error('Session expired or invalid', error);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (payload) => {
    try {
      const { data } = await api.post('/auth/login', payload);
      if (data?.token) {
        localStorage.setItem('token', data.token);
      }
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const { data: registerRes } = await api.post('/auth/register', { name, email, password, role });
      const loginPayload = role === 'Staff' ? { phone: email, role: 'Staff' } : { email, password, role: 'Owner' };
      const loginData = await login(loginPayload);
      if (loginData?.token) {
        localStorage.setItem('token', loginData.token);
      }
      return registerRes;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // proceed to clear client state anyway
    }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
