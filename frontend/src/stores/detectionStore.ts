import { create } from 'zustand';
import { apiGet, apiPatch } from '@/lib/api';
import type { Detection, DetectionFilters, DetectionStats, PaginatedResponse } from '@/types';

interface DetectionState {
  detections: Detection[];
  recentDetections: Detection[];
  filters: DetectionFilters;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: DetectionStats | null;
  isLoading: boolean;
  loading: boolean;
  error: string | null;
}

interface DetectionActions {
  fetchDetections: (filters?: DetectionFilters) => Promise<void>;
  verifyDetection: (id: string, status: 'verified' | 'rejected', notes?: string) => Promise<void>;
  rejectDetection: (id: string, notes?: string) => Promise<void>;
  bulkVerify: (ids: string[]) => Promise<void>;
  bulkReject: (ids: string[]) => Promise<void>;
  fetchRecent: (limit?: number) => Promise<void>;
  fetchStats: () => Promise<void>;
  setFilters: (filters: Partial<DetectionFilters>) => void;
  addDetection: (detection: Detection) => void;
}

export const useDetectionStore = create<DetectionState & DetectionActions>((set, get) => ({
  detections: [],
  recentDetections: [],
  filters: {
    page: 1,
    limit: 20,
  },
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
  stats: null,
  isLoading: false,
  loading: false,
  error: null,

  fetchDetections: async (filters?: DetectionFilters) => {
    set({ isLoading: true, error: null });
    try {
      const currentFilters = { ...get().filters, ...filters };
      const response = await apiGet<PaginatedResponse<Detection>>('/detections', currentFilters as any);
      set({
        detections: response.data,
        pagination: {
          total: response.total,
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages,
        },
        filters: currentFilters,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.message || 'Failed to fetch detections',
      });
    }
  },

  verifyDetection: async (id: string, status: 'verified' | 'rejected', notes?: string) => {
    try {
      const updated = await apiPatch<Detection>(`/detections/${id}/verify`, { status, notes });
      set((state) => ({
        detections: state.detections.map((d) => (d.id === id ? updated : d)),
        recentDetections: state.recentDetections.map((d) => (d.id === id ? updated : d)),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to verify detection');
    }
  },

  fetchRecent: async (limit = 10) => {
    try {
      const detections = await apiGet<Detection[]>('/detections/recent', { limit });
      set({ recentDetections: detections });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to fetch recent detections',
      });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await apiGet<DetectionStats>('/detections/stats');
      set({ stats });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to fetch detection stats',
      });
    }
  },

  setFilters: (filters: Partial<DetectionFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  rejectDetection: async (id: string, notes?: string) => {
    try {
      const updated = await apiPatch<Detection>(`/detections/${id}/verify`, { status: 'rejected', notes });
      set((state) => ({
        detections: state.detections.map((d) => (d.id === id ? updated : d)),
        recentDetections: state.recentDetections.map((d) => (d.id === id ? updated : d)),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to reject detection');
    }
  },

  bulkVerify: async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => apiPatch(`/detections/${id}/verify`, { status: 'verified' })));
      set((state) => ({
        detections: state.detections.map((d) => (ids.includes(d.id) ? { ...d, status: 'verified' as const } : d)),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to verify detections');
    }
  },

  bulkReject: async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => apiPatch(`/detections/${id}/verify`, { status: 'rejected' })));
      set((state) => ({
        detections: state.detections.map((d) => (ids.includes(d.id) ? { ...d, status: 'rejected' as const } : d)),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to reject detections');
    }
  },

  addDetection: (detection: Detection) => {
    set((state) => ({
      recentDetections: [detection, ...state.recentDetections].slice(0, 20),
    }));
  },
}));
