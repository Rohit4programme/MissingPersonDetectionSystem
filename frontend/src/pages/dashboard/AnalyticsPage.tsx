import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Calendar, TrendingUp, BarChart3, Gauge, Clock, Flame, Camera, Brain,
} from 'lucide-react';

import Skeleton from '../../components/common/Skeleton';
import { useAnalyticsStore } from '../../stores/analyticsStore';

/* ---------- types ---------- */
interface DetectionTrend {
  date: string;
  detections: number;
  verified: number;
  sightings: number;
}

interface RegionData {
  region: string;
  cases: number;
}

interface SuccessGauge {
  name: string;
  value: number;
  fill: string;
}

interface ResponseTime {
  metric: string;
  avgMinutes: number;
  target: number;
}

interface TopCamera {
  name: string;
  detections: number;
}

interface ConfidenceDist {
  range: string;
  count: number;
}

/* ---------- constants ---------- */
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';
const NEON_CYAN = '#00f5ff';
const NEON_GREEN = '#00ff88';
const NEON_RED = '#ff3b3b';
const COLORS = ['#00f5ff', '#00ff88', '#ff3b3b', '#ffaa00', '#a855f7', '#ec4899'];

const inputCls = 'px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none focus:border-[#00f5ff]/50 transition-colors';

/* ---------- sub-components ---------- */
const CardShell: React.FC<{ children: React.ReactNode; className?: string; delay?: number; title?: string }> = ({
  children, className = '', delay = 0, title,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    className={`${CARD_BG} rounded-2xl p-5 ${className}`}
  >
    {title && <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">{title}</h3>}
    {children}
  </motion.div>
);

const tooltipStyle = {
  contentStyle: { background: '#1a2744', border: '1px solid #2a3f66', borderRadius: 8 },
  labelStyle: { color: '#e5e7eb' },
};

/* ========== PAGE ========== */
const AnalyticsPage: React.FC = () => {
  const {
    loading,
    detectionTrends, regionData, successGauge, responseTimes,
    topCameras, confidenceDist, heatmapData,
    fetchAnalytics,
  } = useAnalyticsStore();

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchAnalytics({ dateFrom, dateTo });
  }, [dateFrom, dateTo, fetchAnalytics]);

  const gaugeData: SuccessGauge[] = useMemo(
    () => successGauge ?? [{ name: 'Rate', value: 0, fill: NEON_CYAN }],
    [successGauge],
  );

  if (loading && !detectionTrends) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-500" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
          <span className="text-gray-600">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* row 1: detection trends (wide) + success gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <CardShell className="lg:col-span-3" delay={0.05} title="Detection Trends">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detectionTrends ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip {...tooltipStyle} />
                <Legend verticalAlign="top" iconType="circle" formatter={(v: string) => <span className="text-gray-300 text-xs">{v}</span>} />
                <Line type="monotone" dataKey="detections" stroke={NEON_CYAN} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="verified" stroke={NEON_GREEN} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sightings" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell delay={0.1} title="Success Rate">
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                barSize={14}
                data={gaugeData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: '#0a1628' }}
                />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white text-3xl font-bold">
                  {gaugeData[0]?.value ?? 0}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>
      </div>

      {/* row 2: region bar chart + confidence histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardShell delay={0.15} title="Cases by Region">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis dataKey="region" type="category" tick={{ fill: '#9ca3af', fontSize: 10 }} width={80} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="cases" radius={[0, 4, 4, 0]}>
                  {(regionData ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        <CardShell delay={0.2} title="AI Confidence Distribution">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceDist ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="range" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(confidenceDist ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>
      </div>

      {/* row 3: response times + top cameras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardShell delay={0.25} title="Response Time Metrics">
          <div className="space-y-4">
            {(responseTimes ?? []).map((rt) => {
              const pct = Math.min(100, (rt.avgMinutes / rt.target) * 100);
              const ok = rt.avgMinutes <= rt.target;
              return (
                <div key={rt.metric}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{rt.metric}</span>
                    <span className="text-xs font-mono" style={{ color: ok ? NEON_GREEN : NEON_RED }}>
                      {rt.avgMinutes}min / {rt.target}min
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, pct)}%`, backgroundColor: ok ? NEON_GREEN : NEON_RED }}
                    />
                  </div>
                </div>
              );
            })}
            {(!responseTimes || responseTimes.length === 0) && (
              <p className="text-center text-gray-600 text-sm py-8">No response time data.</p>
            )}
          </div>
        </CardShell>

        <CardShell delay={0.3} title="Top Cameras by Detection Count">
          <div className="space-y-3">
            {(topCameras ?? []).map((cam, idx) => {
              const maxVal = topCameras?.[0]?.detections ?? 1;
              return (
                <div key={cam.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-4">{idx + 1}</span>
                  <Camera size={14} className="text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{cam.name}</p>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(cam.detections / maxVal) * 100}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-gray-400 w-12 text-right">{cam.detections}</span>
                </div>
              );
            })}
            {(!topCameras || topCameras.length === 0) && (
              <p className="text-center text-gray-600 text-sm py-8">No camera data.</p>
            )}
          </div>
        </CardShell>
      </div>

      {/* row 4: heatmap */}
      <CardShell delay={0.35} title="Detection & Sighting Heatmap">
        <div className="h-80 rounded-xl overflow-hidden">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {/* Heatmap layer would be added here with react-leaflet-heatmap-layer */}
            {/* For now, markers from heatmapData could be rendered */}
          </MapContainer>
        </div>
        <p className="text-[10px] text-gray-600 mt-2">Showing detection and sighting density across regions.</p>
      </CardShell>
    </div>
  );
};

export default AnalyticsPage;
