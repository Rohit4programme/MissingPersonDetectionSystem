import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, Users, FileText, TrendingUp, TrendingDown,
  Eye, Clock, RefreshCw, Wifi, WifiOff,
} from 'lucide-react';

import StatsCard from '../../components/common/StatsCard';
import FaceMatchCard from '../../components/common/FaceMatchCard';
import Skeleton from '../../components/common/Skeleton';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useSocketStore } from '../../stores/socketStore';

/* ---------- types ---------- */
interface DetectionFeedItem {
  id: string;
  personName: string;
  personPhoto: string;
  capturedPhoto: string;
  confidence: number;
  cameraName: string;
  timestamp: string;
}

interface HotspotMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  count: number;
}

interface TrendPoint {
  date: string;
  detections: number;
}

interface StatusSlice {
  name: string;
  value: number;
  color: string;
}

/* ---------- constants ---------- */
const NEON_CYAN = '#00f5ff';
const NEON_GREEN = '#00ff88';
const NEON_RED = '#ff3b3b';
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';
const STATUS_COLORS = ['#00f5ff', '#00ff88', '#ff3b3b', '#ffaa00', '#a855f7'];

/* ---------- custom marker icon ---------- */
const hotspotIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><circle cx="14" cy="14" r="12" fill="#00f5ff" fill-opacity="0.35" stroke="#00f5ff" stroke-width="2"/></svg>`,
    ),
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/* ---------- sub-components ---------- */
const CardShell: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className = '',
  delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    className={`${CARD_BG} rounded-2xl p-5 ${className}`}
  >
    {children}
  </motion.div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">{children}</h3>
);

/* ========== PAGE ========== */
const DashboardPage: React.FC = () => {
  const {
    stats, trendData, statusData, feed, hotspots,
    loading, lastRefresh, fetchDashboard,
  } = useDashboardStore();

  const { connected, on, off } = useSocketStore();

  const [refreshing, setRefreshing] = useState(false);

  /* initial + auto-refresh every 30s */
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => fetchDashboard(), 30_000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  /* socket real-time */
  useEffect(() => {
    const handler = (detection: DetectionFeedItem) => {
      useDashboardStore.getState().prependFeedItem(detection);
    };
    on('detection:new', handler);
    return () => off('detection:new', handler);
  }, [on, off]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  /* loading skeleton */
  if (loading && !stats) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Police Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Last refreshed: {lastRefresh ? new Date(lastRefresh).toLocaleTimeString() : '--'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs">
            {connected ? (
              <>
                <Wifi size={14} className="text-[#00ff88]" />
                <span className="text-[#00ff88]">Live</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-[#ff3b3b]" />
                <span className="text-[#ff3b3b]">Offline</span>
              </>
            )}
          </span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2744] border border-white/10 text-sm text-gray-300 hover:text-[#00f5ff] transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ---- stats cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Cases"
          value={stats?.activeCases ?? 0}
          icon={<FileText size={20} />}
          trend={stats?.activeCasesTrend}
          color={NEON_CYAN}
          delay={0}
        />
        <StatsCard
          title="Detections Today"
          value={stats?.detectionsToday ?? 0}
          icon={<Eye size={20} />}
          trend={stats?.detectionsTrend}
          color={NEON_GREEN}
          delay={0.08}
        />
        <StatsCard
          title="Pending Reports"
          value={stats?.pendingReports ?? 0}
          icon={<Clock size={20} />}
          trend={stats?.pendingTrend}
          color="#ffaa00"
          delay={0.16}
        />
        <StatsCard
          title="Success Rate"
          value={`${stats?.successRate ?? 0}%`}
          icon={<Activity size={20} />}
          trend={stats?.successRateTrend}
          color="#a855f7"
          delay={0.24}
        />
      </div>

      {/* ---- charts row ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* line chart */}
        <CardShell className="lg:col-span-2" delay={0.15}>
          <SectionTitle>Detection Trends (30 days)</SectionTitle>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1a2744', border: '1px solid #2a3f66', borderRadius: 8 }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="detections"
                  stroke={NEON_CYAN}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: NEON_CYAN }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        {/* donut chart */}
        <CardShell delay={0.2}>
          <SectionTitle>Cases by Status</SectionTitle>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData ?? []}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={3}
                  stroke="none"
                >
                  {(statusData ?? []).map((entry, idx) => (
                    <Cell key={entry.name} fill={entry.color || STATUS_COLORS[idx % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a2744', border: '1px solid #2a3f66', borderRadius: 8 }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value: string) => (
                    <span className="text-gray-300 text-xs">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardShell>
      </div>

      {/* ---- feed + map row ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* live detection feed */}
        <CardShell delay={0.25}>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Live Detection Feed</SectionTitle>
            <span className="flex items-center gap-1.5 text-xs text-[#00f5ff]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#00f5ff] animate-pulse" />
              Real-time
            </span>
          </div>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            <AnimatePresence initial={false}>
              {(feed ?? []).length === 0 && (
                <div className="text-center text-gray-500 py-16 text-sm">
                  No detections yet.
                </div>
              )}
              {(feed ?? []).map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.3 }}
                >
                  <FaceMatchCard
                    personName={item.personName}
                    personPhoto={item.personPhoto}
                    capturedPhoto={item.capturedPhoto}
                    confidence={item.confidence}
                    timestamp={item.timestamp}
                    cameraName={item.cameraName}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardShell>

        {/* hotspot map */}
        <CardShell delay={0.3}>
          <SectionTitle>Detection Hotspots</SectionTitle>
          <div className="h-[420px] rounded-xl overflow-hidden">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {(hotspots ?? []).map((m: HotspotMarker) => (
                <Marker key={m.id} position={[m.lat, m.lng]} icon={hotspotIcon}>
                  <Popup>
                    <span className="font-semibold">{m.label}</span>
                    <br />
                    Detections: {m.count}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardShell>
      </div>
    </div>
  );
};

export default DashboardPage;
