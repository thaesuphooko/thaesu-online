'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import { Download, FileText, Sparkles } from 'lucide-react';

const limit = 20;

function fetchOrders({ pageParam = 1, queryKey }) {
  const [, status, dateFrom, dateTo] = queryKey;
  const params = new URLSearchParams({ page: pageParam, limit });
  if (status) params.set('status', status);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  return adminFetch(`/api/admin/orders?${params}`).then(res => res.json());
}

function StatusBadge({ status }) {
  switch (status) {
    case 'pending': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>;
    case 'confirmed': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Confirmed</span>;
    case 'preparing': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Preparing</span>;
    case 'delivering': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Delivering</span>;
    case 'delivered': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Delivered</span>;
    case 'cancelled': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Cancelled</span>;
    default: return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
  }
}

function formatCurrency(num) {
  return parseFloat(num || 0).toLocaleString() + ' Ks';
}

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const observerRef = useRef(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['adminOrders', status, dateFrom, dateTo],
    queryFn: fetchOrders,
    getNextPageParam: (lastPage) => lastPage.totalPages > lastPage.page ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  const allOrders = data?.pages?.flatMap(p => p.data) ?? [];
  const totalCount = data?.pages?.[0]?.total ?? 0;

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.length === 0) return;
    await adminFetch('/api/admin/orders/bulk-status', {
      method: 'PATCH',
      body: JSON.stringify({ orderIds: selected, status: bulkStatus }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success(`Updated ${selected.length} orders to ${bulkStatus}`);
    setSelected([]); setBulkStatus('');
    refetch();
  };

  const updateSingleStatus = async (orderId, newStatus) => {
    await adminFetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success('Status updated');
    refetch();
  };

  const openInvoice = (orderId) => {
    window.open(`/api/orders/invoice/${orderId}`, '_blank');
  };

  const estimateCost = async (productId) => {
    const res = await adminFetch('/api/admin/ai-cost', {
      method: 'POST',
      body: JSON.stringify({ productId }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    if (data.cost) {
      toast.success(`Cost estimated: ${data.cost} Ks`);
      refetch();
    } else {
      toast.error(data.error || 'Failed');
    }
  };

  if (isLoading) return <div className="text-center py-8">Loading orders...</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="delivering">Delivering</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
        <span className="text-xs">to</span>
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />

        {/* Bulk Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Bulk Change" /></SelectTrigger>
            <SelectContent>
              {['pending','confirmed','preparing','delivering','delivered','cancelled'].map(s => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={applyBulkStatus} disabled={selected.length === 0 || !bulkStatus} variant="secondary">Apply</Button>
          <span className="text-xs text-muted-foreground">{selected.length} selected</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-auto h-[calc(100vh-14rem)] glass-card rounded-xl">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="p-2"><Checkbox checked={selected.length === allOrders.length && allOrders.length > 0} onCheckedChange={() => {
                if (selected.length === allOrders.length) setSelected([]);
                else setSelected(allOrders.map(o => o.id));
              }} /></th>
              <th className="p-2 text-left">Order</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-right">Profit</th>
              <th className="p-2 text-center">Status</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allOrders.map(order => (
              <tr key={order.id} className="border-t border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="p-2"><Checkbox checked={selected.includes(order.id)} onCheckedChange={() => toggleSelect(order.id)} /></td>
                <td className="p-2">
                  <div className="font-medium">{order.id.slice(0,8)}</div>
                  <div className="text-xs text-muted-foreground">
                    {order.items?.[0]?.title || 'No items'}
                    {order.items?.length > 1 && ` +${order.items.length - 1} more`}
                  </div>
                </td>
                <td className="p-2 text-right font-mono">{formatCurrency(order.total_amount)}</td>
                <td className="p-2 text-right font-mono">
                  {order.total_profit != null ? (
                    <span className={order.total_profit >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {order.total_profit >= 0 ? '+' : ''}{formatCurrency(order.total_profit)}
                    </span>
                  ) : (
                    <button onClick={() => {
                      if (order.items?.[0]?.product_id) estimateCost(order.items[0].product_id);
                    }} className="text-xs text-purple-500 hover:underline flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Estimate
                    </button>
                  )}
                </td>
                <td className="p-2 text-center">
                  <select
                    value={order.status}
                    onChange={e => updateSingleStatus(order.id, e.target.value)}
                    className="border rounded p-1 text-xs"
                  >
                    {['pending','confirmed','preparing','delivering','delivered','cancelled'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <div className="mt-1"><StatusBadge status={order.status} /></div>
                </td>
                <td className="p-2">
                  {order.customer_name ? (
                    <>
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{order.phone || order.customer_email}</div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Guest ({order.phone || 'N/A'})</span>
                  )}
                </td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => openInvoice(order.id)} title="Invoice PDF">
                    <FileText className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      <div className="flex justify-center py-4">
        {isFetchingNextPage && <div className="animate-spin h-8 w-8 border-t-2 border-blue-500 rounded-full" />}
        {hasNextPage && !isFetchingNextPage && (
          <Button onClick={() => fetchNextPage()} variant="outline">Load More</Button>
        )}
        {!hasNextPage && allOrders.length > 0 && (
          <p className="text-muted-foreground text-sm">All orders loaded ({totalCount} total)</p>
        )}
      </div>
    </div>
  );
}
