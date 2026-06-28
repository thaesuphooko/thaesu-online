'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: '', discount_type: 'percent', discount_value: '', min_order_amount: '', max_uses: '', expires_at: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchCoupons = async () => {
    const res = await adminFetch('/api/admin/coupons');
    if (res.ok) setCoupons(await res.json());
  };
  useEffect(() => { fetchCoupons(); }, []);

  const handleSave = async () => {
    const method = editingId ? 'PATCH' : 'POST';
    const url = editingId ? `/api/admin/coupons/${editingId}` : '/api/admin/coupons';
    const res = await adminFetch(url, {
      method,
      body: JSON.stringify({ ...form, discount_value: parseFloat(form.discount_value)||0, min_order_amount: parseFloat(form.min_order_amount)||0, max_uses: parseInt(form.max_uses)||0 }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) { toast.success(editingId?'Updated':'Created'); setForm({ code:'', discount_type:'percent', discount_value:'', min_order_amount:'', max_uses:'', expires_at:'' }); setEditingId(null); fetchCoupons(); }
    else toast.error('Failed');
  };

  const handleEdit = (c) => { setEditingId(c.id); setForm({ code:c.code, discount_type:c.discount_type, discount_value:c.discount_value, min_order_amount:c.min_order_amount, max_uses:c.max_uses, expires_at:c.expires_at?.slice(0,10)||'' }); };
  const handleDelete = async (id) => { if(confirm('Delete?')){ await adminFetch(`/api/admin/coupons/${id}`,{method:'DELETE'}); toast.success('Deleted'); fetchCoupons(); } };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Coupons</h1>
      <div className="glass-card p-4 mb-8 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="Code" />
          <select value={form.discount_type} onChange={e=>setForm({...form,discount_type:e.target.value})} className="p-2 border rounded"><option value="percent">Percentage</option><option value="fixed">Fixed</option></select>
          <Input type="number" value={form.discount_value} onChange={e=>setForm({...form,discount_value:e.target.value})} placeholder="Value" />
          <Input type="number" value={form.min_order_amount} onChange={e=>setForm({...form,min_order_amount:e.target.value})} placeholder="Min Order" />
          <Input type="number" value={form.max_uses} onChange={e=>setForm({...form,max_uses:e.target.value})} placeholder="Max Uses" />
          <Input type="date" value={form.expires_at} onChange={e=>setForm({...form,expires_at:e.target.value})} />
        </div>
        <Button onClick={handleSave} className="w-full">{editingId?'Update':'Create'}</Button>
      </div>
      <div className="glass-card overflow-x-auto"><table className="w-full"><thead><tr><th className="p-2">Code</th><th>Type</th><th>Value</th><th>Min</th><th>Uses</th><th>Expires</th><th></th></tr></thead><tbody>{coupons.map(c=>(<tr key={c.id} className="border-t"><td className="p-2">{c.code}</td><td>{c.discount_type}</td><td>{c.discount_value}</td><td>{c.min_order_amount}</td><td>{c.current_uses}/{c.max_uses||'∞'}</td><td>{c.expires_at?new Date(c.expires_at).toLocaleDateString():'Never'}</td><td className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>handleEdit(c)}>Edit</Button><Button size="sm" variant="destructive" onClick={()=>handleDelete(c.id)}>Delete</Button></td></tr>))}</tbody></table></div>
    </div>
  );
}
