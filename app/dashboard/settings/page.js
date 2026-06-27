'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [settings, setSettings] = useState({});
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchSettings(savedToken);
  }, []);

  const fetchSettings = async (tok) => {
    const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${tok}` } });
    if (res.ok) setSettings(await res.json());
  };

  const saveSetting = async () => {
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key: editKey, value: editValue }),
    });
    fetchSettings(token);
    setEditKey('');
    setEditValue('');
  };

  const testBot = async () => {
    await fetch('/api/telegram/test', { headers: { Authorization: `Bearer ${token}` } });
    alert('Test message sent to Telegram admin');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Global Settings</h1>
      <div className="mb-4">
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="w-full p-2 border rounded mb-4" />
      </div>
      <div className="mb-6">
        <button onClick={testBot} className="px-4 py-2 bg-blue-600 text-white rounded">Test Telegram Bot</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="bg-card p-4 rounded-xl shadow-sm border">
            <div className="text-sm font-medium text-muted-foreground mb-1">{key.replace(/_/g, ' ').toUpperCase()}</div>
            <div className="text-sm break-all mb-2">{value || '(empty)'}</div>
            <button onClick={() => { setEditKey(key); setEditValue(value); }} className="text-primary text-sm hover:underline">Edit</button>
          </div>
        ))}
      </div>

      {editKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Edit {editKey}</h2>
            <textarea value={editValue} onChange={e => setEditValue(e.target.value)} className="w-full p-2 border rounded mb-4 h-32" placeholder="Enter value" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setEditKey(''); setEditValue(''); }} className="px-4 py-2 bg-secondary rounded">Cancel</button>
              <button onClick={saveSetting} className="px-4 py-2 bg-primary text-primary-foreground rounded">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
