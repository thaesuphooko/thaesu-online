'use client';
import { useState, useEffect } from 'react'; import { Button } from '@/components/ui/button'; import { Input } from '@/components/ui/input'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function PricingPage() {
  const [rules, setRules] = useState([]); const [form, setForm] = useState({ name:'', description:'', rule_type:'time_based', adjustment_type:'percent', adjustment_value:'', priority:'0', is_active:true });
  const fetchRules = async () => { const res = await adminFetch('/api/admin/pricing'); if (res.ok) setRules(await res.json()); };
  useEffect(() => { fetchRules(); }, []);
  const addRule = async () => { await adminFetch('/api/admin/pricing', { method:'POST', body:JSON.stringify({...form, adjustment_value:parseFloat(form.adjustment_value), priority:parseInt(form.priority)}), headers:{'Content-Type':'application/json'} }); toast.success('Rule added'); fetchRules(); };
  const deleteRule = async (id) => { await adminFetch('/api/admin/pricing', { method:'DELETE', body:JSON.stringify({id}), headers:{'Content-Type':'application/json'} }); toast.success('Deleted'); fetchRules(); };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Pricing Rules</h1>
      <div className="glass-card p-4 mb-8 grid grid-cols-2 md:grid-cols-4 gap-2"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name" /><Input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" /><select value={form.rule_type} onChange={e=>setForm({...form,rule_type:e.target.value})} className="p-2 border rounded"><option value="time_based">Time</option><option value="stock_based">Stock</option></select><select value={form.adjustment_type} onChange={e=>setForm({...form,adjustment_type:e.target.value})} className="p-2 border rounded"><option value="percent">%</option><option value="fixed">Fixed</option></select><Input type="number" value={form.adjustment_value} onChange={e=>setForm({...form,adjustment_value:e.target.value})} placeholder="Value" /><Input type="number" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} placeholder="Priority" /><Button onClick={addRule} className="col-span-2">Add Rule</Button></div>
      <div className="space-y-2">{rules.map(r=>(<div key={r.id} className="glass-card p-3 flex justify-between"><span>{r.name} ({r.rule_type}) - {r.adjustment_value}{r.adjustment_type==='percent'?'%':'Ks'}</span><Button size="sm" variant="destructive" onClick={()=>deleteRule(r.id)}>Delete</Button></div>))}</div>
    </div>
  );
}
