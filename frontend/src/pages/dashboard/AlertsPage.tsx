import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellRing, Filter, ChevronDown, ChevronLeft, ChevronRight,
  Check, CheckCheck, Eye, X, AlertTriangle, Camera, MapPin,
  Users, Shield, Info,
} from 'lucide-react';

import Skeleton from '../../components/common/Skeleton';
import { useAlertStore } from '../../stores/alertStore';

/* ---------- types ---------- */
interface Alert {
  id: string;
  type: 'detection' | 'sighting' | 'case_update' | 'system' | 'security';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  linkedType?: 'detection' | 'case' | 'sighting';
  linkedId?: string;
  linkedLabel?: string;
  severity: 'info' | 'warning' | 'critical';
}

type TypeFilter = 'all' | Alert['type'];
type ChannelFilter = 'all' | Alert['channel'];
type ReadFilter = 'all' | 'read' | 'unread';

/* ---------- constants ---------- */
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';
const NEON_CYAN = '#00f5ff';
const NEON_GREEN = '#00ff88';
const NEON_RED = '#ff3b3b';

const TYPE_CONFIG: Record<Alert['type'], { icon: React.ReactNode; color: string; label: string }> = {
  detection: { icon: <Camera size={14} />, color: '#00f5ff', label: 'Detection' },
  sighting: { icon: <MapPin size={14} />, color: '#00ff88', label: 'Sighting' },
  case_update: { icon: <Users size={14} />, color: '#a855f7', label: 'Case Update' },
  system: { icon: <Info size={14} />, color: '#ffaa00', label: 'System' },
  security: { icon: <Shield size={14} />, color: '#ff3b3b', label: 'Security' },
};

const SEVERITY_CONFIG: Record<Alert['severity'], { color: string; bg: string }> = {
  info: { color: '#00f5ff', bg: 'bg-[#00f5ff]/10' },
  warning: { color: '#ffaa00', bg: 'bg-[#ffaa00]/10' },
  critical: { color: '#ff3b3b', bg: 'bg-[#ff3b3b]/10' },
};

/* ========== PAGE ========== */
const AlertsPage: React.FC = () => {
  const {
    alerts, loading, pagination,
    fetchAlerts, markAsRead, markAllAsRead,
  } = useAlertStore();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [detailModal, setDetailModal] = useState<Alert | null>(null);

  useEffect(() => {
    fetchAlerts({ page, type: typeFilter, channel: channelFilter, read: readFilter });
  }, [page, typeFilter, channelFilter, readFilter, fetchAlerts]);

  const rows: Alert[] = useMemo(() => alerts ?? [], [alerts]);
  const unreadCount = useMemo(() => rows.filter((r) => !r.read).length, [rows]);
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Alert Center</h1>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#ff3b3b]/15 text-[#ff3b3b] text-xs font-medium">
              {unreadCount} unread
            </span>
          )}
        </div>
        <button
          onClick={() => markAllAsRead()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a2744] border border-white/10 text-sm text-gray-300 hover:text-[#00f5ff] transition-colors"
        >
          <CheckCheck size={14} /> Mark All Read
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'All', value: rows.length, color: NEON_CYAN },
          { label: 'Unread', value: unreadCount, color: NEON_RED },
          { label: 'Detections', value: rows.filter((r) => r.type === 'detection').length, color: '#00f5ff' },
          { label: 'Sightings', value: rows.filter((r) => r.type === 'sighting').length, color: '#00ff88' },
          { label: 'Critical', value: rows.filter((r) => r.severity === 'critical').length, color: '#ff3b3b' },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${CARD_BG} rounded-xl p-3 text-center`}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-gray-500 uppercase">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* filters */}
      <div className={`${CARD_BG} rounded-2xl p-4 space-y-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as TypeFilter); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="detection">Detection</option>
            <option value="sighting">Sighting</option>
            <option value="case_update">Case Update</option>
            <option value="system">System</option>
            <option value="security">Security</option>
          </select>
          <select
            value={channelFilter}
            onChange={(e) => { setChannelFilter(e.target.value as ChannelFilter); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none"
          >
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="push">Push</option>
            <option value="in_app">In-App</option>
          </select>
          <select
            value={readFilter}
            onChange={(e) => { setReadFilter(e.target.value as ReadFilter); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      {/* alert list */}
      <div className={`${CARD_BG} rounded-2xl overflow-hidden`}>
        {loading && rows.length === 0 ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Bell size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No alerts found.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {rows.map((alert, idx) => {
              const tc = TYPE_CONFIG[alert.type];
              const sc = SEVERITY_CONFIG[alert.severity];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setDetailModal(alert)}
                  className={`flex items-start gap-4 p-4 hover:bg-white/[0.02] cursor-pointer transition-colors ${!alert.read ? 'bg-[#00f5ff]/[0.02]' : ''}`}
                >
                  {/* type icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${tc.color}15`, color: tc.color }}
                  >
                    {tc.icon}
                  </div>

                  {/* content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-medium ${alert.read ? 'text-gray-400' : 'text-white'}`}>{alert.title}</p>
                      {!alert.read && <span className="w-2 h-2 rounded-full bg-[#00f5ff] flex-shrink-0" />}
                      <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full ${sc.bg}`} style={{ color: sc.color }}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-gray-600">{alert.timestamp}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 capitalize">{alert.channel}</span>
                      {alert.linkedLabel && (
                        <span className="text-[10px] text-[#00f5ff]">Linked: {alert.linkedLabel}</span>
                      )}
                    </div>
                  </div>

                  {/* mark read */}
                  {!alert.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(alert.id); }}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-[#00ff88] flex-shrink-0"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={16} /></button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* detail modal */}
      <AnimatePresence>
        {detailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDetailModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${CARD_BG} rounded-2xl p-6 max-w-md w-full`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Alert Detail</h2>
                <button onClick={() => setDetailModal(null)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400"><X size={18} /></button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${TYPE_CONFIG[detailModal.type].color}15`, color: TYPE_CONFIG[detailModal.type].color }}
                >
                  {TYPE_CONFIG[detailModal.type].icon}
                </div>
                <div>
                  <p className="text-white font-medium">{detailModal.title}</p>
                  <p className="text-xs text-gray-500 capitalize">{detailModal.type} &middot; {detailModal.channel}</p>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-4">{detailModal.message}</p>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Severity</span>
                  <span className="capitalize" style={{ color: SEVERITY_CONFIG[detailModal.severity].color }}>{detailModal.severity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="text-gray-300">{detailModal.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Channel</span>
                  <span className="text-gray-300 capitalize">{detailModal.channel}</span>
                </div>
                {detailModal.linkedLabel && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Linked</span>
                    <span className="text-[#00f5ff]">{detailModal.linkedLabel}</span>
                  </div>
                )}
              </div>

              {!detailModal.read && (
                <button
                  onClick={() => { markAsRead(detailModal.id); setDetailModal(null); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#00ff88]/15 text-[#00ff88] text-sm hover:bg-[#00ff88]/25 transition-colors"
                >
                  <Check size={14} /> Mark as Read
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AlertsPage;
