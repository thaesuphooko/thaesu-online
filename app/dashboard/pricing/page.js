'use client';
import { useState, useEffect } from 'react';

export default function PricingManagement() {
  const [token, setToken] = useState('');
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({
    name: '', description: '', rule_type: 'time_based',
    condition: '{}', adjustment_type: 'percent', adjustment_value: '',
    is_active: true, priority: 0
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchRules(savedToken);
  }, []);

  const fetchRules = async (tok) => {
    const res = await fetch('/api/admin/pricing', { headers: { Authorization: `Bearer ${tok}` } });
    if (res.ok) setRules(await res.json());
  };

  const createRule = async () => {
    await fetch('/api/admin/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...form,
        condition: JSON.parse(form.condition || '{}'),
        adjustment_value: parseFloat(form.adjustment_value),
        priority: parseInt(form.priority) || 0
      })
    });
    fetchRules(token);
  };

  const deleteRule = async (id) => {
    await fetch(`/api/admin/pricing/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchRules(token);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dynamic Pricing Rules</h1>
      <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="w-full p-2 border rounded mb-4" />
      
      <div className="glass-card p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-2">
        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Rule Name" className="p-2 border rounded" />
        <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" className="p-2 border rounded" />
        <select value={form.rule_type} onChange={e => setForm({...form, rule_type: e.target.value})} className="p-2 border rounded">
          <option value="time_based">Time Based</option>
          <option value="stock_based">Stock Based</option>
          <option value="weekend">Weekend</option>
          <option value="demand_based">Demand Based</option>
        </select>
        <input value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} placeholder='e.g., {"startHour":8,"endHour":20}' className="p-2 border rounded" />
        <select value={form.adjustment_type} onChange={e => setForm({...form, adjustment_type: e.target.value})} className="p-2 border rounded">
          <option value="percent">Percent</option>
          <option value="fixed">Fixed Amount</option>
        </select>
        <input type="number" value={form.adjustment_value} onChange={e => setForm({...form, adjustment_value: e.target.value})} placeholder="Value" className="p-2 border rounded" />
        <input type="number" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} placeholder="Priority" className="p-2 border rounded" />
        <label className="flex items-center gap-1"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> Active</label>
        <button onClick={createRule} className="px-4 py-2 bg-green-600 text-white rounded">Create Rule</button>
      </div>

      <div className="space-y-2">
        {rules.map(rule => (
          <div key={rule.id} className="glass-card p-3 flex justify-between items-center">
            <div>
              <p className="font-semibold">{rule.name} ({rule.rule_type})</p>
              <p className="text-sm">{rule.adjustment_type === 'percent' ? `${rule.adjustment_value}%` : `${rule.adjustment_value} Ks`}</p>
            </div>
            <button onClick={() => deleteRule(rule.id)} className="text-red-500 text-sm">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
