import { create } from 'zustand';
import { apiGet, apiPost } from '@/lib/api';

interface Sighting {
  id: string;
  personId: string;
  personName?: string;
  personPhoto?: string;
  sightingPhoto?: string;
  reporterName?: string;
  location: { lat: number; lng: number };
  description: string;
  timestamp: string;
  status: 'pending' | 'verified' | 'rejected';
  witnesses?: string[];
  reportedAt?: string;
  verifiedAt?: string;
  confidence?: number;
}

interface SightingState {
  sightings: Sighting[];
  pagination?: {
    total: number;
    page: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
}

interface SightingActions {
  fetchSightings: (params?: any) => Promise<void>;
  submitSighting: (sighting: Partial<Sighting>) => Promise<void>;
  verifySighting: (id: string) => Promise<void>;
  rejectSighting: (id: string) => Promise<void>;
}

export const useSightingStore = create<SightingState & SightingActions>((set) => ({
  sightings: [],
  pagination: { total: 0, page: 1, totalPages: 1 },
  loading: false,
  error: null,

  fetchSightings: async (params: any = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await apiGet<any>('/sightings', params);
      const data = Array.isArray(response) ? response : response.data || [];
      const paginationData = response.pagination || { total: data.length, page: 1, total_pages: 1 };
      
      set({ 
        sightings: data,
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
        error: error?.response?.data?.message || 'Failed to fetch sightings',
      });
    }
  },

  submitSighting: async (sighting: Partial<Sighting>) => {
    try {
      const response = await apiPost<any>('/sightings', sighting);
      const newSighting = response.data || response;
      set((state) => ({
        sightings: [newSighting, ...state.sightings],
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to submit sighting');
    }
  },

  verifySighting: async (id: string) => {
    try {
      await apiPost(`/sightings/${id}/verify`, {});
      set((state) => ({
        sightings: state.sightings.map((s) =>
          s.id === id ? { ...s, status: 'verified' } : s
        ),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to verify sighting');
    }
  },

  rejectSighting: async (id: string) => {
    try {
      await apiPost(`/sightings/${id}/reject`, {});
      set((state) => ({
        sightings: state.sightings.map((s) =>
          s.id === id ? { ...s, status: 'rejected' } : s
        ),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to reject sighting');
    }
  },
}));
