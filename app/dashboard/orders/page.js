'use client';
import { useState, useEffect } from 'react';

export default function AdminOrders() {
  const [token, setToken] = useState('');
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchOrders(savedToken);
  }, []);

  const fetchOrders = async (authToken) => {
    const res = await fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${authToken}` } });
    if (res.ok) setOrders(await res.json());
  };

  const changeStatus = async (orderId, newStatus) => {
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
    fetchOrders(token);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Order Management</h1>
      <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="w-full p-2 border rounded mb-4" />
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="font-mono">{order.id.slice(0,8)}</p>
              <p>{order.total_amount} Ks</p>
              <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={order.status} onChange={e => changeStatus(order.id, e.target.value)} className="p-1 border rounded">
                {['pending','confirmed','preparing','delivering','delivered','cancelled'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
