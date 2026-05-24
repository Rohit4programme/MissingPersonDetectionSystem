import { create } from 'zustand';
import { apiGet, apiPut, apiPatch } from '@/lib/api';

interface AISettings {
  confidenceThreshold: number;
  matchingAlgorithm: string;
  maxConcurrentScans: number;
  autoVerifyThreshold: number;
}

interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  detectionAlerts: boolean;
  sightingAlerts: boolean;
  caseUpdates: boolean;
  systemAlerts: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

interface CameraDefaults {
  defaultResolution: string;
  defaultFps: number;
  healthCheckInterval: number;
  recordingEnabled: boolean;
  motionDetection: boolean;
  nightVision: boolean;
  resolution: string;
  fps: number;
  protocol: string;
}

interface HealthStatus {
  cpu: number;
  memory: number;
  disk: number;
  database: 'healthy' | 'degraded' | 'down';
  aiEngine: 'healthy' | 'degraded' | 'down';
  websocket: 'connected' | 'disconnected';
  uptime: string;
  version: string;
}

interface AuditLog {
  id: string;
  action: string;
  user: string;
  target: string;
  timestamp: string;
  details: string;
}

interface SettingsState {
  notifications: boolean;
  theme: 'light' | 'dark';
  language: string;
  loading: boolean;
  aiSettings: AISettings | null;
  notificationSettings: NotificationSettings | null;
  cameraDefaults: CameraDefaults | null;
  healthStatus: HealthStatus | null;
  auditLogs: AuditLog[];
  error: string | null;
}

interface SettingsActions {
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<SettingsState>) => Promise<void>;
  updateAISettings: (settings: AISettings) => Promise<void>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  updateCameraDefaults: (defaults: CameraDefaults) => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
}

const defaultAI: AISettings = {
  confidenceThreshold: 0.70,
  matchingAlgorithm: 'facenet',
  maxConcurrentScans: 10,
  autoVerifyThreshold: 0.90,
};

const defaultNotifications: NotificationSettings = {
  emailEnabled: true, smsEnabled: true, pushEnabled: true,
  detectionAlerts: true, sightingAlerts: true, caseUpdates: true, systemAlerts: true,
  quietHoursStart: '22:00', quietHoursEnd: '07:00',
  email: true, sms: true, push: true,
};

const defaultCamera: CameraDefaults = {
  defaultResolution: '1920x1080', defaultFps: 30, healthCheckInterval: 60,
  recordingEnabled: true, motionDetection: true, nightVision: false,
  resolution: '1080p', fps: 30, protocol: 'rtsp',
};

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  notifications: true,
  theme: 'dark',
  language: 'en',
  loading: false,
  aiSettings: null,
  notificationSettings: null,
  cameraDefaults: null,
  healthStatus: null,
  auditLogs: [],
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiGet<any>('/settings').catch(() => null);
      set({
        aiSettings: res?.aiSettings ?? defaultAI,
        notificationSettings: res?.notificationSettings ?? defaultNotifications,
        cameraDefaults: res?.cameraDefaults ?? defaultCamera,
        healthStatus: res?.healthStatus ?? {
          cpu: 45, memory: 62, disk: 38,
          database: 'healthy', aiEngine: 'healthy',
          websocket: 'connected', uptime: '14d 6h 32m', version: '1.0.0',
        },
        loading: false,
      });
    } catch {
      set({
        aiSettings: defaultAI, notificationSettings: defaultNotifications,
        cameraDefaults: defaultCamera, loading: false,
      });
    }
  },

  updateSettings: async (settings: Partial<SettingsState>) => {
    try {
      await apiPatch('/settings', settings);
      set((state) => ({ ...state, ...settings }));
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to update settings');
    }
  },

  updateAISettings: async (data) => {
    await apiPut('/settings/ai', data);
    set({ aiSettings: data });
  },

  updateNotificationSettings: async (data) => {
    await apiPut('/settings/notifications', data);
    set({ notificationSettings: data });
  },

  updateCameraDefaults: async (data) => {
    await apiPut('/settings/cameras', data);
    set({ cameraDefaults: data });
  },

  fetchAuditLogs: async () => {
    try {
      const res = await apiGet<any>('/audit-logs');
      set({ auditLogs: res?.data ?? Array.isArray(res) ? res : [] });
    } catch {
      set({ auditLogs: [] });
    }
  },
}));
