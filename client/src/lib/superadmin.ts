import axios from 'axios';
import { create } from 'zustand';

interface SuperAdminState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clearAccessToken: () => void;
}

// In-memory store for SuperAdmin
export const useSuperAdminStore = create<SuperAdminState>((set) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
  clearAccessToken: () => set({ accessToken: null }),
}));

// API client that uses the in-memory token
export const superAdminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

superAdminApi.interceptors.request.use((config) => {
  const token = useSuperAdminStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
