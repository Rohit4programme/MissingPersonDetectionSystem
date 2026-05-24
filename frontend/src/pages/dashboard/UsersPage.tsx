import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, ChevronDown, ChevronLeft, ChevronRight,
  Edit, Trash2, UserCheck, UserX, MoreVertical, X, Shield,
  Eye, Mail, Phone, Building,
} from 'lucide-react';

import Skeleton from '../../components/common/Skeleton';
import { useUserStore } from '../../stores/userStore';

/* ---------- types ---------- */
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'officer' | 'analyst' | 'viewer';
  department: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  phone: string;
  badge: string;
  avatar: string;
  createdAt: string;
}

interface NewUserForm {
  name: string;
  email: string;
  phone: string;
  role: User['role'];
  department: string;
  badge: string;
}

type RoleFilter = 'all' | User['role'];
type StatusFilter = 'all' | User['status'];

/* ---------- constants ---------- */
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';
const NEON_CYAN = '#00f5ff';
const NEON_GREEN = '#00ff88';
const NEON_RED = '#ff3b3b';

const ROLE_CONFIG: Record<User['role'], { color: string; bg: string }> = {
  admin: { color: '#ff3b3b', bg: 'bg-[#ff3b3b]/10' },
  officer: { color: '#00f5ff', bg: 'bg-[#00f5ff]/10' },
  analyst: { color: '#a855f7', bg: 'bg-[#a855f7]/10' },
  viewer: { color: '#ffaa00', bg: 'bg-[#ffaa00]/10' },
};

const STATUS_CONFIG: Record<User['status'], { color: string; bg: string; label: string }> = {
  active: { color: '#00ff88', bg: 'bg-[#00ff88]/10', label: 'Active' },
  inactive: { color: '#6b7280', bg: 'bg-gray-500/10', label: 'Inactive' },
  suspended: { color: '#ff3b3b', bg: 'bg-[#ff3b3b]/10', label: 'Suspended' },
};

const ROLES: User['role'][] = ['admin', 'officer', 'analyst', 'viewer'];

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#00f5ff]/50 transition-colors';

/* ========== PAGE ========== */
const UsersPage: React.FC = () => {
  const {
    users, loading, pagination,
    fetchUsers, createUser, updateUser, deleteUser, toggleUserStatus,
  } = useUserStore();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<NewUserForm>({
    name: '', email: '', phone: '', role: 'officer', department: '', badge: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUsers({ page, search, role: roleFilter, status: statusFilter });
  }, [page, search, roleFilter, statusFilter, fetchUsers]);

  const rows: User[] = useMemo(() => users ?? [], [users]);
  const totalPages = pagination?.totalPages ?? 1;

  /* validation */
  const validate = (form: NewUserForm): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.department.trim()) errs.department = 'Department is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAdd = useCallback(async () => {
    if (!validate(newUser)) return;
    setSaving(true);
    try {
      await createUser(newUser);
      setShowAddModal(false);
      setNewUser({ name: '', email: '', phone: '', role: 'officer', department: '', badge: '' });
      setErrors({});
    } finally {
      setSaving(false);
    }
  }, [newUser, createUser]);

  const handleEdit = useCallback(async () => {
    if (!editUser) return;
    const form = editUser;
    if (!validate(form)) return;
    setSaving(true);
    try {
      await updateUser(editUser.id, form);
      setEditUser(null);
      setErrors({});
    } finally {
      setSaving(false);
    }
  }, [editUser, updateUser]);

  const UserForm: React.FC<{
    form: NewUserForm;
    onChange: (k: keyof NewUserForm, v: string) => void;
    title: string;
    onSave: () => void;
    onClose: () => void;
  }> = ({ form, onChange, title, onSave, onClose }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`${CARD_BG} rounded-2xl p-6 max-w-md w-full`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-gray-400"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
            <input value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Full name" className={inputCls} />
            {errors.name && <p className="text-[10px] text-[#ff3b3b] mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => onChange('email', e.target.value)} placeholder="email@example.com" className={inputCls} />
            {errors.email && <p className="text-[10px] text-[#ff3b3b] mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => onChange('phone', e.target.value)} placeholder="Phone number" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Role</label>
            <select value={form.role} onChange={(e) => onChange('role', e.target.value)} className={inputCls}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Department *</label>
            <input value={form.department} onChange={(e) => onChange('department', e.target.value)} placeholder="Department" className={inputCls} />
            {errors.department && <p className="text-[10px] text-[#ff3b3b] mt-1">{errors.department}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Badge Number</label>
            <input value={form.badge} onChange={(e) => onChange('badge', e.target.value)} placeholder="Badge #" className={inputCls} />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-[#00f5ff]/15 border border-[#00f5ff]/30 text-sm text-[#00f5ff] hover:bg-[#00f5ff]/25 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving...' : title.includes('Add') ? 'Add User' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#00f5ff]/15 text-[#00f5ff] border border-[#00f5ff]/30 hover:bg-[#00f5ff]/25 transition-colors"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* filters */}
      <div className={`${CARD_BG} rounded-2xl p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search users..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#00f5ff]/50"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as RoleFilter); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none"
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* table */}
      <div className={`${CARD_BG} rounded-2xl overflow-hidden`}>
        {loading && rows.length === 0 ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Shield size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No users found.</p>
            <button onClick={() => setShowAddModal(true)} className="mt-3 text-sm text-[#00f5ff] hover:underline">Add a user</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase text-gray-500">
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Login</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u, idx) => {
                  const rc = ROLE_CONFIG[u.role];
                  const sc = STATUS_CONFIG[u.status];
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/10" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-[#00f5ff]/10 flex items-center justify-center text-[#00f5ff] text-xs font-bold">
                              {u.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{u.name}</p>
                            {u.badge && <p className="text-[10px] text-gray-600">Badge: {u.badge}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-400">{u.email}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${rc.bg}`} style={{ color: rc.color }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400">{u.department}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${sc.bg}`} style={{ color: sc.color }}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{u.lastLogin}</td>
                      <td className="p-3 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenu === u.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute right-0 mt-1 w-44 rounded-xl bg-[#1a2744] border border-white/10 shadow-xl z-20 overflow-hidden"
                            >
                              <button
                                onClick={() => { setEditUser(u); setOpenMenu(null); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
                              >
                                <Edit size={13} /> Edit User
                              </button>
                              <button
                                onClick={() => { toggleUserStatus(u.id); setOpenMenu(null); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
                              >
                                {u.status === 'active' ? <><UserX size={13} /> Deactivate</> : <><UserCheck size={13} /> Activate</>}
                              </button>
                              <button
                                onClick={() => { deleteUser(u.id); setOpenMenu(null); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#ff3b3b] hover:bg-[#ff3b3b]/10"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </motion.div>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-gray-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* add user modal */}
      <AnimatePresence>
        {showAddModal && (
          <UserForm
            form={newUser}
            onChange={(k, v) => setNewUser((p) => ({ ...p, [k]: v }))}
            title="Add New User"
            onSave={handleAdd}
            onClose={() => { setShowAddModal(false); setErrors({}); }}
          />
        )}
      </AnimatePresence>

      {/* edit user modal */}
      <AnimatePresence>
        {editUser && (
          <UserForm
            form={editUser}
            onChange={(k, v) => setEditUser((p) => p ? ({ ...p, [k]: v }) : null)}
            title="Edit User"
            onSave={handleEdit}
            onClose={() => { setEditUser(null); setErrors({}); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersPage;
