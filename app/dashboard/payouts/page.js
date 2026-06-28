'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState([]);
  const [form, setForm] = useState({ vendor_id:'', amount:'', notes:'' });
  const fetchPayouts = async () => { const res = await adminFetch('/api/admin/payouts'); if(res.ok) setPayouts(await res.json()); };
  useEffect(()=>{ fetchPayouts(); }, []);
  const handleCreate = async () => {
    await adminFetch('/api/admin/payouts',{ method:'POST', body:JSON.stringify({vendor_id:form.vendor_id, amount:parseFloat(form.amount), notes:form.notes}), headers:{'Content-Type':'application/json'} });
    toast.success('Created'); setForm({vendor_id:'',amount:'',notes:''}); fetchPayouts();
  };
  const updateStatus = async (id, status) => {
    await adminFetch('/api/admin/payouts',{ method:'PATCH', body:JSON.stringify({id,status}), headers:{'Content-Type':'application/json'} });
    toast.success('Updated'); fetchPayouts();
  };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Payouts</h1>
      <div className="glass-card p-4 mb-8 flex gap-2">
        <Input value={form.vendor_id} onChange={e=>setForm({...form,vendor_id:e.target.value})} placeholder="Vendor ID" className="flex-1" />
        <Input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Amount" className="w-32" />
        <Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes" className="flex-1" />
        <Button onClick={handleCreate}>Create</Button>
      </div>
      <div className="space-y-2">{payouts.map(p=>(<div key={p.id} className="glass-card p-4 flex justify-between"><div><p className="font-semibold">{p.store_name} ({p.vendor_email})</p><p className="text-sm">{p.amount.toLocaleString()} Ks</p>{p.notes&&<p className="text-xs text-muted-foreground">{p.notes}</p>}</div><select value={p.status} onChange={e=>updateStatus(p.id,e.target.value)} className="border rounded p-1"><option>pending</option><option>paid</option><option>failed</option></select></div>))}</div>
    </div>
  );
}
