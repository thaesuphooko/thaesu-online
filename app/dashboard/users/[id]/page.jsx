'use client';
import {
  useState, useEffect, useCallback, useReducer, useRef
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, User, Loader2, Save, Mail, Phone, Shield, CheckCircle, AlertTriangle,
  Activity, Calendar, Hash, ExternalLink, ShoppingCart, DollarSign,
  Trash2, Clock
} from 'lucide-react';

// ════════════════════════════════════════════════════════════
//  GOD MODE ADMIN USER EDIT PAGE – Premium Ultra Max
//  · adminSecret header for authentication
//  · full CRUD, stats, activity logs, danger zone
//  · glassmorphism, smooth animations
// ════════════════════════════════════════════════════════════

const ADMIN_SECRET = 'step';

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

// ─── Skeleton ───────────────────────────────────
const EditPageSkeleton = () => (
  <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-zinc-800" />
      <div className="h-8 bg-zinc-800 rounded w-1/3" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="w-24 h-24 rounded-full bg-zinc-800 mx-auto" />
        <div className="h-6 bg-zinc-800 rounded w-3/4 mx-auto" />
        <div className="h-4 bg-zinc-800 rounded w-1/2 mx-auto" />
        <div className="space-y-2 mt-6">
          <div className="h-4 bg-zinc-800 rounded w-full" />
          <div className="h-4 bg-zinc-800 rounded w-full" />
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
        </div>
      </div>
      <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="h-6 bg-zinc-800 rounded w-1/4" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i}><div className="h-4 bg-zinc-800 rounded w-1/3 mb-2" /><div className="h-10 bg-zinc-800 rounded" /></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default function AdminUserEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total_orders: 0, total_spent: '0.00' });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('soft');

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', bio: '', website: '',
    avatar_url: '', cover_url: '', role: '', is_verified: false,
  });

  // Fetch single user + stats
  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch(`/api/admin/users/${id}`);
        if (!res.ok) throw new Error('Failed to load user');
        const data = await res.json();
        const u = data.user;
        setUser(u);
        if (u.stats) setStats(u.stats);
        setForm({
          full_name: u.full_name || '',
          email: u.email || '',
          phone: u.phone || '',
          bio: u.bio || '',
          website: u.website || '',
          avatar_url: u.avatar_url || '',
          cover_url: u.cover_url || '',
          role: u.role || 'user',
          is_verified: u.is_verified || false,
        });
      } catch {
        toast.error('Failed to load user');
      } finally {
        setLoading(false);
      }
    })();
    // Fetch activity logs
    (async () => {
      try {
        const res = await adminFetch(`/api/admin/activity?user_id=${id}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch {}
    })();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('User updated');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await adminFetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ soft: deleteMode === 'soft' }),
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success(`User ${deleteMode === 'soft' ? 'deactivated' : 'deleted'}`);
      router.push('/dashboard/users');
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) return <EditPageSkeleton />;
  if (!user) return <div className="text-center py-20 text-red-400">User not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/users')} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit User</h1>
            <p className="text-sm text-zinc-400">Manage user details and permissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/profile/${user.uid || user.id}`} target="_blank" className="px-3 py-2 bg-white/5 rounded-xl text-sm text-zinc-400 hover:text-white transition flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Public Profile
          </Link>
          <motion.button
            onClick={handleSave}
            disabled={saving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {form.avatar_url ? <img src={form.avatar_url} className="w-24 h-24 object-cover" /> : <User className="w-12 h-12 text-purple-400" />}
            </div>
            <h3 className="text-xl font-bold text-white">{user.full_name}</h3>
            <p className="text-zinc-400 text-sm mt-1">UID: {user.uid}</p>
            <div className="mt-4 space-y-2 text-left">
              <div className="flex items-center gap-2 text-sm text-zinc-400"><Calendar className="w-4 h-4" /> Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</div>
              <div className="flex items-center gap-2 text-sm text-zinc-400"><Activity className="w-4 h-4" /> Last Login: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</div>
              <div className="flex items-center gap-2 text-sm text-zinc-400"><Hash className="w-4 h-4" /> Referral: {user.referral_code || 'N/A'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2"><ShoppingCart className="w-4 h-4" /> Orders</div>
              <motion.p key={stats.total_orders} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="text-2xl font-bold text-white">{stats.total_orders}</motion.p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2"><DollarSign className="w-4 h-4" /> Spent</div>
              <motion.p key={stats.total_spent} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="text-2xl font-bold text-white">${parseFloat(stats.total_spent).toFixed(2)}</motion.p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5">
            {['Profile', 'Activity'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition ${
                  activeTab === tab.toLowerCase() ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'profile' ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400">Full Name</label>
                  <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="mt-1 w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1 w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1 w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Website</label>
                  <input type="url" value={form.website} onChange={e => setForm({...form, website: e.target.value})} className="mt-1 w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Avatar URL</label>
                  <input type="url" value={form.avatar_url} onChange={e => setForm({...form, avatar_url: e.target.value})} className="mt-1 w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Cover URL</label>
                  <input type="url" value={form.cover_url} onChange={e => setForm({...form, cover_url: e.target.value})} className="mt-1 w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-zinc-400">Bio</label>
                  <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} rows={3} className="mt-1 w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="mt-1 w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none">
                    <option value="user">User</option>
                    <option value="vendor">Vendor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-10 h-6 rounded-full transition relative ${form.is_verified ? 'bg-green-600' : 'bg-zinc-600'}`}
                      onClick={() => setForm({...form, is_verified: !form.is_verified})}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${form.is_verified ? 'translate-x-4' : ''}`} />
                    </div>
                    <span className="text-sm text-zinc-300">Verified Account</span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2"><Clock className="w-4 h-4" /> Recent Activity</h3>
              {activities.length === 0 ? (
                <p className="text-sm text-zinc-500">No recent activity found.</p>
              ) : (
                activities.map((act, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <div className="flex-1">
                      <p className="text-sm text-white">{act.action}</p>
                      <p className="text-xs text-zinc-500">{new Date(act.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Danger Zone</h3>
            <p className="text-sm text-zinc-400 mt-1">Once you delete a user, there is no going back. Please be certain.</p>
            <div className="flex items-center gap-4 mt-4">
              <select value={deleteMode} onChange={e => setDeleteMode(e.target.value)} className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none">
                <option value="soft">Soft Delete (deactivate)</option>
                <option value="hard">Hard Delete (permanent)</option>
              </select>
              <button onClick={() => setDeleteConfirm(true)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm flex items-center gap-2 hover:bg-red-700 transition">
                <Trash2 className="w-4 h-4" /> Delete User
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteConfirm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-400" /></div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirm {deleteMode === 'soft' ? 'Deactivation' : 'Deletion'}</h3>
                  <p className="text-sm text-zinc-400">{deleteMode === 'soft' ? 'This user will be deactivated and cannot log in. Data is preserved.' : 'This user and ALL related data will be permanently removed.'}</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 bg-white/5 rounded-xl text-sm">Cancel</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 rounded-xl text-sm text-white">{deleteMode === 'soft' ? 'Deactivate' : 'Delete Permanently'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
