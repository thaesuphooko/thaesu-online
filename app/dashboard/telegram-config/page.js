'use client';
import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import { Zap, Trash2, Edit3 } from 'lucide-react';

export default function TelegramConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState({ bot_token: '', user_ids: '', notify_order: true, notify_lowstock: true, notify_crawler: true });
  const [editingId, setEditingId] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [visitorTracking, setVisitorTracking] = useState({ track_ip: true, track_device: true, track_referrer: true, track_page: true });

  const fetchConfigs = async () => {
    const res = await adminFetch('/api/admin/telegram-config');
    if (res.ok) setConfigs(await res.json());
  };

  const fetchTracking = async () => {
    const res = await adminFetch('/api/admin/visitor-tracking');
    if (res.ok) setVisitorTracking(await res.json());
  };

  useEffect(() => { fetchConfigs(); fetchTracking(); }, []);

  const handleSave = async () => {
    if (editingId) {
      await adminFetch('/api/admin/telegram-config', {
        method: 'PATCH',
        body: JSON.stringify({ id: editingId, ...form }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Updated');
    } else {
      await adminFetch('/api/admin/telegram-config', {
        method: 'POST',
        body: JSON.stringify(form),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Added');
    }
    setForm({ bot_token: '', user_ids: '', notify_order: true, notify_lowstock: true, notify_crawler: true });
    setEditingId(null);
    fetchConfigs();
  };

  const handleEdit = (cfg) => {
    setForm({ bot_token: cfg.bot_token, user_ids: cfg.user_ids, notify_order: cfg.notify_order, notify_lowstock: cfg.notify_lowstock, notify_crawler: cfg.notify_crawler });
    setEditingId(cfg.id);
  };

  const handleDelete = async (id) => {
    await adminFetch('/api/admin/telegram-config', { method: 'DELETE', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' } });
    toast.success('Deleted');
    fetchConfigs();
  };

  const testSingle = async (token, chatId, key) => {
    const res = await adminFetch('/api/admin/telegram-test-single', {
      method: 'POST',
      body: JSON.stringify({ token, chat_id: chatId }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setTestResults(prev => ({ ...prev, [key]: data }));
  };

  const updateTracking = async (field, value) => {
    const newSettings = { ...visitorTracking, [field]: value };
    setVisitorTracking(newSettings);
    await adminFetch('/api/admin/visitor-tracking', {
      method: 'PATCH',
      body: JSON.stringify({ [field]: value }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success('Tracking updated');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Telegram Configuration</h1>

      {/* Add/Edit Form */}
      <div className="glass-card p-4 mb-8 space-y-4">
        <Input value={form.bot_token} onChange={e => setForm({...form, bot_token: e.target.value})} placeholder="Bot Token" />
        <Input value={form.user_ids} onChange={e => setForm({...form, user_ids: e.target.value})} placeholder="User IDs (comma-separated)" />
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.notify_order} onChange={e => setForm({...form, notify_order: e.target.checked})} className="w-4 h-4" />
            🛒 Order Alerts
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.notify_lowstock} onChange={e => setForm({...form, notify_lowstock: e.target.checked})} className="w-4 h-4" />
            ⚠️ Low Stock Alerts
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.notify_crawler} onChange={e => setForm({...form, notify_crawler: e.target.checked})} className="w-4 h-4" />
            🕷️ Crawler Alerts
          </label>
        </div>
        <Button onClick={handleSave} className="w-full">{editingId ? 'Update' : 'Add'} Configuration</Button>
      </div>

      {/* Config List */}
      <div className="space-y-4 mb-8">
        {configs.map(cfg => {
          const ids = cfg.user_ids.split(',').map(s => s.trim());
          return (
            <div key={cfg.id} className="glass-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm">Bot: {cfg.bot_token.slice(0, 15)}...</p>
                  <p className="text-sm text-muted-foreground">User IDs: {cfg.user_ids}</p>
                  <div className="flex gap-3 mt-1 text-xs">
                    <span className={cfg.notify_order ? 'text-green-400' : 'text-gray-500'}>🛒 Orders</span>
                    <span className={cfg.notify_lowstock ? 'text-yellow-400' : 'text-gray-500'}>⚠️ Stock</span>
                    <span className={cfg.notify_crawler ? 'text-blue-400' : 'text-gray-500'}>🕷️ Crawler</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(cfg)}><Edit3 className="w-4 h-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(cfg.id)}><Trash2 className="w-4 h-4" /></Button>
                  <Button size="sm" onClick={() => testSingle(cfg.bot_token, ids[0], cfg.id)} className="gap-1"><Zap className="w-4 h-4" /> Test</Button>
                </div>
              </div>
              {testResults[cfg.id] && (
                <div className={`text-sm ${testResults[cfg.id].ok ? 'text-green-500' : 'text-red-500'}`}>
                  {testResults[cfg.id].ok ? '✅ Test passed' : `❌ ${testResults[cfg.id].description || 'Failed'}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Visitor Tracking Settings */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-xl font-bold">Visitor Tracking Settings</h2>
        <p className="text-xs text-muted-foreground">Real‑time alerts to Telegram when someone visits your site</p>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={visitorTracking.track_ip} onChange={e => updateTracking('track_ip', e.target.checked)} className="w-4 h-4" />
            IP Address & Location
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={visitorTracking.track_device} onChange={e => updateTracking('track_device', e.target.checked)} className="w-4 h-4" />
            Device & Browser Info
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={visitorTracking.track_referrer} onChange={e => updateTracking('track_referrer', e.target.checked)} className="w-4 h-4" />
            Referrer URL
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={visitorTracking.track_page} onChange={e => updateTracking('track_page', e.target.checked)} className="w-4 h-4" />
            Current Page Path
          </label>
        </div>
      </div>
    </div>
  );
}
