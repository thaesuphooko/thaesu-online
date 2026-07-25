'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function VendorSettingsPage() {
  const [settings, setSettings] = useState({ store_name: '', store_slug: '', phone: '', email: '', new_password: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/vendor/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { setSettings(prev => ({...prev, ...data, new_password: ''})); setLoading(false); });
  }, []);

  const save = async () => {
    const token = localStorage.getItem('token');
    const body = { store_name: settings.store_name, store_slug: settings.store_slug, phone: settings.phone };
    if (settings.new_password) body.new_password = settings.new_password;
    const res = await fetch('/api/vendor/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) toast.success('Settings saved');
    else toast.error('Failed to save');
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Store Settings</h1>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-zinc-400">Store Name</label>
          <Input value={settings.store_name} onChange={e => setSettings({...settings, store_name: e.target.value})} className="bg-white/5 border-white/10" />
        </div>
        <div>
          <label className="text-sm text-zinc-400">Store Slug</label>
          <Input value={settings.store_slug} onChange={e => setSettings({...settings, store_slug: e.target.value})} className="bg-white/5 border-white/10" />
        </div>
        <div>
          <label className="text-sm text-zinc-400">Phone</label>
          <Input value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} className="bg-white/5 border-white/10" />
        </div>
        <div>
          <label className="text-sm text-zinc-400">Email</label>
          <Input value={settings.email} disabled className="bg-white/5 border-white/10 opacity-50" />
        </div>
        <div>
          <label className="text-sm text-zinc-400">New Password (leave blank to keep)</label>
          <Input type="password" value={settings.new_password} onChange={e => setSettings({...settings, new_password: e.target.value})} className="bg-white/5 border-white/10" />
        </div>
        <Button onClick={save} className="w-full bg-purple-600">Save Changes</Button>
      </div>
    </div>
  );
}
