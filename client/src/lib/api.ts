import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Crucial for sending and receiving httpOnly cookies
});

// Interceptor to handle automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet, and it's not the refresh endpoint itself
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, we are truly logged out.
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
