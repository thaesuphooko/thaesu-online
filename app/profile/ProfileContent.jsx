'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Camera, Save, X, Edit3, LogOut, Mail, Phone, Calendar, Eye, Lock, Package, MapPin } from 'lucide-react';
import OrderHistory from '@/components/organisms/OrderHistory';
import AddressBook from '@/components/organisms/AddressBook';

function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch(e) { return null; } }
function getToken() { return localStorage.getItem('token'); }

export default function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uidParam = searchParams.get('uid');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [stats, setStats] = useState({ post_count: 0, visit_count: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const token = getToken();
    const currentUser = getUser();
    if (uidParam) {
      fetchPublicProfile(uidParam);
    } else if (currentUser) {
      fetchOwnProfile(currentUser.uid);
      setIsOwnProfile(true);
    } else {
      router.replace('/auth/login');
    }
  }, [uidParam]);

  const fetchPublicProfile = async (uid) => {
    try {
      const res = await fetch(`/api/user/uid/${uid}/profile`);
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setName(data.user.full_name || '');
        setEmail(data.user.email || '');
        setPhone(data.user.phone || '');
        setAvatarUrl(data.user.avatar_url || null);
        setStats({ post_count: data.user.post_count || 0, visit_count: data.user.visit_count || 0 });
      } else setUser(null);
    } catch (e) {} finally { setLoading(false); }
  };

  const fetchOwnProfile = async (uid) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/user/uid/${uid}/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setName(data.user.full_name || '');
        setEmail(data.user.email || '');
        setPhone(data.user.phone || '');
        setAvatarUrl(data.user.avatar_url || null);
        setStats({ post_count: data.user.post_count || 0, visit_count: data.user.visit_count || 0 });
      } else {
        localStorage.removeItem('token'); localStorage.removeItem('user');
        router.replace('/auth/login');
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    const token = getToken();
    if (!token) return;
    const body = { name, email, phone };
    if (newPassword && currentPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setEditing(false);
      setSuccess('Profile updated!');
      setCurrentPassword(''); setNewPassword('');
    } else {
      setError(data.error || 'Update failed');
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    const token = getToken();
    const res = await fetch('/api/user/avatar', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
  };

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center">
        <User className="w-16 h-16 mx-auto mb-4 text-purple-400" />
        <h2 className="text-2xl font-bold mb-2">Welcome</h2>
        <p className="text-zinc-400 text-sm mb-6">Login or register to see your profile.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/auth/login" className="px-6 py-2.5 bg-purple-600 rounded-xl font-bold hover:bg-purple-700 transition">Login</Link>
          <Link href="/auth/register" className="px-6 py-2.5 border border-white/20 rounded-xl font-bold hover:bg-white/5 transition">Register</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-24 pb-24">
      <div className="max-w-xl mx-auto space-y-6">
        <Link href="/feed" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white">← Back to Feed</Link>

        {/* Tab Switcher */}
        {isOwnProfile && (
          <div className="flex gap-2 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'orders', label: 'Orders', icon: Package },
              { id: 'addresses', label: 'Addresses', icon: MapPin },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${activeTab === tab.id ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-2xl shadow-purple-500/10">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">{isOwnProfile ? 'My Profile' : user.full_name}</h1>
              {isOwnProfile && (
                <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.replace('/auth/login'); }} className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"><LogOut className="w-4 h-4" /> Logout</button>
              )}
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className={`relative ${isOwnProfile ? 'group cursor-pointer' : ''}`} onClick={() => isOwnProfile && fileInputRef.current?.click()}>
                <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-16 h-16 text-white" /></div>}
                </div>
                {isOwnProfile && <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="w-8 h-8 text-white" /></div>}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
              <p className="text-xs text-zinc-500 mt-2">@{user.uid}</p>
              <div className="flex gap-6 mt-3 text-sm">
                <div className="text-center"><span className="font-bold text-lg">{stats.post_count}</span><p className="text-zinc-500">Posts</p></div>
                <div className="text-center"><span className="font-bold text-lg">{stats.visit_count}</span><p className="text-zinc-500">Visitors</p></div>
              </div>
            </div>

            {isOwnProfile && (
              editing ? (
                <div className="space-y-3 mt-4">
                  {error && <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded-lg">{error}</p>}
                  {success && <p className="text-green-400 text-sm bg-green-500/10 p-2 rounded-lg">{success}</p>}
                  <div><label className="text-sm text-zinc-400">Name</label><input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500" /></div>
                  <div><label className="text-sm text-zinc-400">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500" /></div>
                  <div><label className="text-sm text-zinc-400">Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500" /></div>
                  <div><label className="text-sm text-zinc-400">Current Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500" /></div>
                  <div><label className="text-sm text-zinc-400">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500" /></div>
                  <div className="flex gap-2"><button onClick={handleSave} className="flex-1 py-2 bg-purple-600 rounded-xl font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save</button><button onClick={() => { setEditing(false); setError(''); setSuccess(''); }} className="px-4 py-2 border border-white/20 rounded-xl"><X className="w-4 h-4" /></button></div>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="w-full mt-4 py-2 border border-white/20 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2 text-white"><Edit3 className="w-4 h-4" /> Edit Profile</button>
              )
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && isOwnProfile && (
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
            <OrderHistory />
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && isOwnProfile && (
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
            <AddressBook />
          </div>
        )}
      </div>
    </div>
  );
}
