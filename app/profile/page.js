'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [token, setToken] = useState('');
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: '', current_password: '', new_password: '' });
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchProfile(savedToken);
  }, []);

  const fetchProfile = async (authToken) => {
    const res = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${authToken}` } });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setForm({ full_name: data.full_name, current_password: '', new_password: '' });
    }
  };

  const handleUpdate = async () => {
    await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    alert('Profile updated');
    fetchProfile(token);
  };

  if (!profile) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-md mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <div className="glass-card p-4 space-y-3">
        <div>
          <label className="block text-sm">Email</label>
          <input value={profile.email} disabled className="w-full p-2 border rounded bg-gray-100" />
        </div>
        <div>
          <label className="block text-sm">Full Name</label>
          <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <hr />
        <div>
          <label className="block text-sm">New Password</label>
          <input type="password" value={form.new_password} onChange={e => setForm({...form, new_password: e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm">Current Password</label>
          <input type="password" value={form.current_password} onChange={e => setForm({...form, current_password: e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <button onClick={handleUpdate} className="w-full py-2 bg-blue-600 text-white rounded-xl">Update Profile</button>
      </div>
    </div>
  );
}
