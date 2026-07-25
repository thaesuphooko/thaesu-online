'use client';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Camera, Save } from 'lucide-react';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [social, setSocial] = useState({ facebook: '', twitter: '', instagram: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(u);
    // Fetch full profile
    const token = localStorage.getItem('token');
    fetch(`/api/user/uid/${u.uid}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setBio(data.user.bio || '');
        setWebsite(data.user.website || '');
        setSocial(data.user.social_links || {});
      });
  }, []);

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/user/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      setUser(prev => ({ ...prev, avatar_url: data.url }));
      toast.success('Avatar updated');
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bio, website, social_links: social }),
    });
    if (res.ok) toast.success('Profile updated');
    else toast.error('Failed to save');
  };

  if (!user) return <div className="text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <img src={user.avatar_url || '/placeholder.jpg'} className="w-20 h-20 rounded-full object-cover" alt="" />
          <button onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 p-1.5 bg-purple-600 rounded-full"><Camera className="w-4 h-4" /></button>
          <input type="file" ref={fileInputRef} onChange={uploadAvatar} className="hidden" accept="image/*" />
        </div>
        <div>
          <p className="text-xl font-semibold">{user.full_name || user.name}</p>
          <p className="text-zinc-400">@{user.uid}</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-zinc-400">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full p-2 bg-zinc-800 rounded-xl" rows={3} />
        </div>
        <div>
          <label className="text-sm text-zinc-400">Website</label>
          <input type="text" value={website} onChange={e => setWebsite(e.target.value)} className="w-full p-2 bg-zinc-800 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-blue-400">Facebook</label>
            <input type="text" value={social.facebook} onChange={e => setSocial({...social, facebook: e.target.value})} className="w-full p-1 bg-zinc-800 rounded" />
          </div>
          <div>
            <label className="text-xs text-blue-400">Twitter</label>
            <input type="text" value={social.twitter} onChange={e => setSocial({...social, twitter: e.target.value})} className="w-full p-1 bg-zinc-800 rounded" />
          </div>
          <div>
            <label className="text-xs text-pink-400">Instagram</label>
            <input type="text" value={social.instagram} onChange={e => setSocial({...social, instagram: e.target.value})} className="w-full p-1 bg-zinc-800 rounded" />
          </div>
        </div>
        <button onClick={handleSave} className="w-full py-2 bg-purple-600 rounded-xl flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save</button>
      </div>
    </div>
  );
}
