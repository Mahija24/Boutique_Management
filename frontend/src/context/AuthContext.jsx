/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        let parsedUser = null;

        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser);
            if (parsedUser && typeof parsedUser === 'object') {
              if (!parsedUser.token && storedToken) {
                parsedUser.token = storedToken;
                localStorage.setItem('user', JSON.stringify(parsedUser));
              }
              setUser(parsedUser);
              if (parsedUser?.token) {
                localStorage.setItem('token', parsedUser.token);
              }
            } else {
              throw new Error('Invalid stored user');
            }
          } catch (parseError) {
            console.warn('Invalid stored user data, clearing cache', parseError);
            localStorage.removeItem('user');
            parsedUser = null;
          }
        }

        try {
          const { data } = await api.get('/auth/profile');
          if (data) {
            const profileUser = {
              ...data,
              token: storedToken || parsedUser?.token || localStorage.getItem('token'),
            };
            if (profileUser.token) {
              localStorage.setItem('token', profileUser.token);
            }
            setUser(profileUser);
            localStorage.setItem('user', JSON.stringify(profileUser));
          }
        } catch (profileErr) {
          console.warn('Session invalid, clearing auth state', profileErr);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          try {
            await api.post('/auth/logout');
          } catch {
            // ignore logout failure
          }
          setUser(null);
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
      if (payload.role === 'Staff') {
        const { data } = await api.post('/staff/login', {
          name: payload.name,
          mobile: payload.phone,
        });

        if (data.status === 'pending' || data.status === 'rejected') {
          throw new Error(data.message);
        }

        if (data?.token) {
          localStorage.setItem('token', data.token);
        }
        const staffUser = data.user
          ? { ...data.user, token: data.token }
          : { ...data, token: data.token };
        setUser(staffUser);
        localStorage.setItem('user', JSON.stringify(staffUser));
        return staffUser;
      }

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

  const register = async (payload) => {
    try {
      if (payload.role === 'Staff') {
        const { data } = await api.post('/auth/request-login', {
          name: payload.name,
          phone: payload.phone,
        });
        return data;
      }
      const { data: registerRes } = await api.post('/auth/register', payload);
      const loginPayload = {
        email: payload.email,
        password: payload.password,
        role: 'Owner',
      };
      await login(loginPayload);
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
    }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
