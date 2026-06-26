'use client';
import { useState, useEffect } from 'react';

export default function AffiliatePage() {
  const [token, setToken] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchStats(savedToken);
  }, []);

  const fetchStats = async (authToken) => {
    const res = await fetch('/api/affiliate/stats', { headers: { Authorization: `Bearer ${authToken}` } });
    if (res.ok) setStats(await res.json());
  };

  const copyLink = () => {
    if (stats?.code) {
      navigator.clipboard.writeText(`${window.location.origin}/?ref=${stats.code}`);
      alert('Affiliate link copied!');
    }
  };

  if (!stats) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Affiliate Program</h1>
      <div className="glass-card p-6 space-y-4">
        <p className="text-lg">Share your link and earn <b>5%</b> commission on every order!</p>
        <div className="flex items-center gap-2">
          <input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${stats.code}`} className="flex-1 p-2 border rounded bg-gray-100" />
          <button onClick={copyLink} className="px-4 py-2 bg-blue-600 text-white rounded">Copy</button>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalClicks || 0}</p>
            <p className="text-sm text-gray-500">Total Clicks</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold">{stats.pendingCommission || 0} Ks</p>
            <p className="text-sm text-gray-500">Pending Commission</p>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Recent Commissions</h3>
          {stats.commissions?.map(c => (
            <div key={c.id} className="flex justify-between py-2 border-b">
              <span>Order {c.order_id?.slice(0,8)}</span>
              <span className={`font-semibold ${c.status==='paid'?'text-green-600':c.status==='pending'?'text-yellow-600':'text-red-600'}`}>
                {c.amount} Ks ({c.status})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
