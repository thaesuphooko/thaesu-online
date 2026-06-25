'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchConfigs(savedToken);
    else setLoading(false);
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

  // Icon mapping for config keys
  const getIcon = (key) => {
    const icons = {
      scraping_engine: '🕷️',
      media_rotation: '☁️',
      time_gate: '🕒',
      verification: '🛡️',
    };
    return icons[key] || '⚙️';
  };

  // Navigation items
  const navItems = [
    { name: 'Product Management', href: '/dashboard/products', icon: '📦', desc: 'Add, edit, or remove products' },
    { name: 'Coupons', href: '/dashboard/coupons', icon: '🎫', desc: 'Manage discount codes' },
    { name: 'Sales Dashboard', href: '/dashboard/sales', icon: '📊', desc: 'View revenue and orders' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your marketplace settings</p>
        </div>

        {/* Token Input (if not set) */}
        {!token && (
          <div className="glass-card p-4">
            <label className="block text-sm font-medium mb-1">Admin JWT Token</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  localStorage.setItem('adminToken', e.target.value);
                }}
                className="flex-1 p-2 border rounded-lg bg-white/50 backdrop-blur-sm"
                placeholder="Paste your admin token..."
              />
              <button
                onClick={() => fetchConfigs(token)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Verify
              </button>
            </div>
          </div>
        )}

        {/* Navigation Section */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Navigation</h2>
          </div>
          <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 px-4 py-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition active:scale-[0.98]"
              >
                <span className="text-2xl w-8 text-center">{item.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
                <span className="text-gray-400">›</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Configuration Toggles Section */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Configuration</h2>
          </div>
          <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
            {configs.map((cfg) => (
              <div key={cfg.key} className="flex items-center gap-4 px-4 py-4">
                <span className="text-2xl w-8 text-center">{getIcon(cfg.key)}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 capitalize">{cfg.key.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{cfg.description}</p>
                </div>
                <button
                  onClick={() => toggleConfig(cfg.key, cfg.value)}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                    cfg.value?.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                      cfg.value?.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-gray-400">
          Thaesu Online Admin Panel • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
