'use client';
import { useState, useEffect } from 'react';

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchData(savedToken);
  }, []);

  const fetchData = async (tok) => {
    const res = await fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${tok}` } });
    if (res.ok) setData(await res.json());
  };

  if (!data) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>
      <div className="mb-4">
        <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="p-2 border rounded w-full max-w-xs" />
        <button onClick={() => fetchData(token)} className="ml-2 px-4 py-2 bg-blue-600 text-white rounded">Refresh</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4"><p className="text-sm text-gray-500">Total Users</p><p className="text-2xl font-bold">{data.totalUsers}</p></div>
        <div className="glass-card p-4"><p className="text-sm text-gray-500">Products</p><p className="text-2xl font-bold">{data.totalProducts}</p></div>
        <div className="glass-card p-4"><p className="text-sm text-gray-500">Orders</p><p className="text-2xl font-bold">{data.totalOrders}</p></div>
        <div className="glass-card p-4"><p className="text-sm text-gray-500">Revenue</p><p className="text-2xl font-bold">{data.totalRevenue.toLocaleString()} Ks</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-4">
          <h2 className="font-semibold mb-2">Recent Daily Orders</h2>
          <div className="space-y-1">
            {data.ordersByDay.map((d, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{d.day}</span>
                <span>{d.count} orders / {parseFloat(d.revenue).toLocaleString()} Ks</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-4">
          <h2 className="font-semibold mb-2">Top Products</h2>
          <div className="space-y-1">
            {data.topProducts.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{p.title}</span>
                <span>{p.sold} sold</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 glass-card p-4">
        <p className="text-sm text-gray-500">Pending Vendor Payouts</p>
        <p className="text-xl font-bold text-red-600">{data.pendingPayouts.toLocaleString()} Ks</p>
      </div>
    </div>
  );
}
