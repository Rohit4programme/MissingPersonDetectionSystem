import { create } from 'zustand';
import { apiGet } from '@/lib/api';
import type { DashboardStats } from '@/types';

interface FeedItem {
  id: string;
  type: 'detection' | 'sighting' | 'alert' | 'case_update';
  title: string;
  description: string;
  timestamp: string;
  confidence?: number;
  personName?: string;
  personPhoto?: string;
  capturedPhoto?: string;
  cameraName?: string;
  location?: string;
}

interface Hotspot {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  label: string;
}

interface TrendPoint {
  date: string;
  detections: number;
  sightings: number;
  cases: number;
}

interface StatusPie {
  name: string;
  value: number;
  color: string;
}

interface DashboardState {
  stats: DashboardStats | null;
  feed: FeedItem[];
  hotspots: Hotspot[];
  trendData: TrendPoint[];
  statusData: StatusPie[];
  lastRefresh: string | null;
  isLoading: boolean;
  loading: boolean;
  error: string | null;
  recentActivity: any[];
}

interface DashboardActions {
  fetchDashboard: () => Promise<void>;
  prependFeedItem: (item: FeedItem) => void;
  setStats: (stats: any) => void;
  setRecentActivity: (activity: any[]) => void;
}

export const useDashboardStore = create<DashboardState & DashboardActions>((set) => ({
  stats: null,
  feed: [],
  hotspots: [],
  trendData: [],
  statusData: [],
  lastRefresh: null,
  isLoading: false,
  loading: false,
  error: null,
  recentActivity: [],

  fetchDashboard: async () => {
    set({ isLoading: true, loading: true, error: null });
    try {
      const [statsRes, trendsRes, heatmapRes] = await Promise.allSettled([
        apiGet<DashboardStats>('/dashboard/stats'),
        apiGet<any>('/dashboard/trends'),
        apiGet<any>('/dashboard/heatmap'),
      ]);
      const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
      const trends = trendsRes.status === 'fulfilled' ? trendsRes.value : null;
      const heatmap = heatmapRes.status === 'fulfilled' ? heatmapRes.value : null;
      set({
        stats,
        trendData: Array.isArray(trends?.data) ? trends.data : [],
        statusData: stats?.casesByStatus
          ? Object.entries(stats.casesByStatus).map(([name, value]) => ({
              name, value: value as number,
              color: name === 'missing' ? '#ff3b3b' : name === 'investigating' ? '#ffaa00' : name === 'detected' ? '#00f5ff' : name === 'found' ? '#00ff88' : '#6b7280',
            }))
          : [],
        hotspots: Array.isArray(heatmap?.data) ? heatmap.data : [],
        lastRefresh: new Date().toISOString(),
        isLoading: false, loading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, loading: false, error: error?.message || 'Failed to fetch dashboard' });
    }
  },

  prependFeedItem: (item: FeedItem) => {
    set((state) => ({ feed: [item, ...state.feed].slice(0, 50) }));
  },

  setStats: (stats: any) => set({ stats }),
  setRecentActivity: (recentActivity: any[]) => set({ recentActivity }),
}));
