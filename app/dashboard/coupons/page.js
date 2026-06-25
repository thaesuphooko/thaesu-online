'use client';
import { useState, useEffect } from 'react';

export default function CouponManagement() {
  const [token, setToken] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: '', discount_type: 'percent', discount_value: '', min_order_amount: '', max_uses: '', expires_at: '' });

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
  }, []);

  const fetchCoupons = async () => {
    if (!token) return;
    const res = await fetch('/api/admin/coupons', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCoupons(await res.json());
  };

  useEffect(() => { fetchCoupons(); }, [token]);

  const createCoupon = async () => {
    await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        code: form.code,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : 0,
        expires_at: form.expires_at || null,
      }),
    });
    setForm({ code: '', discount_type: 'percent', discount_value: '', min_order_amount: '', max_uses: '', expires_at: '' });
    fetchCoupons();
  };

  const deleteCoupon = async (id) => {
    await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchCoupons();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Coupon Management</h1>
      <div className="mb-4">
        <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="p-2 border rounded w-full max-w-xs" />
        <button onClick={fetchCoupons} className="ml-2 px-4 py-2 bg-blue-600 text-white rounded">Refresh</button>
      </div>

      <div className="glass-card p-4 mb-6">
        <h2 className="text-xl font-bold mb-2">Create Coupon</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Code" className="p-2 border rounded" />
          <select value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})} className="p-2 border rounded">
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
          <input value={form.discount_value} onChange={e => setForm({...form, discount_value: e.target.value})} placeholder="Value" type="number" className="p-2 border rounded" />
          <input value={form.min_order_amount} onChange={e => setForm({...form, min_order_amount: e.target.value})} placeholder="Min Order" type="number" className="p-2 border rounded" />
          <input value={form.max_uses} onChange={e => setForm({...form, max_uses: e.target.value})} placeholder="Max Uses" type="number" className="p-2 border rounded" />
          <input value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} placeholder="Expiry (YYYY-MM-DD)" type="date" className="p-2 border rounded" />
        </div>
        <button onClick={createCoupon} className="mt-3 px-6 py-2 bg-green-600 text-white rounded">Create</button>
      </div>

      <div className="overflow-x-auto glass-card">
        <table className="w-full">
          <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Uses</th><th>Expires</th><th>Action</th></tr></thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c.id}>
                <td>{c.code}</td>
                <td>{c.discount_type}</td>
                <td>{c.discount_value}</td>
                <td>{c.current_uses}/{c.max_uses || '∞'}</td>
                <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}</td>
                <td><button onClick={() => deleteCoupon(c.id)} className="px-2 py-1 bg-red-500 text-white rounded text-sm">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
