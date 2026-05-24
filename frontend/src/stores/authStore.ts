import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiPost, apiGet, apiPut } from '@/lib/api';
import type { User, LoginResponse } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'public' | 'officer';
  badgeNumber?: string;
  department?: string;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiPost<LoginResponse>('/auth/login', {
            email,
            password,
          });
          const { user, token, refreshToken } = response;
          localStorage.setItem('mpds_token', token);
          localStorage.setItem('mpds_refresh_token', refreshToken);
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const message =
            error?.response?.data?.message || error?.message || 'Login failed';
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiPost<LoginResponse>('/auth/register', data);
          const { user, token, refreshToken } = response;
          localStorage.setItem('mpds_token', token);
          localStorage.setItem('mpds_refresh_token', refreshToken);
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const message =
            error?.response?.data?.message || error?.message || 'Registration failed';
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      logout: () => {
        localStorage.removeItem('mpds_token');
        localStorage.removeItem('mpds_refresh_token');
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true, error: null });
        try {
          const user = await apiPut<User>('/auth/profile', data);
          set({ user, isLoading: false });
        } catch (error: any) {
          const message =
            error?.response?.data?.message || 'Failed to update profile';
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('mpds_token');
        if (!token) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }
        set({ isLoading: true });
        try {
          const user = await apiGet<User>('/auth/me');
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          localStorage.removeItem('mpds_token');
          localStorage.removeItem('mpds_refresh_token');
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'mpds-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
