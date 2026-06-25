'use client';
import { useState, useEffect } from 'react';

export default function PayoutManagement() {
  const [token, setToken] = useState('');
  const [payouts, setPayouts] = useState([]);
  const [form, setForm] = useState({ vendor_id: '', amount: '', notes: '' });

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchPayouts(savedToken);
  }, []);

  const fetchPayouts = async (tok) => {
    const res = await fetch('/api/admin/payouts', { headers: { Authorization: `Bearer ${tok}` } });
    if (res.ok) setPayouts(await res.json());
  };

  const createPayout = async () => {
    await fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vendor_id: form.vendor_id, amount: parseFloat(form.amount), notes: form.notes })
    });
    setForm({ vendor_id: '', amount: '', notes: '' });
    fetchPayouts(token);
  };

  const updateStatus = async (id, newStatus) => {
    await fetch('/api/admin/payouts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status: newStatus })
    });
    fetchPayouts(token);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Vendor Payouts</h1>
      <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="w-full p-2 border rounded mb-4" />
      <div className="glass-card p-4 mb-6 flex gap-2">
        <input value={form.vendor_id} onChange={e => setForm({...form, vendor_id: e.target.value})} placeholder="Vendor ID" className="p-2 border rounded flex-1" />
        <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="Amount" className="p-2 border rounded w-32" />
        <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes" className="p-2 border rounded flex-1" />
        <button onClick={createPayout} className="px-4 py-2 bg-green-600 text-white rounded">Add</button>
      </div>
      <div className="space-y-3">
        {payouts.map(p => (
          <div key={p.id} className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{p.store_name} ({p.vendor_email})</p>
              <p className="text-sm">{p.amount.toLocaleString()} Ks - <span className={`capitalize ${p.status==='paid'?'text-green-600':p.status==='pending'?'text-yellow-600':'text-red-600'}`}>{p.status}</span></p>
              {p.notes && <p className="text-xs text-gray-500">{p.notes}</p>}
            </div>
            <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)} className="p-1 border rounded">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
