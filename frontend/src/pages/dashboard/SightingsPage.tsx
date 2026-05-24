import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search, Filter, ChevronDown, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Eye, X, MapPin, Clock, User, AlertCircle,
} from 'lucide-react';

import Skeleton from '../../components/common/Skeleton';
import { useSightingStore } from '../../stores/sightingStore';

/* ---------- types ---------- */
interface Sighting {
  id: string;
  personName: string;
  personPhoto: string;
  sightingPhoto: string;
  reporterName: string;
  reporterPhone: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  description: string;
  status: 'pending' | 'verified' | 'rejected';
  aiSimilarity: number;
  caseId: string;
  caseNumber: string;
}

type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected';

/* ---------- constants ---------- */
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';
const NEON_CYAN = '#00f5ff';
const NEON_GREEN = '#00ff88';
const NEON_RED = '#ff3b3b';

const markerIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#ff3b3b"/><circle cx="14" cy="14" r="6" fill="white"/></svg>`,
    ),
  iconSize: [28, 40],
  iconAnchor: [14, 40],
});

/* ========== PAGE ========== */
const SightingsPage: React.FC = () => {
  const {
    sightings, loading, pagination,
    fetchSightings, verifySighting, rejectSighting,
  } = useSightingStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [personSearch, setPersonSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [detailModal, setDetailModal] = useState<Sighting | null>(null);

  useEffect(() => {
    fetchSightings({ page, status: statusFilter, person: personSearch, dateFrom, dateTo });
  }, [page, statusFilter, personSearch, dateFrom, dateTo, fetchSightings]);

  const rows: Sighting[] = useMemo(() => sightings ?? [], [sightings]);
  const pending = useMemo(() => rows.filter((r) => r.status === 'pending'), [rows]);
  const verified = useMemo(() => rows.filter((r) => r.status === 'verified'), [rows]);
  const totalPages = pagination?.totalPages ?? 1;

  const simColor = (v: number) => (v >= 85 ? NEON_GREEN : v >= 70 ? '#ffaa00' : NEON_RED);

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      <h1 className="text-2xl font-bold text-white">Sighting Reports</h1>

      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: rows.length, color: NEON_CYAN },
          { label: 'Pending', value: pending.length, color: '#ffaa00' },
          { label: 'Verified', value: verified.length, color: NEON_GREEN },
          { label: 'Rejected', value: rows.filter((r) => r.status === 'rejected').length, color: NEON_RED },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${CARD_BG} rounded-xl p-3 text-center`}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-gray-500 uppercase">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* filters */}
      <div className={`${CARD_BG} rounded-2xl p-4 space-y-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={personSearch}
              onChange={(e) => { setPersonSearch(e.target.value); setPage(1); }}
              placeholder="Search person..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#00f5ff]/50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => setShowFilters((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-300 hover:text-[#00f5ff] transition-colors"
          >
            <Filter size={14} /> More
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/5">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* pending queue */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Pending Review</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`${CARD_BG} rounded-2xl p-4 space-y-3`}
              >
                {/* images */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-[9px] text-gray-600 mb-1">Missing Person</p>
                    <img src={s.personPhoto} alt="" className="w-full h-28 rounded-xl object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] text-gray-600 mb-1">Sighting</p>
                    <img src={s.sightingPhoto} alt="" className="w-full h-28 rounded-xl object-cover" />
                  </div>
                </div>

                {/* info */}
                <p className="text-white font-medium text-sm">{s.personName}</p>
                <div className="space-y-1 text-xs">
                  <p className="text-gray-400 flex items-center gap-1"><User size={10} /> {s.reporterName}</p>
                  <p className="text-gray-400 flex items-center gap-1"><MapPin size={10} /> {s.location}</p>
                  <p className="text-gray-500 flex items-center gap-1"><Clock size={10} /> {s.timestamp}</p>
                </div>
                <p className="text-gray-500 text-xs line-clamp-2">{s.description}</p>

                {/* AI score */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">AI Similarity:</span>
                  <span className="font-mono text-xs font-bold" style={{ color: simColor(s.aiSimilarity) }}>{s.aiSimilarity}%</span>
                  <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${s.aiSimilarity}%`, backgroundColor: simColor(s.aiSimilarity) }} />
                  </div>
                </div>

                {/* actions */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => verifySighting(s.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#00ff88]/10 text-[#00ff88] text-xs hover:bg-[#00ff88]/20 transition-colors"
                  >
                    <CheckCircle size={12} /> Verify
                  </button>
                  <button
                    onClick={() => rejectSighting(s.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#ff3b3b]/10 text-[#ff3b3b] text-xs hover:bg-[#ff3b3b]/20 transition-colors"
                  >
                    <XCircle size={12} /> Reject
                  </button>
                  <button
                    onClick={() => setDetailModal(s)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-[#00f5ff]"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* all sightings table */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">All Sightings</h2>
        <div className={`${CARD_BG} rounded-2xl overflow-hidden`}>
          {loading && rows.length === 0 ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <MapPin size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No sighting reports found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/5 text-xs uppercase text-gray-500">
                    <th className="p-3">Photos</th>
                    <th className="p-3">Person</th>
                    <th className="p-3">Reporter</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">AI Score</th>
                    <th className="p-3">Case</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="p-3">
                        <div className="flex gap-1">
                          <img src={s.personPhoto} alt="" className="w-8 h-8 rounded object-cover" />
                          <img src={s.sightingPhoto} alt="" className="w-8 h-8 rounded object-cover" />
                        </div>
                      </td>
                      <td className="p-3 text-white font-medium">{s.personName}</td>
                      <td className="p-3 text-gray-400">{s.reporterName}</td>
                      <td className="p-3 text-gray-400 text-xs">{s.location}</td>
                      <td className="p-3">
                        <span className="font-mono text-xs font-bold" style={{ color: simColor(s.aiSimilarity) }}>{s.aiSimilarity}%</span>
                      </td>
                      <td className="p-3 text-[#00f5ff] font-mono text-xs">{s.caseNumber}</td>
                      <td className="p-3 text-gray-500 text-xs">{s.timestamp}</td>
                      <td className="p-3">
                        {s.status === 'verified' && <span className="text-[#00ff88] text-xs">Verified</span>}
                        {s.status === 'rejected' && <span className="text-[#ff3b3b] text-xs">Rejected</span>}
                        {s.status === 'pending' && <span className="text-[#ffaa00] text-xs">Pending</span>}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {s.status === 'pending' && (
                            <>
                              <button onClick={() => verifySighting(s.id)} className="p-1 rounded hover:bg-[#00ff88]/10 text-[#00ff88]"><CheckCircle size={14} /></button>
                              <button onClick={() => rejectSighting(s.id)} className="p-1 rounded hover:bg-[#ff3b3b]/10 text-[#ff3b3b]"><XCircle size={14} /></button>
                            </>
                          )}
                          <button onClick={() => setDetailModal(s)} className="p-1 rounded hover:bg-white/5 text-gray-500"><Eye size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
              className={`${CARD_BG} rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Sighting Detail</h2>
                <button onClick={() => setDetailModal(null)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400"><X size={18} /></button>
              </div>

              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 mb-1">Missing Person</p>
                  <img src={detailModal.personPhoto} alt="" className="w-full h-40 rounded-xl object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 mb-1">Sighting Photo</p>
                  <img src={detailModal.sightingPhoto} alt="" className="w-full h-40 rounded-xl object-cover" />
                </div>
              </div>

              {/* AI score */}
              <div className="mb-4 p-3 rounded-xl bg-[#0a1628]/60">
                <p className="text-xs text-gray-400 mb-2">AI Similarity Score</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold font-mono" style={{ color: simColor(detailModal.aiSimilarity) }}>{detailModal.aiSimilarity}%</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${detailModal.aiSimilarity}%`, backgroundColor: simColor(detailModal.aiSimilarity) }} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-gray-500">Person</span><span className="text-white">{detailModal.personName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Reporter</span><span className="text-gray-300">{detailModal.reporterName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="text-gray-300">{detailModal.reporterPhone}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="text-gray-300">{detailModal.location}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Case</span><span className="text-[#00f5ff] font-mono">{detailModal.caseNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="text-gray-300">{detailModal.timestamp}</span></div>
              </div>

              {detailModal.description && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-300">{detailModal.description}</p>
                </div>
              )}

              {/* mini map */}
              <div className="h-40 rounded-xl overflow-hidden mb-4">
                <MapContainer center={[detailModal.lat, detailModal.lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer attribution='&copy; OSM' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <Marker position={[detailModal.lat, detailModal.lng]} icon={markerIcon}>
                    <Popup>{detailModal.location}</Popup>
                  </Marker>
                </MapContainer>
              </div>

              {detailModal.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button
                    onClick={() => { verifySighting(detailModal.id); setDetailModal(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#00ff88]/15 text-[#00ff88] text-sm hover:bg-[#00ff88]/25 transition-colors"
                  >
                    <CheckCircle size={14} /> Verify
                  </button>
                  <button
                    onClick={() => { rejectSighting(detailModal.id); setDetailModal(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#ff3b3b]/15 text-[#ff3b3b] text-sm hover:bg-[#ff3b3b]/25 transition-colors"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SightingsPage;
