import { create } from 'zustand';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { User } from '@/types';

interface UserWithStatus extends User {
  name?: string;
  status?: 'active' | 'inactive';
  badge?: string;
}

interface UserState {
  users: UserWithStatus[];
  pagination?: {
    total: number;
    page: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
}

interface UserActions {
  fetchUsers: (params?: any) => Promise<void>;
  createUser: (user: Partial<UserWithStatus>) => Promise<void>;
  updateUser: (id: string, user: Partial<UserWithStatus>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  deactivateUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState & UserActions>((set) => ({
  users: [],
  pagination: { total: 0, page: 1, totalPages: 1 },
  loading: false,
  error: null,

  fetchUsers: async (params: any = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await apiGet<any>('/users', params);
      const data = Array.isArray(response) ? response : response.data || [];
      const paginationData = response.pagination || { total: data.length, page: 1, total_pages: 1 };
      
      set({ 
        users: data,
        pagination: {
          total: paginationData.total,
          page: params.page || 1,
          totalPages: paginationData.total_pages || 1,
        },
        loading: false 
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error?.response?.data?.message || 'Failed to fetch users',
      });
    }
  },

  createUser: async (user: Partial<UserWithStatus>) => {
    try {
      const response = await apiPost<any>('/users', user);
      const newUser = response.data || response;
      set((state) => ({
        users: [newUser, ...state.users],
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to create user');
    }
  },

  updateUser: async (id: string, user: Partial<UserWithStatus>) => {
    try {
      await apiPatch(`/users/${id}`, user);
      set((state) => ({
        users: state.users.map((u) =>
          u.id === id ? { ...u, ...user } : u
        ),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to update user');
    }
  },

  deleteUser: async (id: string) => {
    try {
      await apiPost(`/users/${id}/delete`, {});
      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to delete user');
    }
  },

  toggleUserStatus: async (id: string) => {
    try {
      await apiPatch(`/users/${id}/toggle-status`, {});
      set((state) => ({
        users: state.users.map((u) =>
          u.id === id 
            ? { ...u, isActive: !u.isActive, status: !u.isActive ? 'active' : 'inactive' } 
            : u
        ),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to toggle user status');
    }
  },

  deactivateUser: async (id: string) => {
    try {
      await apiPatch(`/users/${id}/deactivate`, {});
      set((state) => ({
        users: state.users.map((u) =>
          u.id === id ? { ...u, isActive: false, status: 'inactive' } : u
        ),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to deactivate user');
    }
  },
}));
