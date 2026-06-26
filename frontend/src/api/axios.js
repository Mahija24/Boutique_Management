import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
  timeout: 15000,
});

const authApi = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
  timeout: 15000,
});

const getStoredToken = () => {
  const token = localStorage.getItem('token');
  if (token) return token;
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.token) {
      localStorage.setItem('token', storedUser.token);
      return storedUser.token;
    }
  } catch {
    // ignore invalid cache
  }
  return null;
};

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  const token = getStoredToken();
  const isAuthRoute = ['/auth/login', '/auth/register'].includes(config.url);

  if (token && !isAuthRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    // Minimal debug info to help diagnose missing/invalid tokens during development
    // Do not leak full token to logs
    console.debug(
      `[api] Request -> ${config.method?.toUpperCase() || 'GET'} ${config.url} Authorization=${token && !isAuthRoute ? 'PRESENT' : 'SKIPPED'}`,
    );
  } catch {
    // ignore
  }
  return config;
});

// Auto-recover from 401 by attempting to restore session via /auth/profile
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    console.error('[api] Response error', {
      url: originalRequest.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/profile'
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await authApi.get('/auth/profile');
        if (data) {
          localStorage.setItem('user', JSON.stringify(data));
          if (data?.token) localStorage.setItem('token', data.token);
        }
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
