import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Brain, Bell, Camera, Activity, FileText,
  Save, RefreshCw, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronRight,
  Server, Database, Cpu, HardDrive, Wifi,
} from 'lucide-react';

import Skeleton from '../../components/common/Skeleton';
import { useSettingsStore } from '../../stores/settingsStore';

/* ---------- types ---------- */
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
}

interface CameraDefaults {
  defaultResolution: string;
  defaultFps: number;
  healthCheckInterval: number;
  recordingEnabled: boolean;
  motionDetection: boolean;
  nightVision: boolean;
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

type Tab = 'ai' | 'notifications' | 'cameras' | 'health' | 'audit';

/* ---------- constants ---------- */
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';
const NEON_CYAN = '#00f5ff';
const NEON_GREEN = '#00ff88';
const NEON_RED = '#ff3b3b';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'ai', label: 'AI Settings', icon: <Brain size={14} /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
  { key: 'cameras', label: 'Camera Defaults', icon: <Camera size={14} /> },
  { key: 'health', label: 'System Health', icon: <Activity size={14} /> },
  { key: 'audit', label: 'Audit Log', icon: <FileText size={14} /> },
];

/* ---------- sub-components ---------- */
const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void; label: string; description?: string }> = ({
  enabled, onChange, label, description,
}) => (
  <div className="flex items-center justify-between py-3 border-b border-white/[0.03] last:border-0">
    <div>
      <p className="text-sm text-gray-200">{label}</p>
      {description && <p className="text-[10px] text-gray-600 mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-[#00ff88]/30' : 'bg-white/10'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${enabled ? 'translate-x-5 bg-[#00ff88]' : 'translate-x-0.5 bg-gray-500'}`} />
    </button>
  </div>
);

const Slider: React.FC<{ value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: string; suffix?: string }> = ({
  value, onChange, min, max, step = 1, label, suffix = '',
}) => (
  <div className="py-3">
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm text-gray-200">{label}</label>
      <span className="text-sm font-mono text-[#00f5ff]">{value}{suffix}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(+e.target.value)}
      className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-[#00f5ff] cursor-pointer
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00f5ff] [&::-webkit-slider-thumb]:shadow-[0_0_8px_#00f5ff]"
    />
  </div>
);

const HealthBar: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => {
  const color = value < 60 ? NEON_GREEN : value < 85 ? '#ffaa00' : NEON_RED;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-2 text-xs text-gray-400">
          {icon} {label}
        </span>
        <span className="text-xs font-mono" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

const ServiceStatus: React.FC<{ label: string; status: string }> = ({ label, status }) => {
  const ok = status === 'healthy' || status === 'connected';
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
      <span className="text-sm text-gray-300">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs ${ok ? 'text-[#00ff88]' : 'text-[#ff3b3b]'}`}>
        <span className={`w-2 h-2 rounded-full ${ok ? 'bg-[#00ff88]' : 'bg-[#ff3b3b]'}`} />
        {status}
      </span>
    </div>
  );
};

/* ========== PAGE ========== */
const SettingsPage: React.FC = () => {
  const {
    loading, aiSettings, notificationSettings, cameraDefaults, healthStatus, auditLogs,
    fetchSettings, updateAISettings, updateNotificationSettings, updateCameraDefaults, fetchAuditLogs,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [localAI, setLocalAI] = useState<AISettings | null>(null);
  const [localNotif, setLocalNotif] = useState<NotificationSettings | null>(null);
  const [localCamera, setLocalCamera] = useState<CameraDefaults | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (aiSettings) setLocalAI(aiSettings);
    if (notificationSettings) setLocalNotif(notificationSettings);
    if (cameraDefaults) setLocalCamera(cameraDefaults);
  }, [aiSettings, notificationSettings, cameraDefaults]);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchAuditLogs]);

  const handleSave = useCallback(async (tab: Tab) => {
    setSaving(true);
    try {
      if (tab === 'ai' && localAI) await updateAISettings(localAI);
      if (tab === 'notifications' && localNotif) await updateNotificationSettings(localNotif);
      if (tab === 'cameras' && localCamera) await updateCameraDefaults(localCamera);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [localAI, localNotif, localCamera, updateAISettings, updateNotificationSettings, updateCameraDefaults]);

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none focus:border-[#00f5ff]/50 transition-colors';

  if (loading && !aiSettings) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const renderAI = () => localAI && (
    <div className="space-y-2">
      <Slider
        label="Confidence Threshold"
        value={localAI.confidenceThreshold}
        onChange={(v) => setLocalAI((p) => p ? { ...p, confidenceThreshold: v } : null)}
        min={50} max={99} suffix="%"
      />
      <div className="py-3">
        <label className="block text-sm text-gray-200 mb-2">Matching Algorithm</label>
        <select
          value={localAI.matchingAlgorithm}
          onChange={(e) => setLocalAI((p) => p ? { ...p, matchingAlgorithm: e.target.value } : null)}
          className={inputCls}
        >
          <option value="arcface">ArcFace</option>
          <option value="facenet">FaceNet</option>
          <option value="deepface">DeepFace</option>
          <option value="dlib">Dlib</option>
        </select>
      </div>
      <Slider
        label="Max Concurrent Scans"
        value={localAI.maxConcurrentScans}
        onChange={(v) => setLocalAI((p) => p ? { ...p, maxConcurrentScans: v } : null)}
        min={1} max={50}
      />
      <Slider
        label="Auto-Verify Threshold"
        value={localAI.autoVerifyThreshold}
        onChange={(v) => setLocalAI((p) => p ? { ...p, autoVerifyThreshold: v } : null)}
        min={70} max={99} suffix="%"
      />
      <p className="text-[10px] text-gray-600 pt-2">
        <Info size={10} className="inline mr-1" />
        Detections above the auto-verify threshold will be automatically marked as verified.
      </p>
    </div>
  );

  const renderNotifications = () => localNotif && (
    <div className="space-y-1">
      <Toggle
        label="Email Notifications"
        description="Receive alerts via email"
        enabled={localNotif.emailEnabled}
        onChange={(v) => setLocalNotif((p) => p ? { ...p, emailEnabled: v } : null)}
      />
      <Toggle
        label="SMS Notifications"
        description="Receive alerts via SMS"
        enabled={localNotif.smsEnabled}
        onChange={(v) => setLocalNotif((p) => p ? { ...p, smsEnabled: v } : null)}
      />
      <Toggle
        label="Push Notifications"
        description="Browser push notifications"
        enabled={localNotif.pushEnabled}
        onChange={(v) => setLocalNotif((p) => p ? { ...p, pushEnabled: v } : null)}
      />
      <div className="pt-3 mt-3 border-t border-white/5">
        <p className="text-xs text-gray-500 uppercase mb-2">Alert Types</p>
        <Toggle label="Detection Alerts" enabled={localNotif.detectionAlerts} onChange={(v) => setLocalNotif((p) => p ? { ...p, detectionAlerts: v } : null)} />
        <Toggle label="Sighting Alerts" enabled={localNotif.sightingAlerts} onChange={(v) => setLocalNotif((p) => p ? { ...p, sightingAlerts: v } : null)} />
        <Toggle label="Case Updates" enabled={localNotif.caseUpdates} onChange={(v) => setLocalNotif((p) => p ? { ...p, caseUpdates: v } : null)} />
        <Toggle label="System Alerts" enabled={localNotif.systemAlerts} onChange={(v) => setLocalNotif((p) => p ? { ...p, systemAlerts: v } : null)} />
      </div>
      <div className="pt-3 mt-3 border-t border-white/5">
        <p className="text-xs text-gray-500 uppercase mb-2">Quiet Hours</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start</label>
            <input type="time" value={localNotif.quietHoursStart} onChange={(e) => setLocalNotif((p) => p ? { ...p, quietHoursStart: e.target.value } : null)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">End</label>
            <input type="time" value={localNotif.quietHoursEnd} onChange={(e) => setLocalNotif((p) => p ? { ...p, quietHoursEnd: e.target.value } : null)} className={inputCls} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderCameras = () => localCamera && (
    <div className="space-y-2">
      <div className="py-3">
        <label className="block text-sm text-gray-200 mb-2">Default Resolution</label>
        <select
          value={localCamera.defaultResolution}
          onChange={(e) => setLocalCamera((p) => p ? { ...p, defaultResolution: e.target.value } : null)}
          className={inputCls}
        >
          <option value="4K">4K (3840x2160)</option>
          <option value="1080p">1080p (1920x1080)</option>
          <option value="720p">720p (1280x720)</option>
          <option value="480p">480p (854x480)</option>
        </select>
      </div>
      <Slider
        label="Default FPS"
        value={localCamera.defaultFps}
        onChange={(v) => setLocalCamera((p) => p ? { ...p, defaultFps: v } : null)}
        min={5} max={60} suffix=" fps"
      />
      <Slider
        label="Health Check Interval"
        value={localCamera.healthCheckInterval}
        onChange={(v) => setLocalCamera((p) => p ? { ...p, healthCheckInterval: v } : null)}
        min={10} max={300} suffix="s"
      />
      <Toggle
        label="Recording Enabled"
        description="Record footage by default"
        enabled={localCamera.recordingEnabled}
        onChange={(v) => setLocalCamera((p) => p ? { ...p, recordingEnabled: v } : null)}
      />
      <Toggle
        label="Motion Detection"
        description="Enable motion-based detection"
        enabled={localCamera.motionDetection}
        onChange={(v) => setLocalCamera((p) => p ? { ...p, motionDetection: v } : null)}
      />
      <Toggle
        label="Night Vision Mode"
        description="Auto-enhance in low light"
        enabled={localCamera.nightVision}
        onChange={(v) => setLocalCamera((p) => p ? { ...p, nightVision: v } : null)}
      />
    </div>
  );

  const renderHealth = () => healthStatus && (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <HealthBar label="CPU" value={healthStatus.cpu} icon={<Cpu size={12} />} />
        <HealthBar label="Memory" value={healthStatus.memory} icon={<HardDrive size={12} />} />
        <HealthBar label="Disk" value={healthStatus.disk} icon={<Database size={12} />} />
      </div>

      <div className={`${CARD_BG} rounded-xl p-4`}>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-3">Services</h4>
        <ServiceStatus label="Database" status={healthStatus.database} />
        <ServiceStatus label="AI Engine" status={healthStatus.aiEngine} />
        <ServiceStatus label="WebSocket" status={healthStatus.websocket} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex justify-between py-2 border-b border-white/5">
          <span className="text-gray-500">Uptime</span>
          <span className="text-gray-300">{healthStatus.uptime}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-white/5">
          <span className="text-gray-500">Version</span>
          <span className="text-gray-300 font-mono">{healthStatus.version}</span>
        </div>
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="space-y-3">
      {(!auditLogs || auditLogs.length === 0) ? (
        <div className="text-center py-12 text-gray-500">
          <FileText size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No audit logs found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 uppercase">
                <th className="pb-2">Action</th>
                <th className="pb-2">User</th>
                <th className="pb-2">Target</th>
                <th className="pb-2">Details</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2.5 text-[#00f5ff] font-medium">{log.action}</td>
                  <td className="py-2.5 text-gray-300">{log.user}</td>
                  <td className="py-2.5 text-gray-400">{log.target}</td>
                  <td className="py-2.5 text-gray-500 max-w-[200px] truncate">{log.details}</td>
                  <td className="py-2.5 text-gray-600">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const tabContent: Record<Tab, () => React.ReactNode> = {
    ai: renderAI,
    notifications: renderNotifications,
    cameras: renderCameras,
    health: renderHealth,
    audit: renderAudit,
  };

  const showSave = activeTab === 'ai' || activeTab === 'notifications' || activeTab === 'cameras';

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      <h1 className="text-2xl font-bold text-white">System Settings</h1>

      {/* tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[#00f5ff]/15 text-[#00f5ff] border border-[#00f5ff]/30'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${CARD_BG} rounded-2xl p-6 max-w-3xl`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            {TABS.find((t) => t.key === activeTab)?.label}
          </h2>
          {showSave && (
            <button
              onClick={() => handleSave(activeTab)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#00f5ff]/15 border border-[#00f5ff]/30 text-xs text-[#00f5ff] hover:bg-[#00f5ff]/25 disabled:opacity-40 transition-colors"
            >
              {saving ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : saved ? (
                <CheckCircle size={12} className="text-[#00ff88]" />
              ) : (
                <Save size={12} />
              )}
              {saved ? 'Saved' : 'Save Changes'}
            </button>
          )}
        </div>

        {tabContent[activeTab]()}
      </motion.div>
    </div>
  );
};

export default SettingsPage;
