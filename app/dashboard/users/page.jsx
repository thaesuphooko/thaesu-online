'use client';
import {
  useState, useEffect, useCallback, useRef, useReducer
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Search, Users, Loader2, Trash2, UserX, Shield,
  RefreshCcw, AlertTriangle, CheckCircle, X,
  FileDown, ArrowUp, ArrowDown, CheckSquare, Square, Eye,
  Info
} from 'lucide-react';

// ════════════════════════════════════════════════════════════
//  GOD MODE ADMIN USERS PAGE – Premium Ultra Max
//  · adminSecret-based fetch (no JWT required)
//  · bulk actions, advanced filters, CSV export
//  · quick view modal, skeleton loading, auto-refresh
// ════════════════════════════════════════════════════════════

const ADMIN_SECRET = 'step';
const LIMIT = 20;

// ─── Reducer for complex state management ─────
const initialState = {
  users: [],
  total: 0,
  loading: true,
  search: '',
  role: 'all',
  verified: 'all',
  sort: 'created_at',
  order: 'desc',
  page: 0,
  selected: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USERS':
      return { ...state, users: action.payload.users, total: action.payload.total, loading: false, selected: [] };
    case 'SET_LOADING':
      return { ...state, loading: true };
    case 'SET_FILTER':
      return { ...state, [action.payload.key]: action.payload.value, page: 0 };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'TOGGLE_SELECT':
      return {
        ...state,
        selected: state.selected.includes(action.payload)
          ? state.selected.filter(id => id !== action.payload)
          : [...state.selected, action.payload],
      };
    case 'SELECT_ALL':
      return { ...state, selected: state.users.map(u => u.id) };
    case 'CLEAR_SELECTION':
      return { ...state, selected: [] };
    default:
      return state;
  }
}

// ─── Custom fetch with admin secret ────────────
async function adminFetch(url, options = {}) {
  const headers = {
    ...options.headers,
    'X-Admin-Secret': ADMIN_SECRET,
    'Content-Type': 'application/json',
  };
  const res = await fetch(url, { ...options, headers });
  return res;
}

// ─── Tooltip ───────────────────────────────────
const Tooltip = ({ children, text }) => (
  <div className="relative group">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-zinc-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
      {text}
    </div>
  </div>
);

// ─── Skeleton Row ─────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-white/5">
    {[...Array(7)].map((_, i) => (
      <td key={i} className="p-4"><div className="h-4 bg-zinc-800 rounded w-3/4" /></td>
    ))}
  </tr>
);

