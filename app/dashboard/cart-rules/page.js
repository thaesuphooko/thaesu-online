'use client';
import { useState, useEffect } from 'react'; import Button from '@/components/ui/button'; import Input from '@/components/ui/input'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function CartRulesPage() {
  const [rules, setRules] = useState([]); const [form, setForm] = useState({ name:'', min_amount:'', discount_percent:'' });
  const fetchRules = async () => { const res = await adminFetch('/api/admin/cart-rules'); if (res.ok) setRules(await res.json()); };
  useEffect(() => { fetchRules(); }, []);
  const addRule = async () => { await adminFetch('/api/admin/cart-rules', { method:'POST', body:JSON.stringify({ name:form.name, min_amount:parseFloat(form.min_amount), discount_percent:parseFloat(form.discount_percent) }), headers:{'Content-Type':'application/json'} }); toast.success('Added'); fetchRules(); };
  const deleteRule = async (id) => { await adminFetch('/api/admin/cart-rules', { method:'DELETE', body:JSON.stringify({id}), headers:{'Content-Type':'application/json'} }); toast.success('Deleted'); fetchRules(); };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Cart Rules</h1>
      <div className="glass-card p-4 mb-8 flex gap-2"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Rule Name" /><Input type="number" value={form.min_amount} onChange={e=>setForm({...form,min_amount:e.target.value})} placeholder="Min Amount" /><Input type="number" value={form.discount_percent} onChange={e=>setForm({...form,discount_percent:e.target.value})} placeholder="Discount %" /><Button onClick={addRule}>Add</Button></div>
      <div className="space-y-2">{rules.map(r=>(<div key={r.id} className="glass-card p-3 flex justify-between"><span>{r.name} (Min {r.min_amount} Ks, {r.discount_percent}% off)</span><Button size="sm" variant="destructive" onClick={()=>deleteRule(r.id)}>Delete</Button></div>))}</div>
    </div>
  );
}
