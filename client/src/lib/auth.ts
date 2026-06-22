import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { z } from 'zod';

export const loginSchema = z.object({
  loginId: z.string().min(3, 'Login ID is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface User {
  id: string;
  loginId: string;
  email: string;
  role: 'STUDENT' | 'HMC' | 'ADMIN';
  isActive: boolean;
  mustChangePassword: boolean;
  student?: {
    onboardingStatus: 'PENDING' | 'SUBMITTED';
  };
}

export const authKeys = {
  me: ['auth', 'me'] as const,
};

// Fetch current user
export const fetchMe = async (): Promise<User | null> => {
  try {
    const { data } = await api.get('/auth/me');
    return data.data;
  } catch (error) {
    return null;
  }
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: fetchMe,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry if 401
  });
}

// Login Mutation
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const { data } = await api.post('/auth/login', credentials);
      return data.data; // The user object returned from login
    },
    onSuccess: (data) => {
      // Optimistically set the user data
      queryClient.setQueryData(authKeys.me, data);
    },
  });
}

// Logout Mutation
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null);
      queryClient.clear(); // Clear all cached queries
    },
  });
}
