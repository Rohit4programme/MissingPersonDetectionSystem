import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, ChevronDown, Eye, Play, Square, Trash2,
  Wifi, WifiOff, AlertTriangle, CheckCircle, X, Camera as CameraIcon,
  Settings, Activity,
} from 'lucide-react';

import Skeleton from '../../components/common/Skeleton';
import { useCameraStore } from '../../stores/cameraStore';

/* ---------- types ---------- */
interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
  location: string;
  type: 'fixed' | 'ptz' | 'dome' | 'body';
  status: 'online' | 'offline' | 'warning' | 'error';
  lastHealthCheck: string;
  monitoring: boolean;
  detectionCount: number;
  resolution: string;
  fps: number;
}

interface NewCameraForm {
  name: string;
  rtspUrl: string;
  location: string;
  type: Camera['type'];
}

/* ---------- constants ---------- */
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';
const NEON_CYAN = '#00f5ff';
const NEON_GREEN = '#00ff88';
const NEON_RED = '#ff3b3b';

const STATUS_CONFIG: Record<Camera['status'], { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  online: { color: '#00ff88', bg: 'bg-[#00ff88]/10', label: 'Online', icon: <CheckCircle size={12} /> },
  offline: { color: '#ff3b3b', bg: 'bg-[#ff3b3b]/10', label: 'Offline', icon: <WifiOff size={12} /> },
  warning: { color: '#ffaa00', bg: 'bg-[#ffaa00]/10', label: 'Warning', icon: <AlertTriangle size={12} /> },
  error: { color: '#ff3b3b', bg: 'bg-[#ff3b3b]/10', label: 'Error', icon: <AlertTriangle size={12} /> },
};

const CAMERA_TYPES: Camera['type'][] = ['fixed', 'ptz', 'dome', 'body'];