export default function AdminUsersPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [deleteModal, setDeleteModal] = useState(null);
  const [quickViewUser, setQuickViewUser] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const intervalRef = useRef(null);

  // ─── Fetch users ────────────────────────────
  const fetchUsers = useCallback(async () => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const params = new URLSearchParams({
        search: state.search,
        role: state.role === 'all' ? '' : state.role,
        verified: state.verified === 'all' ? '' : state.verified,
        sort: state.sort,
        order: state.order,
        limit: LIMIT.toString(),
        offset: (state.page * LIMIT).toString(),
      });
      const res = await adminFetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      dispatch({ type: 'SET_USERS', payload: { users: data.users, total: data.total } });
    } catch (err) {
      toast.error('Failed to load users');
      dispatch({ type: 'SET_USERS', payload: { users: [], total: 0 } });
    }
  }, [state.search, state.role, state.verified, state.sort, state.order, state.page]);

  useEffect(() => {
    fetchUsers();
    intervalRef.current = setInterval(fetchUsers, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchUsers]);

  // ─── Update single user ─────────────────────
  const updateUser = async (id, field, value) => {
    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ id, [field]: value }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success('User updated');
      fetchUsers();
    } catch {
      toast.error('Update failed');
    }
  };

  // ─── Bulk update role ───────────────────────
  const bulkUpdateRole = async (role) => {
    if (state.selected.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ ids: state.selected, role }),
      });
      if (!res.ok) throw new Error('Bulk update failed');
      toast.success(`Updated ${state.selected.length} users to ${role}`);
      dispatch({ type: 'CLEAR_SELECTION' });
      fetchUsers();
    } catch {
      toast.error('Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // ─── Delete single user ─────────────────────
  const deleteUser = async (id, soft = true) => {
    try {
      const res = await adminFetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ soft }),
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('User deleted');
      setDeleteModal(null);
      fetchUsers();
    } catch {
      toast.error('Delete failed');
    }
  };

  // ─── Bulk delete ────────────────────────────
  const bulkDelete = async () => {
    if (state.selected.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'DELETE',
        body: JSON.stringify({ ids: state.selected }),
      });
      if (!res.ok) throw new Error('Bulk delete failed');
      toast.success(`Deleted ${state.selected.length} users`);
      dispatch({ type: 'CLEAR_SELECTION' });
      fetchUsers();
    } catch {
      toast.error('Bulk delete failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // ─── CSV Export ─────────────────────────────
  const exportCSV = () => {
    try {
      const headers = ['Name', 'Email', 'Role', 'Verified', 'Joined', 'UID'];
      const rows = state.users.map(u => [
        u.full_name, u.email || '', u.role,
        u.is_verified ? 'Yes' : 'No',
        u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
        u.uid,
      ]);
      let csv = headers.join(',') + '\n';
      rows.forEach(r => csv += r.join(',') + '\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      toast.success('CSV exported');
    } catch { toast.error('Export failed'); }
  };

  const totalPages = Math.ceil(state.total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-purple-400" />
            Users
          </h1>
          <p className="text-zinc-400 mt-1">Total {state.total} registered users</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text" placeholder="Search users..."
              value={state.search}
              onChange={e => dispatch({ type: 'SET_FILTER', payload: { key: 'search', value: e.target.value } })}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:border-purple-500 outline-none w-48 md:w-64"
            />
          </div>
          <select value={state.role} onChange={e => dispatch({ type: 'SET_FILTER', payload: { key: 'role', value: e.target.value } })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none">
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="vendor">Vendor</option>
            <option value="admin">Admin</option>
          </select>
          <select value={state.verified} onChange={e => dispatch({ type: 'SET_FILTER', payload: { key: 'verified', value: e.target.value } })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none">
            <option value="all">All Status</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <Tooltip text="Refresh"><button onClick={fetchUsers} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><RefreshCcw className="w-4 h-4 text-zinc-400" /></button></Tooltip>
          <Tooltip text="Export CSV"><button onClick={exportCSV} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><FileDown className="w-4 h-4 text-zinc-400" /></button></Tooltip>
        </div>
      </div>

      {/* Bulk Actions */}
      {state.selected.length > 0 && (
        <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} className="flex items-center gap-3 p-3 bg-purple-600/10 border border-purple-500/30 rounded-2xl">
          <span className="text-sm text-purple-300">{state.selected.length} selected</span>
          <button onClick={() => bulkUpdateRole('user')} disabled={bulkLoading} className="px-3 py-1 bg-white/10 rounded-lg text-xs">Set as User</button>
          <button onClick={() => bulkUpdateRole('vendor')} disabled={bulkLoading} className="px-3 py-1 bg-white/10 rounded-lg text-xs">Set as Vendor</button>
          <button onClick={() => bulkUpdateRole('admin')} disabled={bulkLoading} className="px-3 py-1 bg-white/10 rounded-lg text-xs">Set as Admin</button>
          <button onClick={bulkDelete} disabled={bulkLoading} className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-xs">Delete</button>
        </motion.div>
      )}

      {/* Table */}
      {state.loading ? (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
          <table className="w-full"><thead><tr><th className="p-4" colSpan={7} /></tr></thead><tbody>{[...Array(5)].map((_,i)=><SkeletonRow key={i} />)}</tbody></table>
        </div>
      ) : state.users.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">No users found</div>
      ) : (
        <motion.div layout className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-black/80 backdrop-blur-md z-10">
                <tr className="border-b border-white/10 text-left">
                  <th className="p-4 w-10">
                    <button onClick={() => state.selected.length === state.users.length ? dispatch({ type: 'CLEAR_SELECTION' }) : dispatch({ type: 'SELECT_ALL' })} className="p-1 rounded hover:bg-white/10">
                      {state.selected.length === state.users.length ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4 text-zinc-500" />}
                    </button>
                  </th>
                  <th className="p-4 text-xs font-medium text-zinc-400 uppercase">User</th>
                  <th className="p-4 text-xs font-medium text-zinc-400 uppercase">Email</th>
                  <th className="p-4 text-xs font-medium text-zinc-400 uppercase">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => dispatch({ type: 'SET_FILTER', payload: { key: 'sort', value: state.sort === 'role' && state.order === 'asc' ? '' : 'role' } })}>
                      Role {state.sort === 'role' ? (state.order==='asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : null}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-medium text-zinc-400 uppercase">Status</th>
                  <th className="p-4 text-xs font-medium text-zinc-400 uppercase">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => dispatch({ type: 'SET_FILTER', payload: { key: 'sort', value: state.sort === 'created_at' && state.order === 'asc' ? '' : 'created_at' } })}>
                      Joined {state.sort === 'created_at' ? (state.order==='asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : null}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-medium text-zinc-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.users.map(user => (
                  <motion.tr key={user.id} initial={{ opacity:0 }} animate={{ opacity:1 }} className={`border-b border-white/5 hover:bg-white/5 transition ${state.selected.includes(user.id) ? 'bg-purple-500/10' : ''}`}>
                    <td className="p-4">
                      <button onClick={() => dispatch({ type: 'TOGGLE_SELECT', payload: user.id })} className="p-1 rounded hover:bg-white/10">
                        {state.selected.includes(user.id) ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4 text-zinc-500" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? <img src={user.avatar_url} className="w-10 h-10 object-cover" /> : <UserX className="w-5 h-5 text-purple-400" />}
                        </div>
                        <div>
                          <Link href={`/dashboard/users/${user.id}`} className="font-medium text-white hover:text-purple-400">{user.full_name}</Link>
                          <p className="text-xs text-zinc-500">{user.uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-300">{user.email || 'N/A'}</td>
                    <td className="p-4">
                      <div className="relative inline-block">
                        <button
                          onClick={() => {
                            const next = user.role === 'user' ? 'vendor' : user.role === 'vendor' ? 'admin' : 'user';
                            updateUser(user.id, 'role', next);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 transition ${
                            user.role === 'admin' ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' :
                            user.role === 'vendor' ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' :
                            'bg-zinc-500/20 border-zinc-500/30 text-zinc-400'
                          }`}
                        >
                          {user.role}
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <button onClick={() => updateUser(user.id, 'is_verified', !user.is_verified)} className={`flex items-center gap-1 text-xs font-medium ${user.is_verified ? 'text-green-400' : 'text-red-400'}`}>
                        {user.is_verified ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {user.is_verified ? 'Verified' : 'Unverified'}
                      </button>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Tooltip text="Quick View"><button onClick={() => setQuickViewUser(user)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><Eye className="w-4 h-4 text-zinc-400" /></button></Tooltip>
                        <Tooltip text="Edit"><Link href={`/dashboard/users/${user.id}`} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><Info className="w-4 h-4 text-zinc-400" /></Link></Tooltip>
                        <Tooltip text="Delete"><button onClick={() => setDeleteModal({ id: user.id, email: user.email })} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20"><Trash2 className="w-4 h-4 text-red-400" /></button></Tooltip>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 flex items-center justify-between border-t border-white/10">
              <button onClick={() => dispatch({ type: 'SET_PAGE', payload: Math.max(0, state.page-1) })} disabled={state.page===0} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-30 text-sm">Previous</button>
              <span className="text-sm text-zinc-400">Page {state.page+1} of {totalPages}</span>
              <button onClick={() => dispatch({ type: 'SET_PAGE', payload: Math.min(totalPages-1, state.page+1) })} disabled={state.page>=totalPages-1} className="px-4 py-2 bg-white/5 rounded-xl disabled:opacity-30 text-sm">Next</button>
            </div>
          )}
        </motion.div>
      )}

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteModal(null)}>
            <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }} className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-400" /></div><div><h3 className="text-lg font-bold text-white">Delete User?</h3><p className="text-sm text-zinc-400">{deleteModal.email || 'Selected user'} will be removed.</p></div></div>
              <div className="flex gap-3 justify-end mb-4">
                <button onClick={() => deleteUser(deleteModal.id, true)} className="px-4 py-2 bg-yellow-600/20 text-yellow-400 rounded-xl text-sm">Soft Delete</button>
                <button onClick={() => deleteUser(deleteModal.id, false)} className="px-4 py-2 bg-red-600 rounded-xl text-sm text-white">Hard Delete</button>
              </div>
              <button onClick={() => setDeleteModal(null)} className="w-full px-4 py-2 bg-white/5 rounded-xl text-sm">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick View Modal */}
      <AnimatePresence>
        {quickViewUser && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setQuickViewUser(null)}>
            <motion.div initial={{ scale:0.95 }} animate={{ scale:1 }} exit={{ scale:0.95 }} className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-md w-full mx-4 text-white" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold">{quickViewUser.full_name}</h2><button onClick={() => setQuickViewUser(null)}><X className="w-5 h-5" /></button></div>
              <div className="space-y-3 text-sm">
                <p><span className="text-zinc-400">Email:</span> {quickViewUser.email || 'N/A'}</p>
                <p><span className="text-zinc-400">Phone:</span> {quickViewUser.phone || 'N/A'}</p>
                <p><span className="text-zinc-400">UID:</span> {quickViewUser.uid}</p>
                <p><span className="text-zinc-400">Role:</span> {quickViewUser.role}</p>
                <p><span className="text-zinc-400">Verified:</span> {quickViewUser.is_verified ? 'Yes' : 'No'}</p>
                <p><span className="text-zinc-400">Joined:</span> {quickViewUser.created_at ? new Date(quickViewUser.created_at).toLocaleDateString() : 'N/A'}</p>
                {quickViewUser.referral_code && <p><span className="text-zinc-400">Referral:</span> {quickViewUser.referral_code}</p>}
              </div>
              <Link href={`/dashboard/users/${quickViewUser.id}`} className="mt-4 inline-block px-4 py-2 bg-purple-600 rounded-xl text-sm text-white">Edit User</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
