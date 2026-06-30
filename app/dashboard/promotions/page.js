'use client';
import { useState, useEffect } from 'react'; import Button from '@/components/ui/button'; import Input from '@/components/ui/input'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function PromotionsPage() {
  const [promos, setPromos] = useState([]); const [form, setForm] = useState({ name:'', discount_percent:'', start_date:'', end_date:'' });
  const fetchPromos = async () => { const res = await adminFetch('/api/admin/promotions'); if (res.ok) setPromos(await res.json()); };
  useEffect(() => { fetchPromos(); }, []);
  const create = async () => { await adminFetch('/api/admin/promotions', { method:'POST', body:JSON.stringify(form), headers:{'Content-Type':'application/json'} }); toast.success('Created'); fetchPromos(); };
  const deletePromo = async (id) => { await adminFetch('/api/admin/promotions', { method:'DELETE', body:JSON.stringify({id}), headers:{'Content-Type':'application/json'} }); toast.success('Deleted'); fetchPromos(); };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Promotions</h1>
      <div className="glass-card p-4 mb-8 grid grid-cols-2 gap-2"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name" /><Input type="number" value={form.discount_percent} onChange={e=>setForm({...form,discount_percent:e.target.value})} placeholder="Discount %" /><Input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} /><Input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})} /><Button onClick={create} className="col-span-2">Create</Button></div>
      <div className="space-y-2">{promos.map(p=>(<div key={p.id} className="glass-card p-3 flex justify-between"><span>{p.name} ({p.discount_percent}%)</span><Button size="sm" variant="destructive" onClick={()=>deletePromo(p.id)}>Delete</Button></div>))}</div>
    </div>
  );
}
