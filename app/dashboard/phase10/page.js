'use client';
import { useState } from 'react';

export default function Phase10Dashboard() {
  const [token, setToken] = useState('');
  const [results, setResults] = useState('');

  const handle = async (url, method = 'GET', body = null) => {
    if (!token) return alert('Token required');
    const opts = { method, headers: { Authorization: `Bearer ${token}` } };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    const data = await res.json();
    setResults(JSON.stringify(data, null, 2));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Phase 10 – AI & Automation</h1>
      <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="w-full p-2 border rounded mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button onClick={() => handle('/api/admin/sentiment')} className="p-4 bg-blue-600 text-white rounded-xl">Analyze Reviews</button>
        <button onClick={() => handle('/api/admin/inventory-forecast')} className="p-4 bg-purple-600 text-white rounded-xl">Inventory Forecast</button>
        <button onClick={() => handle('/api/admin/generate-description', 'POST', { product_id: prompt('Product ID') })} className="p-4 bg-orange-600 text-white rounded-xl">Generate Description</button>
        <button onClick={() => handle('/api/admin/report')} className="p-4 bg-green-600 text-white rounded-xl">Download Sales Report</button>
        <button onClick={() => handle('/api/admin/email-campaigns')} className="p-4 bg-teal-600 text-white rounded-xl">Email Campaigns</button>
        <button onClick={() => handle('/api/admin/ab-tests')} className="p-4 bg-indigo-600 text-white rounded-xl">AB Tests</button>
      </div>
      {results && <pre className="glass-card p-4 text-sm overflow-auto max-h-96">{results}</pre>}
    </div>
  );
}
