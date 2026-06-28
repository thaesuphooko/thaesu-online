'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

export default function TelegramConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState({ bot_token: '', user_ids: '' });

  const fetchConfigs = async () => {
    const res = await adminFetch('/api/admin/telegram-config');
    if (res.ok) setConfigs(await res.json());
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleSave = async () => {
    await adminFetch('/api/admin/telegram-config', { method: 'POST', body: JSON.stringify(form), headers: { 'Content-Type': 'application/json' } });
    toast.success('Config added');
    fetchConfigs();
  };

  const handleDelete = async (id) => {
    await adminFetch('/api/admin/telegram-config', { method: 'DELETE', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' } });
    toast.success('Deleted');
    fetchConfigs();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Telegram Config</h1>
      <div className="glass-card p-4 mb-8 space-y-4">
        <Input value={form.bot_token} onChange={e => setForm({...form, bot_token: e.target.value})} placeholder="Bot Token" />
        <Input value={form.user_ids} onChange={e => setForm({...form, user_ids: e.target.value})} placeholder="User IDs (comma-separated)" />
        <Button onClick={handleSave} className="w-full">Add Configuration</Button>
      </div>
      <div className="space-y-4">
        {configs.map(cfg => (
          <div key={cfg.id} className="glass-card p-4 flex justify-between items-center">
            <div>
              <p className="font-mono text-sm">Bot: {cfg.bot_token.slice(0, 15)}...</p>
              <p className="text-sm text-muted-foreground">User IDs: {cfg.user_ids}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(cfg.id)}>Delete</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
