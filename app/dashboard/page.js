'use client';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  // In production, get token from your auth state (e.g., cookie or context)
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    fetchConfigs(savedToken);
  }, []);

  async function fetchConfigs(authToken) {
    try {
      const res = await fetch('/api/admin/config', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleConfig(key, currentValue) {
    const newValue = { ...currentValue, enabled: !currentValue.enabled };
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ key, value: newValue })
      });
      if (res.ok) {
        const updated = await res.json();
        setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: updated.value } : c));
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Admin Dashboard</h1>

      {/* Admin Token Input (temporary) */}
      <div className="mb-8 p-4 glass-card">
        <label className="block text-sm font-medium mb-1">Admin JWT Token</label>
        <input
          type="text"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            localStorage.setItem('adminToken', e.target.value);
          }}
          className="w-full p-2 border rounded-md bg-white/20 backdrop-blur-sm"
          placeholder="Paste your admin JWT token"
        />
        <button
          onClick={() => fetchConfigs(token)}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Configuration Table */}
      <div className="overflow-x-auto glass-card">
        <table className="w-full text-left">
          <thead className="border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="p-3">Key</th>
              <th className="p-3">Status</th>
              <th className="p-3">Description</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((cfg) => (
              <tr key={cfg.key} className="border-b border-gray-100 dark:border-gray-700">
                <td className="p-3 font-mono text-sm">{cfg.key}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    cfg.value?.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {cfg.value?.enabled ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-3 text-sm text-gray-600 dark:text-gray-300">{cfg.description}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggleConfig(cfg.key, cfg.value)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                      cfg.value?.enabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {cfg.value?.enabled ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
