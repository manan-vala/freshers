import axios from 'axios';

// superAdminApi is a separate Axios instance so its 401 handler redirects to
// /superadmin/login instead of the regular /login page.
export const superAdminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // Sends the httpOnly access_token cookie automatically
});

// On 401: redirect to the super admin login. The cookie is cleared server-side
// when the token expires or on logout.
superAdminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const base = import.meta.env.VITE_BASE_URL ?? '';
      window.location.href = `${base}/superadmin/login`;
    }
    return Promise.reject(error);
  }
);
