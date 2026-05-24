import { create } from 'zustand';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api';
import type {
  MissingPerson,
  CaseFilters,
  CaseStats,
  PaginatedResponse,
} from '@/types';

interface CaseState {
  cases: MissingPerson[];
  currentCase: MissingPerson | null;
  filters: CaseFilters;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: CaseStats | null;
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  creating: boolean;
}

interface CaseActions {
  fetchCases: (filters?: CaseFilters) => Promise<void>;
  fetchCaseById: (id: string) => Promise<void>;
  createCase: (data: Partial<MissingPerson> | FormData) => Promise<MissingPerson>;
  updateCase: (id: string, data: Partial<MissingPerson>) => Promise<void>;
  updateStatus: (id: string, status: MissingPerson['status']) => Promise<void>;
  updateCaseStatus: (id: string, status: MissingPerson['status'], notes?: string) => Promise<void>;
  assignOfficer: (caseId: string, officerId: string) => Promise<void>;
  deleteCases: (ids: string[]) => Promise<void>;
  exportCases: (ids?: string[]) => Promise<void>;
  fetchStats: () => Promise<void>;
  setFilters: (filters: Partial<CaseFilters>) => void;
  clearCurrentCase: () => void;
}

export const useCaseStore = create<CaseState & CaseActions>((set, get) => ({
  cases: [],
  currentCase: null,
  filters: {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
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
  creating: false,

  fetchCases: async (filters?: CaseFilters) => {
    set({ isLoading: true, error: null });
    try {
      const currentFilters = { ...get().filters, ...filters };
      const response = await apiGet<PaginatedResponse<MissingPerson>>('/cases', currentFilters as any);
      set({
        cases: response.data,
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
        error: error?.response?.data?.message || 'Failed to fetch cases',
      });
    }
  },

  fetchCaseById: async (id: string) => {
    set({ isLoading: true, error: null, currentCase: null });
    try {
      const caseData = await apiGet<MissingPerson>(`/cases/${id}`);
      set({ currentCase: caseData, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.message || 'Failed to fetch case',
      });
    }
  },

  createCase: async (data: Partial<MissingPerson> | FormData) => {
    set({ creating: true, error: null });
    try {
      const newCase = await apiPost<MissingPerson>('/cases', data);
      set((state) => ({
        cases: [newCase, ...state.cases],
        creating: false,
      }));
      return newCase;
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to create case';
      set({ creating: false, error: message });
      throw new Error(message);
    }
  },

  updateCase: async (id: string, data: Partial<MissingPerson>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiPut<MissingPerson>(`/cases/${id}`, data);
      set((state) => ({
        cases: state.cases.map((c) => (c.id === id ? updated : c)),
        currentCase: state.currentCase?.id === id ? updated : state.currentCase,
        isLoading: false,
      }));
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to update case';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  updateStatus: async (id: string, status: MissingPerson['status']) => {
    try {
      await apiPatch(`/cases/${id}/status`, { status });
      set((state) => {
        const update = (c: MissingPerson) =>
          c.id === id ? { ...c, status } : c;
        return {
          cases: state.cases.map(update),
          currentCase:
            state.currentCase?.id === id
              ? { ...state.currentCase, status }
              : state.currentCase,
        };
      });
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || 'Failed to update status'
      );
    }
  },

  assignOfficer: async (caseId: string, officerId: string) => {
    try {
      await apiPatch(`/cases/${caseId}/assign`, { officerId });
      await get().fetchCaseById(caseId);
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || 'Failed to assign officer'
      );
    }
  },

  updateCaseStatus: async (id: string, status: MissingPerson['status'], notes?: string) => {
    try {
      await apiPatch(`/cases/${id}/status`, { status, notes });
      set((state) => {
        const update = (c: MissingPerson) => (c.id === id ? { ...c, status } : c);
        return {
          cases: state.cases.map(update),
          currentCase: state.currentCase?.id === id ? { ...state.currentCase, status } : state.currentCase,
        };
      });
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to update case status');
    }
  },

  deleteCases: async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => apiDelete(`/cases/${id}`)));
      set((state) => ({
        cases: state.cases.filter((c) => !ids.includes(c.id)),
      }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to delete cases');
    }
  },

  exportCases: async (ids?: string[]) => {
    try {
      const params = ids ? { ids: ids.join(',') } : {};
      const response = await apiGet<any>('/cases/export', params);
      // Trigger download
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cases-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to export cases');
    }
  },

  fetchStats: async () => {
    try {
      const stats = await apiGet<CaseStats>('/cases/stats');
      set({ stats });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || 'Failed to fetch stats',
      });
    }
  },

  setFilters: (filters: Partial<CaseFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearCurrentCase: () => set({ currentCase: null }),
}));
