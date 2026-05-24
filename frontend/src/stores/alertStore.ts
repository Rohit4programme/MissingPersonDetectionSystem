import { create } from 'zustand';
import { apiGet, apiPatch } from '@/lib/api';
import type { Alert, PaginatedResponse } from '@/types';

interface PaginationState {
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

interface AlertState {
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
}

interface AlertActions {
  fetchAlerts: (params?: { page?: number; limit?: number; type?: string; channel?: string; read?: string }) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  addAlert: (alert: Alert) => void;
}

export const useAlertStore = create<AlertState & AlertActions>((set, get) => ({
  alerts: [],
  unreadCount: 0,
  isLoading: false,
  loading: false,
  error: null,
  pagination: {
    totalPages: 1,
    currentPage: 1,
    totalCount: 0,
  },

  fetchAlerts: async (params = {}) => {
    const { page = 1, limit = 20 } = params as any;
    set({ isLoading: true, loading: true, error: null });
    try {
      const response = await apiGet<any>('/alerts', { page, limit, ...params });
      const data = Array.isArray(response) ? response : response.data || [];
      const paginationData = response.pagination || response.meta || { total_pages: 1, total: data.length };
      
      set({
        alerts: data,
        isLoading: false,
        loading: false,
        pagination: {
          totalPages: paginationData.total_pages || paginationData.totalPages || 1,
          currentPage: page,
          totalCount: paginationData.total || paginationData.totalCount || data.length,
        },
      });
    } catch (error: any) {
      set({
        isLoading: false,
        loading: false,
        error: error?.response?.data?.message || 'Failed to fetch alerts',
      });
    }
  },

  markRead: async (id: string) => {
    try {
      await apiPatch(`/alerts/${id}/read`);
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, isRead: true, readAt: new Date().toISOString() } : a
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to mark alert as read');
    }
  },

  markAsRead: async (id: string) => {
    return get().markRead(id);
  },

  markAllRead: async () => {
    try {
      await apiPatch('/alerts/read-all');
      set((state) => ({
        alerts: state.alerts.map((a) => ({
          ...a,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to mark all alerts as read');
    }
  },

  markAllAsRead: async () => {
    return get().markAllRead();
  },

  fetchUnreadCount: async () => {
    try {
      const { count } = await apiGet<{ count: number }>('/alerts/unread-count');
      set({ unreadCount: count });
    } catch {
      // Silently fail - not critical
    }
  },

  addAlert: (alert: Alert) => {
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
