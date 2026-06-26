'use client';
import { useState, useEffect } from 'react';

export default function GiftCardManagement() {
  const [token, setToken] = useState('');
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ code: '', amount: '', expires_at: '' });

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchCards(savedToken);
  }, []);

  const fetchCards = async (tok) => {
    const res = await fetch('/api/admin/giftcards', { headers: { Authorization: `Bearer ${tok}` } });
    if (res.ok) setCards(await res.json());
  };

  const createCard = async () => {
    await fetch('/api/admin/giftcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: form.code, amount: parseFloat(form.amount), expires_at: form.expires_at || null })
    });
    setForm({ code: '', amount: '', expires_at: '' });
    fetchCards(token);
  };

  const deleteCard = async (id) => {
    await fetch('/api/admin/giftcards', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    fetchCards(token);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Gift Cards</h1>
      <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="w-full p-2 border rounded mb-4" />
      <div className="glass-card p-4 mb-6 flex gap-2">
        <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Card Code" className="p-2 border rounded flex-1" />
        <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="Amount" className="p-2 border rounded w-32" />
        <input type="date" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} className="p-2 border rounded" />
        <button onClick={createCard} className="px-4 py-2 bg-green-600 text-white rounded">Create</button>
      </div>
      <div className="space-y-2">
        {cards.map(c => (
          <div key={c.id} className="glass-card p-3 flex justify-between items-center">
            <div>
              <p className="font-semibold">{c.code}</p>
              <p className="text-sm">Balance: {c.balance} / {c.initial_amount} Ks</p>
              {c.expires_at && <p className="text-xs text-gray-500">Expires: {new Date(c.expires_at).toLocaleDateString()}</p>}
            </div>
            <div className="flex gap-2">
              <span className={`px-2 py-1 rounded text-sm ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{c.is_active ? 'Active' : 'Disabled'}</span>
              <button onClick={() => deleteCard(c.id)} className="text-red-500 text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
