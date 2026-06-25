'use client';
import { useState, useEffect } from 'react';

export default function SalesDashboard() {
  const [token, setToken] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
  }, []);

  const fetchData = async () => {
    if (!token) return;
    const res = await fetch('/api/admin/sales', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setData(await res.json());
  };

  useEffect(() => { fetchData(); }, [token]);

  if (!data) return <div className="p-8 text-center">Loading... (Enter token and click Refresh)</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Sales Dashboard</h1>
      <div className="mb-4 flex items-center gap-2">
        <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="p-2 border rounded w-full max-w-xs" />
        <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded">Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold">Total Orders</h3>
          <p className="text-4xl font-bold">{data.totalOrders}</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold">Total Revenue</h3>
          <p className="text-4xl font-bold">{data.totalRevenue.toLocaleString()} Ks</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold">Low Stock Items</h3>
          <p className="text-4xl font-bold">{data.lowStock.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-4">
          <h2 className="text-xl font-bold mb-2">Top Products</h2>
          <div className="space-y-2">
            {data.topProducts.map((p, i) => (
              <div key={i} className="flex justify-between items-center">
                <span>{p.title}</span>
                <span className="text-sm font-medium">{p.sold} sold ({parseFloat(p.revenue).toLocaleString()} Ks)</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-4">
          <h2 className="text-xl font-bold mb-2">Low Stock Alert</h2>
          {data.lowStock.length === 0 ? <p>All products well stocked.</p> :
            data.lowStock.map(p => (
              <div key={p.id} className="flex justify-between items-center py-1">
                <span>{p.title}</span>
                <span className="text-red-500 font-bold">{p.stock} left</span>
              </div>
            ))
          }
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="text-xl font-bold mb-2">Recent Orders</h2>
        <table className="w-full">
          <thead><tr><th>Order ID</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {data.recentOrders.map(o => (
              <tr key={o.id}>
                <td className="font-mono">{o.id.slice(0,8)}...</td>
                <td>{parseFloat(o.total_amount).toLocaleString()} Ks</td>
                <td>{o.status}</td>
                <td>{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
