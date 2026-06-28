'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [env, setEnv] = useState([]);
  const [editKey, setEditKey] = useState(null);
  const [editValue, setEditValue] = useState('');

  const fetchEnv = async () => {
    const res = await adminFetch('/api/admin/env');
    if (res.ok) setEnv(await res.json());
  };
  useEffect(() => { fetchEnv(); }, []);

  const save = async () => {
    await adminFetch('/api/admin/env', {
      method: 'PATCH',
      body: JSON.stringify({ changes: [{ key: editKey, value: editValue }] }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success('Saved');
    setEditKey(null);
    fetchEnv();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="space-y-2">
        {env.map(e => (
          <div key={e.key} className="flex justify-between">
            <span>{e.key}</span>
            <Button size="sm" variant="outline" onClick={() => { setEditKey(e.key); setEditValue(e.value); }}>Edit</Button>
          </div>
        ))}
      </div>
      {editKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-xl">
            <h2>Edit {editKey}</h2>
            <Input value={editValue} onChange={e => setEditValue(e.target.value)} />
            <Button onClick={save} className="mt-2">Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}
