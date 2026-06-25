'use client';
import { useState, useEffect } from 'react';

export default function ShippingManagement() {
  const [token, setToken] = useState('');
  const [zones, setZones] = useState([]);
  const [region, setRegion] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchZones(savedToken);
  }, []);

  const fetchZones = async (tok) => {
    const res = await fetch('/api/admin/shipping', { headers: { Authorization: `Bearer ${tok}` } });
    if (res.ok) setZones(await res.json());
  };

  const addZone = async () => {
    await fetch('/api/admin/shipping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ region_name: region, price: parseFloat(price) })
    });
    setRegion(''); setPrice('');
    fetchZones(token);
  };

  const deleteZone = async (id) => {
    await fetch('/api/admin/shipping', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    fetchZones(token);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shipping Zones</h1>
      <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="w-full p-2 border rounded mb-4" />
      <div className="flex gap-2 mb-4">
        <input value={region} onChange={e => setRegion(e.target.value)} placeholder="Region name" className="p-2 border rounded flex-1" />
        <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" className="p-2 border rounded w-32" />
        <button onClick={addZone} className="px-4 py-2 bg-green-600 text-white rounded">Add</button>
      </div>
      <div className="space-y-2">
        {zones.map(z => (
          <div key={z.id} className="glass-card p-3 flex justify-between items-center">
            <span>{z.region_name} - {z.price} Ks</span>
            <button onClick={() => deleteZone(z.id)} className="text-red-500">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
