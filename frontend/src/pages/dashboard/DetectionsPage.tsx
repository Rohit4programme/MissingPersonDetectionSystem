import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Grid, List, ChevronDown, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Eye, X, Download, CheckSquare, XSquare,
} from 'lucide-react';

import FaceMatchCard from '../../components/common/FaceMatchCard';
import Skeleton from '../../components/common/Skeleton';
import { useDetectionStore } from '../../stores/detectionStore';

/* ---------- types ---------- */
interface Detection {
  id: string;
  personName: string;
  personPhoto: string;
  capturedPhoto: string;
  confidence: number;
  cameraName: string;
  cameraId: string;
  location: string;
  timestamp: string;
  verified: boolean | null;
  source: string;
  caseId: string;
  caseNumber: string;
}

type ViewMode = 'grid' | 'list';
type VerifiedFilter = 'all' | 'pending' | 'verified' | 'rejected';

/* ---------- constants ---------- */
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';
const NEON_CYAN = '#00f5ff';
const NEON_GREEN = '#00ff88';
const NEON_RED = '#ff3b3b';

/* ========== PAGE ========== */
const DetectionsPage: React.FC = () => {
  const {
    detections, loading, pagination,
    fetchDetections, verifyDetection, rejectDetection, bulkVerify, bulkReject,
  } = useDetectionStore();

  /* filters */
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [confidenceMin, setConfidenceMin] = useState(0);
  const [confidenceMax, setConfidenceMax] = useState(100);
  const [sourceFilter, setSourceFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>('all');
  const [cameraFilter, setCameraFilter] = useState('');
  const [personSearch, setPersonSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  /* view + selection */
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [detailModal, setDetailModal] = useState<Detection | null>(null);

  /* fetch */
  useEffect(() => {
    fetchDetections({
      page,
      dateFrom,
      dateTo,
      confidenceMin,
      confidenceMax,
      source: sourceFilter,
      verified: verifiedFilter,
      camera: cameraFilter,
      person: personSearch,
    });
  }, [page, dateFrom, dateTo, confidenceMin, confidenceMax, sourceFilter, verifiedFilter, cameraFilter, personSearch, fetchDetections]);

  const rows: Detection[] = useMemo(() => detections ?? [], [detections]);

  /* selection */
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) return setSelected(new Set());
    setSelected(new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* bulk actions */
  const handleBulkVerify = useCallback(() => bulkVerify([...selected]).then(() => setSelected(new Set())), [bulkVerify, selected]);
  const handleBulkReject = useCallback(() => bulkReject([...selected]).then(() => setSelected(new Set())), [bulkReject, selected]);

  const totalPages = pagination?.totalPages ?? 1;

  /* confidence color */
  const confColor = (c: number) => (c >= 85 ? NEON_GREEN : c >= 70 ? '#ffaa00' : NEON_RED);

  /* ---------- render ---------- */
  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Detection Management</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#00f5ff]/15 text-[#00f5ff]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#00f5ff]/15 text-[#00f5ff]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <List size={16} />
          </button>
        </div>
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
          <button
            onClick={() => setShowFilters((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-300 hover:text-[#00f5ff] transition-colors"
          >
            <Filter size={14} /> Filters
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {selected.size > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-400">{selected.size} selected</span>
              <button onClick={handleBulkVerify} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a1628] border border-white/10 text-xs text-[#00ff88] hover:bg-[#00ff88]/10">
                <CheckSquare size={12} /> Verify
              </button>
              <button onClick={handleBulkReject} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a1628] border border-white/10 text-xs text-[#ff3b3b] hover:bg-[#ff3b3b]/10">
                <XSquare size={12} /> Reject
              </button>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-3 border-t border-white/5">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Confidence</label>
                  <input type="number" min={0} max={100} value={confidenceMin} onChange={(e) => { setConfidenceMin(+e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Confidence</label>
                  <input type="number" min={0} max={100} value={confidenceMax} onChange={(e) => { setConfidenceMax(+e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Source</label>
                  <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none">
                    <option value="">All</option>
                    <option value="cctv">CCTV</option>
                    <option value="upload">Upload</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select value={verifiedFilter} onChange={(e) => { setVerifiedFilter(e.target.value as VerifiedFilter); setPage(1); }} className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none">
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* content */}
      {loading && rows.length === 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-64 rounded-2xl' : 'h-20 rounded-xl'} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Eye size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No detections found.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* grid view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((d, idx) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`${CARD_BG} rounded-2xl p-4 relative group`}
            >
              {/* selection checkbox */}
              <input
                type="checkbox"
                checked={selected.has(d.id)}
                onChange={() => toggleOne(d.id)}
                className="absolute top-3 left-3 accent-[#00f5ff] z-10"
              />

              {/* images */}
              <div className="flex gap-3 mb-3">
                <div className="relative flex-1">
                  <img src={d.personPhoto} alt="Reference" className="w-full h-32 rounded-xl object-cover" />
                  <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-gray-300">Reference</span>
                </div>
                <div className="relative flex-1">
                  <img src={d.capturedPhoto} alt="Captured" className="w-full h-32 rounded-xl object-cover" />
                  <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-gray-300">Captured</span>
                </div>
              </div>

              {/* info */}
              <p className="text-white font-medium text-sm">{d.personName}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">{d.cameraName}</span>
                <span className="font-mono text-xs font-bold" style={{ color: confColor(d.confidence) }}>
                  {d.confidence}%
                </span>
              </div>
              <p className="text-[10px] text-gray-600 mt-0.5">{d.timestamp}</p>

              {/* actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                {d.verified === null ? (
                  <>
                    <button
                      onClick={() => verifyDetection(d.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#00ff88]/10 text-[#00ff88] text-xs hover:bg-[#00ff88]/20 transition-colors"
                    >
                      <CheckCircle size={12} /> Verify
                    </button>
                    <button
                      onClick={() => rejectDetection(d.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#ff3b3b]/10 text-[#ff3b3b] text-xs hover:bg-[#ff3b3b]/20 transition-colors"
                    >
                      <XCircle size={12} /> Reject
                    </button>
                  </>
                ) : (
                  <span className={`text-xs ${d.verified ? 'text-[#00ff88]' : 'text-[#ff3b3b]'}`}>
                    {d.verified ? 'Verified' : 'Rejected'}
                  </span>
                )}
                <button
                  onClick={() => setDetailModal(d)}
                  className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-[#00f5ff]"
                >
                  <Eye size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* list view */
        <div className={`${CARD_BG} rounded-2xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase text-gray-500">
                  <th className="p-3 w-10"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[#00f5ff]" /></th>
                  <th className="p-3">Photos</th>
                  <th className="p-3">Person</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Camera</th>
                  <th className="p-3">Case</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="p-3"><input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleOne(d.id)} className="accent-[#00f5ff]" /></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <img src={d.personPhoto} alt="" className="w-8 h-8 rounded object-cover" />
                        <img src={d.capturedPhoto} alt="" className="w-8 h-8 rounded object-cover" />
                      </div>
                    </td>
                    <td className="p-3 text-white font-medium">{d.personName}</td>
                    <td className="p-3 font-mono font-bold" style={{ color: confColor(d.confidence) }}>{d.confidence}%</td>
                    <td className="p-3 text-gray-400">{d.cameraName}</td>
                    <td className="p-3 text-[#00f5ff] font-mono text-xs">{d.caseNumber}</td>
                    <td className="p-3 text-gray-500 text-xs">{d.timestamp}</td>
                    <td className="p-3">
                      {d.verified === true && <span className="text-[#00ff88] text-xs">Verified</span>}
                      {d.verified === false && <span className="text-[#ff3b3b] text-xs">Rejected</span>}
                      {d.verified === null && <span className="text-gray-500 text-xs">Pending</span>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {d.verified === null && (
                          <>
                            <button onClick={() => verifyDetection(d.id)} className="p-1 rounded hover:bg-[#00ff88]/10 text-[#00ff88]"><CheckCircle size={14} /></button>
                            <button onClick={() => rejectDetection(d.id)} className="p-1 rounded hover:bg-[#ff3b3b]/10 text-[#ff3b3b]"><XCircle size={14} /></button>
                          </>
                        )}
                        <button onClick={() => setDetailModal(d)} className="p-1 rounded hover:bg-white/5 text-gray-500"><Eye size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              className={`${CARD_BG} rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Detection Detail</h2>
                <button onClick={() => setDetailModal(null)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400"><X size={18} /></button>
              </div>
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 mb-1">Reference</p>
                  <img src={detailModal.personPhoto} alt="" className="w-full h-40 rounded-xl object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 mb-1">Captured</p>
                  <img src={detailModal.capturedPhoto} alt="" className="w-full h-40 rounded-xl object-cover" />
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Person</span><span className="text-white">{detailModal.personName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Confidence</span><span className="font-mono font-bold" style={{ color: confColor(detailModal.confidence) }}>{detailModal.confidence}%</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Camera</span><span className="text-gray-300">{detailModal.cameraName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="text-gray-300">{detailModal.location}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Case</span><span className="text-[#00f5ff] font-mono">{detailModal.caseNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="text-gray-300">{detailModal.timestamp}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="text-gray-300 capitalize">{detailModal.source}</span></div>
              </div>
              {detailModal.verified === null && (
                <div className="flex gap-3 mt-5 pt-4 border-t border-white/5">
                  <button
                    onClick={() => { verifyDetection(detailModal.id); setDetailModal(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#00ff88]/15 text-[#00ff88] text-sm hover:bg-[#00ff88]/25 transition-colors"
                  >
                    <CheckCircle size={14} /> Verify
                  </button>
                  <button
                    onClick={() => { rejectDetection(detailModal.id); setDetailModal(null); }}
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

export default DetectionsPage;
