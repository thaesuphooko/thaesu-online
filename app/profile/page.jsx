"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { User, Mail, Phone, Shield, LogOut, Edit3, Save, X, Camera, Users, UserPlus, MessageSquare } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const fileInputRef = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchUid, setSearchUid] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    fetchProfile(token);
    fetchFriends(token);
  }, []);

  const fetchProfile = async (token) => {
    try {
      const res = await fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setName(data.user.full_name || "");
        setEmail(data.user.email || "");
        setPhone(data.user.phone || "");
        setAvatarUrl(data.user.avatar_url || null);
      } else {
        localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchFriends = async (token) => {
    try {
      const res = await fetch("/api/social/friends", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFriends(data.friends || []);
    } catch(e) {}
  };

  const handleAddFriend = async () => {
    const token = localStorage.getItem("token");
    if (!token || !searchUid) return;
    const res = await fetch("/api/social/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ friendUid: searchUid })
    });
    const data = await res.json();
    if (res.ok) alert("Friend request sent!"); else alert(data.error);
    setSearchUid("");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
        </div>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/20 text-center">
            <div className="relative mx-auto w-32 h-32 mb-6">
              <motion.div className="absolute inset-0 rounded-full border-2 border-purple-500/50" animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} />
              <motion.div className="absolute inset-2 rounded-full border-2 border-pink-500/50" animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg"><User className="w-16 h-16 text-white" /></div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Welcome Back!</h1>
            <p className="text-gray-400 text-sm mb-8">Sign in to access your profile.</p>
            <div className="space-y-3">
              <Link href="/auth/login" className="block w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg">Login</Link>
              <Link href="/auth/register" className="block w-full py-3 border border-white/20 rounded-xl font-bold text-lg">Register</Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 p-4 pt-24">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Profile</h1>
            <button onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); }} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm"><LogOut className="w-4 h-4" /> Logout</button>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef?.current?.click()}>
              <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-16 h-16 text-white" /></div>}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="w-8 h-8 text-white" /></div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
              const file = e.target.files[0]; if (!file) return;
              const formData = new FormData(); formData.append("avatar", file);
              const res = await fetch("/api/user/avatar", { method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, body: formData });
              const data = await res.json();
              if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
            }} />
            <p className="text-xs text-gray-500 mt-2">Click to change</p>
          </div>

          {/* Basic Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl"><User className="w-5 h-5 text-purple-400" /><div><p className="text-sm text-gray-400">Name</p><p className="text-white font-medium">{user.full_name}</p></div></div>
            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl"><Shield className="w-5 h-5 text-green-400" /><div><p className="text-sm text-gray-400">User ID</p><p className="text-white font-mono font-bold">{user.uid}</p></div></div>
            {user.email && <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl"><Mail className="w-5 h-5 text-blue-400" /><div><p className="text-sm text-gray-400">Email</p><p className="text-white">{user.email}</p></div></div>}
            {user.phone && <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl"><Phone className="w-5 h-5 text-cyan-400" /><div><p className="text-sm text-gray-400">Phone</p><p className="text-white">{user.phone}</p></div></div>}
          </div>

          {editing ? (
            <div className="space-y-3 mt-4">
              {error && <div className="p-2 rounded-lg bg-red-500/10 text-red-400 text-sm">{error}</div>}
              {success && <div className="p-2 rounded-lg bg-green-500/10 text-green-400 text-sm">{success}</div>}
              <div><label className="text-sm text-gray-400">Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500" /></div>
              <div><label className="text-sm text-gray-400">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500" /></div>
              <div><label className="text-sm text-gray-400">Phone</label><input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500" /></div>
              <div><label className="text-sm text-gray-400">Current Password (to change)</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500" /></div>
              <div><label className="text-sm text-gray-400">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mt-1 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500" /></div>
              <div className="flex gap-2">
                <button onClick={async () => {
                  const token = localStorage.getItem("token");
                  const res = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, email, phone, currentPassword: newPassword ? currentPassword : undefined, newPassword: newPassword || undefined }) });
                  const data = await res.json();
                  if (res.ok) { setUser(data.user); setEditing(false); setSuccess("Profile updated!"); setCurrentPassword(""); setNewPassword(""); } else setError(data.error || "Update failed");
                }} className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold transition flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save</button>
                <button onClick={() => { setEditing(false); setError(""); setSuccess(""); }} className="py-2 px-4 border border-white/20 rounded-xl hover:bg-white/10 transition flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="w-full mt-4 py-2 border border-white/20 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2 text-white"><Edit3 className="w-4 h-4" /> Edit Profile</button>
          )}
        </div>

        {/* Friends section */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-4"><Users className="inline w-5 h-5 mr-1" /> Friends ({friends.length})</h2>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Search User ID to add" value={searchUid} onChange={e => setSearchUid(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm" />
            <button onClick={handleAddFriend} className="px-4 py-2 bg-purple-600 rounded-xl text-sm font-bold"><UserPlus className="w-4 h-4 inline mr-1" /> Add</button>
          </div>
          <div className="space-y-2">
            {friends.map(f => (
              <div key={f.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold">{f.full_name[0]}</div>
                  <span className="text-white text-sm">{f.full_name}</span>
                </div>
                <Link href={`/chat?friend=${f.uid}`} className="text-purple-400 hover:text-purple-300"><MessageSquare className="w-4 h-4" /></Link>
              </div>
            ))}
            {friends.length === 0 && <p className="text-gray-500 text-sm">No friends yet. Search by User ID to add.</p>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
