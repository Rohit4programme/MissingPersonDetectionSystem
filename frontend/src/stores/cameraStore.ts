import { create } from 'zustand';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { Camera, CameraFilters, PaginatedResponse } from '@/types';

interface CameraState {
  cameras: Camera[];
  currentCamera: Camera | null;
  filters: CameraFilters;
  pagination: { total: number; page: number; limit: number; totalPages: number };
  isLoading: boolean;
  loading: boolean;
  error: string | null;
}

interface CameraActions {
  fetchCameras: (filters?: CameraFilters) => Promise<void>;
  createCamera: (data: Partial<Camera>) => Promise<Camera>;
  addCamera: (data: Partial<Camera>) => Promise<Camera>;
  updateCamera: (id: string, data: Partial<Camera>) => Promise<void>;
  deleteCamera: (id: string) => Promise<void>;
  healthCheck: (id: string) => Promise<void>;
  startMonitoring: (id: string) => Promise<void>;
  stopMonitoring: (id: string) => Promise<void>;
  setFilters: (filters: Partial<CameraFilters>) => void;
}

export const useCameraStore = create<CameraState & CameraActions>((set, get) => ({
  cameras: [],
  currentCamera: null,
  filters: { page: 1, limit: 20 },
  pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
  isLoading: false,
  loading: false,
  error: null,

  fetchCameras: async (filters?: CameraFilters) => {
    set({ isLoading: true, error: null });
    try {
      const currentFilters = { ...get().filters, ...filters };
      const res = await apiGet<PaginatedResponse<Camera>>('/cameras', currentFilters as any);
      set({
        cameras: res.data,
        pagination: { total: res.total, page: res.page, limit: res.limit, totalPages: res.totalPages },
        filters: currentFilters,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error?.response?.data?.message || 'Failed to fetch cameras' });
    }
  },

  createCamera: async (data: Partial<Camera>) => {
    const camera = await apiPost<Camera>('/cameras', data);
    set((s) => ({ cameras: [camera, ...s.cameras] }));
    return camera;
  },

  updateCamera: async (id: string, data: Partial<Camera>) => {
    const updated = await apiPut<Camera>(`/cameras/${id}`, data);
    set((s) => ({
      cameras: s.cameras.map((c) => (c.id === id ? updated : c)),
    }));
  },

  deleteCamera: async (id: string) => {
    await apiDelete(`/cameras/${id}`);
    set((s) => ({ cameras: s.cameras.filter((c) => c.id !== id) }));
  },

  healthCheck: async (id: string) => {
    await apiPost(`/cameras/${id}/health-check`, {});
    await get().fetchCameras();
  },

  addCamera: async (data: Partial<Camera>) => {
    const camera = await apiPost<Camera>('/cameras', data);
    set((s) => ({ cameras: [camera, ...s.cameras] }));
    return camera;
  },

  startMonitoring: async (id: string) => {
    await apiPost(`/cameras/${id}/start-monitoring`, {});
    set((s) => ({
      cameras: s.cameras.map((c) => (c.id === id ? { ...c, monitoring: true } : c)),
    }));
  },

  stopMonitoring: async (id: string) => {
    await apiPost(`/cameras/${id}/stop-monitoring`, {});
    set((s) => ({
      cameras: s.cameras.map((c) => (c.id === id ? { ...c, monitoring: false } : c)),
    }));
  },

  setFilters: (filters) => {
    set((s) => ({ filters: { ...s.filters, ...filters } }));
  },
}));