/* ========== PAGE ========== */
const CamerasPage: React.FC = () => {
  const {
    cameras, loading, fetchCameras, addCamera, deleteCamera,
    startMonitoring, stopMonitoring,
  } = useCameraStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailCamera, setDetailCamera] = useState<Camera | null>(null);
  const [newCamera, setNewCamera] = useState<NewCameraForm>({ name: '', rtspUrl: '', location: '', type: 'fixed' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const filtered: Camera[] = useMemo(() => {
    let list = cameras ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }
    return list;
  }, [cameras, search, statusFilter]);

  const handleAdd = useCallback(async () => {
    if (!newCamera.name || !newCamera.rtspUrl) return;
    setAdding(true);
    try {
      await addCamera(newCamera);
      setShowAddModal(false);
      setNewCamera({ name: '', rtspUrl: '', location: '', type: 'fixed' });
    } finally {
      setAdding(false);
    }
  }, [newCamera, addCamera]);

  const handleToggleMonitoring = useCallback(
    (cam: Camera) => (cam.monitoring ? stopMonitoring : startMonitoring)(cam.id),
    [startMonitoring, stopMonitoring],
  );

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#00f5ff]/50 transition-colors';

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">CCTV Camera Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#00f5ff]/15 text-[#00f5ff] border border-[#00f5ff]/30 hover:bg-[#00f5ff]/25 transition-colors"
        >
          <Plus size={16} /> Add Camera
        </button>
      </div>

      {/* search + filters */}
      <div className={`${CARD_BG} rounded-2xl p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cameras..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#00f5ff]/50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: (cameras ?? []).length, color: NEON_CYAN },
          { label: 'Online', value: (cameras ?? []).filter((c) => c.status === 'online').length, color: NEON_GREEN },
          { label: 'Offline', value: (cameras ?? []).filter((c) => c.status === 'offline').length, color: NEON_RED },
          { label: 'Monitoring', value: (cameras ?? []).filter((c) => c.monitoring).length, color: '#a855f7' },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${CARD_BG} rounded-xl p-3 text-center`}
          >
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-gray-500 uppercase">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* table */}
      <div className={`${CARD_BG} rounded-2xl overflow-hidden`}>
        {loading && (cameras ?? []).length === 0 ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <CameraIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No cameras found.</p>
            <button onClick={() => setShowAddModal(true)} className="mt-3 text-sm text-[#00f5ff] hover:underline">Add a camera</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase text-gray-500">
                  <th className="p-3">Name</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Health Check</th>
                  <th className="p-3">Detections</th>
                  <th className="p-3">Monitoring</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cam, idx) => {
                  const st = STATUS_CONFIG[cam.status];
                  return (
                    <motion.tr
                      key={cam.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <CameraIcon size={14} className="text-gray-500" />
                          <span className="text-white font-medium">{cam.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-gray-400">{cam.location}</td>
                      <td className="p-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 capitalize">{cam.type}</span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${st.bg}`} style={{ color: st.color }}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{cam.lastHealthCheck}</td>
                      <td className="p-3 font-mono text-xs text-gray-300">{cam.detectionCount}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleMonitoring(cam)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${cam.monitoring ? 'bg-[#00ff88]/30' : 'bg-white/10'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${cam.monitoring ? 'translate-x-5 bg-[#00ff88]' : 'translate-x-0.5 bg-gray-500'}`} />
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setDetailCamera(cam)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-[#00f5ff]">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => deleteCamera(cam.id)} className="p-1.5 rounded-lg hover:bg-[#ff3b3b]/10 text-gray-400 hover:text-[#ff3b3b]">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* add camera modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${CARD_BG} rounded-2xl p-6 max-w-md w-full`}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-white">Add Camera</h2>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Camera Name *</label>
                  <input value={newCamera.name} onChange={(e) => setNewCamera((p) => ({ ...p, name: e.target.value }))} placeholder="e.g., Gate 1 Camera" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">RTSP URL *</label>
                  <input value={newCamera.rtspUrl} onChange={(e) => setNewCamera((p) => ({ ...p, rtspUrl: e.target.value }))} placeholder="rtsp://..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Location</label>
                  <input value={newCamera.location} onChange={(e) => setNewCamera((p) => ({ ...p, location: e.target.value }))} placeholder="Location description" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select value={newCamera.type} onChange={(e) => setNewCamera((p) => ({ ...p, type: e.target.value as Camera['type'] }))} className={inputCls}>
                    {CAMERA_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-300 hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding || !newCamera.name || !newCamera.rtspUrl}
                  className="flex-1 py-2 rounded-lg bg-[#00f5ff]/15 border border-[#00f5ff]/30 text-sm text-[#00f5ff] hover:bg-[#00f5ff]/25 disabled:opacity-40 transition-colors"
                >
                  {adding ? 'Adding...' : 'Add Camera'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* detail modal */}
      <AnimatePresence>
        {detailCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDetailCamera(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${CARD_BG} rounded-2xl p-6 max-w-lg w-full`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">{detailCamera.name}</h2>
                <button onClick={() => setDetailCamera(null)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400"><X size={18} /></button>
              </div>

              {/* live preview placeholder */}
              <div className="h-48 rounded-xl bg-[#0a1628] border border-white/5 flex items-center justify-center mb-4">
                <div className="text-center text-gray-600">
                  <CameraIcon size={32} className="mx-auto mb-2" />
                  <p className="text-xs">Live Preview</p>
                  <p className="text-[10px] text-gray-700">{detailCamera.rtspUrl}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="text-gray-300">{detailCamera.location}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="text-gray-300 capitalize">{detailCamera.type}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Resolution</span><span className="text-gray-300">{detailCamera.resolution}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">FPS</span><span className="text-gray-300">{detailCamera.fps}</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span style={{ color: STATUS_CONFIG[detailCamera.status].color }} className="capitalize">{detailCamera.status}</span>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Detections</span><span className="text-white font-mono">{detailCamera.detectionCount}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Last Check</span><span className="text-gray-400 text-xs">{detailCamera.lastHealthCheck}</span></div>
              </div>

              <div className="flex gap-3 mt-5 pt-4 border-t border-white/5">
                <button
                  onClick={() => handleToggleMonitoring(detailCamera)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition-colors ${
                    detailCamera.monitoring
                      ? 'bg-[#ff3b3b]/15 text-[#ff3b3b] hover:bg-[#ff3b3b]/25'
                      : 'bg-[#00ff88]/15 text-[#00ff88] hover:bg-[#00ff88]/25'
                  }`}
                >
                  {detailCamera.monitoring ? <><Square size={14} /> Stop</> : <><Play size={14} /> Start Monitoring</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CamerasPage;
