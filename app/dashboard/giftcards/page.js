'use client';
import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

export default function GiftCardsPage() {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ code:'', amount:'', expires_at:'' });
  const fetchCards = async () => { const res = await adminFetch('/api/admin/giftcards'); if(res.ok) setCards(await res.json()); };
  useEffect(()=>{ fetchCards(); }, []);
  const handleCreate = async () => {
    const res = await adminFetch('/api/admin/giftcards',{ method:'POST', body:JSON.stringify({ code:form.code, amount:parseFloat(form.amount), expires_at:form.expires_at||null }), headers:{'Content-Type':'application/json'} });
    if(res.ok){ toast.success('Created'); setForm({code:'',amount:'',expires_at:''}); fetchCards(); }
  };
  const handleDelete = async (id) => { await adminFetch('/api/admin/giftcards',{method:'DELETE',body:JSON.stringify({id}),headers:{'Content-Type':'application/json'}}); toast.success('Deleted'); fetchCards(); };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Gift Cards</h1>
      <div className="glass-card p-4 mb-8 flex gap-2">
        <Input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="Code" className="flex-1" />
        <Input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Amount" className="w-32" />
        <Input type="date" value={form.expires_at} onChange={e=>setForm({...form,expires_at:e.target.value})} />
        <Button onClick={handleCreate}>Create</Button>
      </div>
      <div className="glass-card overflow-x-auto"><table className="w-full"><thead><tr><th className="p-2">Code</th><th>Balance</th><th>Initial</th><th>Expires</th><th></th></tr></thead><tbody>{cards.map(c=>(<tr key={c.id} className="border-t"><td className="p-2">{c.code}</td><td>{c.balance} Ks</td><td>{c.initial_amount} Ks</td><td>{c.expires_at?new Date(c.expires_at).toLocaleDateString():'Never'}</td><td><Button size="sm" variant="destructive" onClick={()=>handleDelete(c.id)}>Delete</Button></td></tr>))}</tbody></table></div>
    </div>
  );
}
