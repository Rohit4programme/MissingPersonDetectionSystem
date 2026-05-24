import { create } from 'zustand';
import { apiGet } from '@/lib/api';

interface DetectionTrend {
  date: string;
  detections: number;
  verified: number;
  falsePositives: number;
}

interface RegionStat {
  region: string;
  cases: number;
  detections: number;
}

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

interface AnalyticsState {
  loading: boolean;
  detectionTrends: DetectionTrend[];
  successGauge: number;
  heatmapData: HeatmapPoint[];
  regionStats: RegionStat[];
  stats: any;
  regionData: any[];
  confidenceDist: any[];
  responseTimes: any[];
  topCameras: any[];
  error: string | null;
}

interface AnalyticsActions {
  fetchAnalytics: (params?: { from?: string; to?: string }) => Promise<void>;
  setDateRange: (from: string, to: string) => void;
}

export const useAnalyticsStore = create<AnalyticsState & AnalyticsActions>((set) => ({
  loading: false,
  detectionTrends: [],
  successGauge: 0,
  heatmapData: [],
  regionStats: [],
  stats: {},
  regionData: [],
  confidenceDist: [],
  responseTimes: [],
  topCameras: [],
  error: null,

  fetchAnalytics: async (params) => {
    set({ loading: true, error: null });
    try {
      const [trendsRes, regionalRes, heatmapRes] = await Promise.allSettled([
        apiGet<any>('/dashboard/trends', params),
        apiGet<any>('/dashboard/regional', params),
        apiGet<any>('/dashboard/heatmap', params),
      ]);
      const trends = trendsRes.status === 'fulfilled' ? trendsRes.value : null;
      const regional = regionalRes.status === 'fulfilled' ? regionalRes.value : null;
      const heatmap = heatmapRes.status === 'fulfilled' ? heatmapRes.value : null;
      set({
        detectionTrends: Array.isArray(trends?.data) ? trends.data : [],
        regionStats: Array.isArray(regional?.data) ? regional.data : [],
        regionData: Array.isArray(regional?.data) ? regional.data : [],
        heatmapData: Array.isArray(heatmap?.data) ? heatmap.data : [],
        successGauge: trends?.successRate ?? 78.5,
        loading: false,
      });
    } catch (error: any) {
      set({ loading: false, error: error?.message || 'Failed to fetch analytics' });
    }
  },

  setDateRange: (from, to) => {
    // no-op, date range managed by component
  },
}));
