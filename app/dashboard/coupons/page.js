'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import { Sparkles, RefreshCw, Ticket, CalendarDays, Percent, DollarSign, Activity } from 'lucide-react';

// Generate random coupon code
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'THAESU-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// Ticket Card Component
function TicketCard({ coupon, onDelete }) {
  const usagePercent = coupon.max_uses ? Math.min(100, Math.round((coupon.current_uses / coupon.max_uses) * 100)) : 0;
  const isExpired = coupon.expires_at ? new Date(coupon.expires_at) < new Date() : false;
  const status = !coupon.is_active ? 'disabled' : isExpired ? 'expired' : 'active';

  const statusColors = {
    active: 'bg-green-50 border-green-200 text-green-700',
    expired: 'bg-red-50 border-red-200 text-red-700',
    disabled: 'bg-gray-50 border-gray-200 text-gray-500',
  };
  const statusText = { active: 'Active', expired: 'Expired', disabled: 'Disabled' };

  return (
    <div className={`relative glass-card rounded-2xl overflow-hidden border-2 ${statusColors[status]} transition-all hover:shadow-lg`}>
      {/* Dashed cutout effect */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-gray-300 dark:border-gray-600 opacity-50" />
      <div className="p-4 pl-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-500" />
            <span className="font-bold text-lg tracking-wider">{coupon.code}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[status]}`}>{statusText[status]}</span>
        </div>

        <div className="flex items-center gap-4 text-sm mb-3">
          {coupon.discount_type === 'percent' ? (
            <span className="flex items-center gap-1"><Percent className="w-4 h-4 text-rose-500" />{coupon.discount_value}% OFF</span>
          ) : (
            <span className="flex items-center gap-1"><DollarSign className="w-4 h-4 text-rose-500" />{parseFloat(coupon.discount_value).toLocaleString()} Ks OFF</span>
          )}
          {coupon.min_order_amount > 0 && (
            <span className="text-muted-foreground">Min. {parseFloat(coupon.min_order_amount).toLocaleString()} Ks</span>
          )}
          {coupon.category_name && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{coupon.category_name}</span>}
          {coupon.product_title && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full truncate max-w-[120px]">{coupon.product_title}</span>}
        </div>

        {/* Usage Progress */}
        {coupon.max_uses && coupon.max_uses > 0 ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Usage</span>
              <span>{coupon.current_uses}/{coupon.max_uses} ({usagePercent}%)</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Uses: {coupon.current_uses} (unlimited)</div>
        )}

        {/* Expiry */}
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <CalendarDays className="w-3 h-3" />
          {coupon.expires_at ? `Expires: ${new Date(coupon.expires_at).toLocaleDateString()}` : 'No expiry'}
        </div>

        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="destructive" onClick={() => onDelete(coupon.id)}>Delete</Button>
        </div>
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    code: generateCode(),
    discount_type: 'percent',
    discount_value: '',
    min_order_amount: '',
    max_uses: '',
    expires_at: '',
    category_id: '',
    product_id: '',
  });
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['adminCoupons'],
    queryFn: () => adminFetch('/api/admin/coupons').then(r => r.json()),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => adminFetch('/api/admin/categories').then(r => r.json()).catch(() => []),
  });
  const { data: products } = useQuery({
    queryKey: ['allProducts'],
    queryFn: () => adminFetch('/api/admin/products?limit=200').then(r => r.json()).then(d => d.data).catch(() => []),
  });

  const handleCreate = async () => {
    if (!form.code || !form.discount_value) return toast.error('Code and discount value required');
    const res = await adminFetch('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: parseFloat(form.min_order_amount) || 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
        category_id: form.category_id || null,
        product_id: form.product_id || null,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      toast.success('Coupon created');
      setForm({ ...form, code: generateCode(), discount_value: '', min_order_amount: '', max_uses: '', expires_at: '', category_id: '', product_id: '' });
      queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
    } else {
      toast.error('Failed to create coupon');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    await adminFetch('/api/admin/coupons', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success('Deleted');
    queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
  };

  const getAiAdvice = async () => {
    if (!form.discount_value) return;
    setLoadingAdvice(true);
    const res = await adminFetch('/api/admin/ai-coupon-predict', {
      method: 'POST',
      body: JSON.stringify({ discount_type: form.discount_type, discount_value: form.discount_value }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (data.advice) {
      setAiAdvice(data.advice);
    } else {
      setAiAdvice('Could not get AI advice.');
    }
    setLoadingAdvice(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Coupons Management</h1>

      {/* Create Form */}
      <div className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Coupon Code</label>
            <div className="flex gap-2">
              <Input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Code" />
              <Button variant="outline" size="icon" onClick={() => setForm({...form, code: generateCode()})} title="Generate random">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Discount Type</label>
            <Select value={form.discount_type} onValueChange={v => setForm({...form, discount_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount (Ks)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Discount Value</label>
            <Input type="number" value={form.discount_value} onChange={e => setForm({...form, discount_value: e.target.value})} placeholder="10" />
          </div>
          <div>
            <label className="text-sm font-medium">Min Order Amount (Ks)</label>
            <Input type="number" value={form.min_order_amount} onChange={e => setForm({...form, min_order_amount: e.target.value})} placeholder="0" />
          </div>
          <div>
            <label className="text-sm font-medium">Max Uses (leave empty for unlimited)</label>
            <Input type="number" value={form.max_uses} onChange={e => setForm({...form, max_uses: e.target.value})} placeholder="100" />
          </div>
          <div>
            <label className="text-sm font-medium">Expiry Date</label>
            <Input type="date" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium">Restrict to Category</label>
            <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
              <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {(categories || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Restrict to Product</label>
            <Select value={form.product_id} onValueChange={v => setForm({...form, product_id: v})}>
              <SelectTrigger><SelectValue placeholder="All products" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {(products || []).slice(0, 100).map(p => <SelectItem key={p.id} value={p.id}>{p.title?.slice(0,50)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={handleCreate} className="gap-2"><Ticket className="w-4 h-4" />Create Coupon</Button>
          <Button variant="outline" onClick={getAiAdvice} disabled={loadingAdvice || !form.discount_value} className="gap-2">
            <Sparkles className="w-4 h-4" />{loadingAdvice ? 'Asking AI...' : 'Get AI Advice'}
          </Button>
          {aiAdvice && (
            <div className="flex-1 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-sm text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
              💡 {aiAdvice}
            </div>
          )}
        </div>
      </div>

      {/* Coupons List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && <p>Loading coupons...</p>}
        {coupons?.map(coupon => (
          <TicketCard key={coupon.id} coupon={coupon} onDelete={handleDelete} />
        ))}
        {coupons?.length === 0 && !isLoading && <p className="text-muted-foreground col-span-full text-center">No coupons yet.</p>}
      </div>
    </div>
  );
}
