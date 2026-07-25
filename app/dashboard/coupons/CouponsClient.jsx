'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Download, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function CouponsClient({ initialCoupons }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', discount_value: '', max_uses: '', expires_at: '' });

  // Refresh (optional, can be used after edits)
  const refresh = async () => {
    const hash = window.location.hash.substring(1) || 'step';
    const res = await fetch(`/api/admin/coupons?admin_hash=${hash}`);
    setCoupons(await res.json());
  };

  const filtered = useMemo(() => {
    if (!search) return coupons;
    return coupons.filter(c => c.code.toLowerCase().includes(search.toLowerCase()));
  }, [coupons, search]);

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selected.length} coupons?`)) return;
    await adminFetch('/api/admin/coupons/bulk', { method: 'DELETE', body: JSON.stringify({ ids: selected }), headers: { 'Content-Type': 'application/json' } });
    toast.success(`Deleted ${selected.length} coupons`);
    setSelected([]);
    refresh();
  };

  const openEdit = (coupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      max_uses: coupon.max_uses?.toString() || '',
      expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : '',
    });
  };

  const handleSave = async () => {
    if (!form.code || !form.discount_value) return;
    const url = editing ? `/api/admin/coupons/${editing.id}` : '/api/admin/coupons';
    const method = editing ? 'PUT' : 'POST';
    const res = await adminFetch(url, {
      method,
      body: JSON.stringify(form),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const saved = await res.json();
      if (editing) setCoupons(prev => prev.map(c => c.id === saved.id ? saved : c));
      else setCoupons(prev => [saved, ...prev]);
      toast.success(editing ? 'Coupon updated' : 'Coupon created');
      setEditing(null);
    } else toast.error('Failed');
  };

  const exportExcel = () => {
    const hash = window.location.hash.substring(1) || 'step';
    window.open(`/api/admin/coupons/export?admin_hash=${hash}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center bg-black/20 backdrop-blur p-2 rounded-xl border border-white/10">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code..." className="max-w-[160px] h-8 text-xs bg-white/5 border-white/10" />
        <div className="flex-1" />
        <span className="text-xs text-zinc-400">{filtered.length} coupons</span>
        <Button onClick={deleteSelected} disabled={selected.length === 0} variant="destructive" size="sm" className="h-8 text-xs">Del ({selected.length})</Button>
        <Button onClick={() => { setEditing(null); setForm({ code: '', discount_type: 'percentage', discount_value: '', max_uses: '', expires_at: '' }); }} size="sm" className="h-8 bg-purple-600"><Plus className="w-3 h-3 mr-1"/>New</Button>
        <Button onClick={exportExcel} variant="ghost" size="sm" className="h-8"><Download className="w-3 h-3 mr-1"/>Excel</Button>
      </div>

      {/* Table Header */}
      <div className="flex items-center gap-2 px-2 py-1 text-xs text-zinc-500 bg-white/5 rounded-lg">
        <Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map(c => c.id))} />
        <div className="flex-1">Code</div>
        <div className="w-20 text-center">Discount</div>
        <div className="w-20 text-center">Uses</div>
        <div className="w-20 text-center">Expires</div>
        <div className="w-16 text-right">Actions</div>
      </div>

      {/* List */}
      <div className="space-y-1">
        {filtered.map(c => (
          <div key={c.id} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg hover:bg-white/10 transition">
            <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-purple-400 text-sm">{c.code}</div>
              <div className="text-xs text-zinc-400">{c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `${c.discount_value} Ks OFF`}</div>
            </div>
            <div className="w-20 text-center text-xs">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `${c.discount_value}Ks`}</div>
            <div className="w-20 text-center text-xs">{c.used_count || 0}/{c.max_uses || '∞'}</div>
            <div className="w-20 text-center text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</div>
            <div className="w-16 text-right flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 className="w-4 h-4 text-blue-400" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete?')) { adminFetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' }).then(() => { setCoupons(prev => prev.filter(x => x.id !== c.id)); toast.success('Deleted'); }); } }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-zinc-500 text-center py-10">No coupons found.</p>}
      </div>

      {/* Edit/Create Modal */}
      <Dialog open={editing !== null || (editing === null && form.code !== '')} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-md bg-black/90 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader><DialogTitle>{editing ? 'Edit Coupon' : 'New Coupon'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <Input placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="bg-white/5 border-white/10" />
            <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm">
              <option value="percentage">Percentage</option>
              <option value="flat">Flat Amount</option>
            </select>
            <Input type="number" placeholder="Discount Value" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} className="bg-white/5 border-white/10" />
            <Input type="number" placeholder="Max Uses (optional)" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} className="bg-white/5 border-white/10" />
            <Input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="bg-white/5 border-white/10" />
          </div>
          <DialogFooter><Button onClick={handleSave} className="w-full bg-purple-600">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
