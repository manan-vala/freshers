import axios from 'axios';

// DEPLOYMENT:
// In development: VITE_BASE_URL is empty → baseURL = '/api'
//   → Vite proxy intercepts '/api/*' and rewrites to 'http://localhost:5000/*'
const BASE_URL = `${import.meta.env.VITE_BASE_URL ?? ''}/api`;

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Crucial for sending and receiving httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to handle automatic token refresh
let isRefreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet, and it's not the refresh or login endpoint
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) return Promise.reject(error);
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh token
        await api.post('/v1/auth/refresh');
        isRefreshing = false;
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        // If refresh fails, we are truly logged out.
        if (!window.location.pathname.endsWith('/login')) {
          window.location.href = `${import.meta.env.VITE_BASE_URL ?? ''}/login`;
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
