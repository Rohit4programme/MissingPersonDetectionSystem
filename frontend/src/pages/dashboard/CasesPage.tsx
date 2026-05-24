import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Plus, Download, UserCheck, ChevronDown,
  ChevronLeft, ChevronRight, MoreVertical, Eye, Edit, Trash2,
} from 'lucide-react';

import Skeleton from '../../components/common/Skeleton';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import { useCaseStore } from '../../stores/caseStore';

/* ---------- types ---------- */
interface CaseRow {
  id: string;
  caseNumber: string;
  photo: string;
  name: string;
  age: number;
  status: 'active' | 'resolved' | 'pending' | 'closed';
  priority: 'high' | 'medium' | 'low';
  lastSeen: string;
  lastSeenLocation: string;
  assignedOfficer: string;
}

type StatusFilter = 'all' | CaseRow['status'];
type PriorityFilter = 'all' | CaseRow['priority'];

/* ---------- constants ---------- */
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';

/* ========== PAGE ========== */
const CasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { cases, loading, pagination, fetchCases, deleteCases, exportCases } = useCaseStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [officerFilter, setOfficerFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchCases({
      page,
      status: statusFilter,
      priority: priorityFilter,
      dateFrom,
      dateTo,
      officer: officerFilter,
      search,
    });
  }, [page, statusFilter, priorityFilter, dateFrom, dateTo, officerFilter, search, fetchCases]);

  const rows: CaseRow[] = useMemo(() => cases ?? [], [cases]);

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

  const handleExport = useCallback(() => exportCases([...selected]), [exportCases, selected]);
  const handleBulkAssign = useCallback(() => {
    /* open assign modal */
  }, [selected]);

  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Case Management</h1>
        <button
          onClick={() => navigate('/dashboard/cases/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#00f5ff]/15 text-[#00f5ff] border border-[#00f5ff]/30 hover:bg-[#00f5ff]/25 transition-colors"
        >
          <Plus size={16} /> New Case
        </button>
      </div>

      {/* search + filters */}
      <div className={`${CARD_BG} rounded-2xl p-4 space-y-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, case #..."
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
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 ml-auto"
            >
              <span className="text-xs text-gray-400">{selected.size} selected</span>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a1628] border border-white/10 text-xs text-gray-300 hover:text-[#00f5ff]"
              >
                <Download size={12} /> Export
              </button>
              <button
                onClick={handleBulkAssign}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a1628] border border-white/10 text-xs text-gray-300 hover:text-[#00ff88]"
              >
                <UserCheck size={12} /> Assign
              </button>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-white/5">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => { setPriorityFilter(e.target.value as PriorityFilter); setPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Assigned Officer</label>
                  <input
                    value={officerFilter}
                    onChange={(e) => { setOfficerFilter(e.target.value); setPage(1); }}
                    placeholder="Officer name..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* table */}
      <div className={`${CARD_BG} rounded-2xl overflow-hidden`}>
        {loading && rows.length === 0 ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Search size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No cases found.</p>
            <button
              onClick={() => navigate('/dashboard/cases/new')}
              className="mt-4 text-sm text-[#00f5ff] hover:underline"
            >
              Create a new case
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase text-gray-500">
                  <th className="p-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[#00f5ff]" />
                  </th>
                  <th className="p-3">Case #</th>
                  <th className="p-3">Photo</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Age</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Last Seen</th>
                  <th className="p-3">Assigned Officer</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {rows.map((c, idx) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      onClick={() => navigate(`/dashboard/cases/${c.id}`)}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleOne(c.id)}
                          className="accent-[#00f5ff]"
                        />
                      </td>
                      <td className="p-3 font-mono text-[#00f5ff]">{c.caseNumber}</td>
                      <td className="p-3">
                        <img src={c.photo} alt={c.name} className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/10" />
                      </td>
                      <td className="p-3 text-white font-medium">{c.name}</td>
                      <td className="p-3 text-gray-400">{c.age}</td>
                      <td className="p-3"><StatusBadge status={c.status} /></td>
                      <td className="p-3"><PriorityBadge priority={c.priority} /></td>
                      <td className="p-3 text-gray-400 whitespace-nowrap">
                        {c.lastSeen}
                        <span className="block text-[10px] text-gray-600">{c.lastSeenLocation}</span>
                      </td>
                      <td className="p-3 text-gray-400">{c.assignedOfficer}</td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <button
                            onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenu === c.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute right-0 mt-1 w-36 rounded-xl bg-[#1a2744] border border-white/10 shadow-xl z-20 overflow-hidden"
                            >
                              <button
                                onClick={() => navigate(`/dashboard/cases/${c.id}`)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
                              >
                                <Eye size={13} /> View
                              </button>
                              <button
                                onClick={() => navigate(`/dashboard/cases/${c.id}/edit`)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
                              >
                                <Edit size={13} /> Edit
                              </button>
                              <button
                                onClick={() => deleteCases([c.id])}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#ff3b3b] hover:bg-[#ff3b3b]/10"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </motion.div>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-gray-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CasesPage;
