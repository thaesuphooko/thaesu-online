'use client';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import { RefreshCw, Download, FileText, Eye, Search } from 'lucide-react';

const ROW_HEIGHT = 64;
const OVERSCAN = 5;

// Simple virtual scroll hook (same as before)
function useVirtualScroll(items, ref) {
  const [scrollTop, setScrollTop] = useState(0);
  const [h, setH] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setH(entries[0].contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const onScroll = useCallback(() => {
    if (ref.current) setScrollTop(ref.current.scrollTop);
  }, []);
  const totalH = items.length * ROW_HEIGHT;
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(items.length - 1, Math.floor((scrollTop + h) / ROW_HEIGHT) + OVERSCAN);
  return { totalH, start, visible: items.slice(start, end + 1), onScroll };
}

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState([]);
  const [detailOrder, setDetailOrder] = useState(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const containerRef = useRef(null);

  // Fetch orders with filters
  const { data: ordersRaw, isLoading, refetch } = useQuery({
    queryKey: ['adminOrders', search, statusFilter, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      return adminFetch(`/api/admin/orders?${params}`).then(r => r.json());
    },
  });

  const orders = Array.isArray(ordersRaw) ? ordersRaw : [];

  // Filtering is done server-side, so just display.

  const { totalH, start, visible, onScroll } = useVirtualScroll(orders, containerRef);

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const updateStatus = async (orderId, newStatus) => {
    await adminFetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
      headers: { 'Content-Type': 'application/json' },
    });
    refetch();
    toast.success(`Order ${orderId.slice(0,8)} → ${newStatus}`);
  };

  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.length === 0) return;
    await adminFetch('/api/admin/orders/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ ids: selected, status: bulkStatus }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success(`Updated ${selected.length} orders`);
    setSelected([]);
    refetch();
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    window.open(`/api/admin/orders/export?${params}`, '_blank');
  };

  const viewDetail = async (orderId) => {
    const res = await adminFetch(`/api/admin/orders/${orderId}`);
    const data = await res.json();
    setDetailOrder(data);
  };

  if (isLoading) return <div className="flex justify-center py-20 text-white">Loading orders...</div>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center bg-black/20 backdrop-blur p-2 rounded-xl border border-white/10">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ID / Customer..." className="max-w-[150px] h-8 text-xs bg-white/5 border-white/10" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[100px] h-8 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs bg-white/5 border border-white/10 rounded px-2 text-white" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs bg-white/5 border border-white/10 rounded px-2 text-white" />
        <div className="flex-1" />
        <span className="text-xs text-zinc-400">{orders.length} orders</span>
        <Button onClick={() => refetch()} variant="ghost" size="sm" className="h-8"><RefreshCw className="w-3 h-3 mr-1"/>Refresh</Button>
        <Button onClick={exportCSV} variant="ghost" size="sm" className="h-8"><Download className="w-3 h-3 mr-1"/>CSV</Button>
        {selected.length > 0 && (
          <>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-[110px] h-8 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Bulk Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirm</SelectItem>
                <SelectItem value="shipped">Ship</SelectItem>
                <SelectItem value="delivered">Deliver</SelectItem>
                <SelectItem value="cancelled">Cancel</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={applyBulkStatus} disabled={!bulkStatus} variant="secondary" size="sm" className="h-8">Apply</Button>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1 text-xs text-zinc-500 bg-white/5 rounded-lg">
        <Checkbox checked={selected.length === orders.length && orders.length > 0} onCheckedChange={() => setSelected(selected.length === orders.length ? [] : orders.map(o => o.id))} />
        <div className="flex-1">Order / Customer</div>
        <div className="w-24 text-right">Amount</div>
        <div className="w-24 text-center">Status</div>
        <div className="w-20 text-right">Actions</div>
      </div>

      {/* Virtual Scroll Container */}
      <div ref={containerRef} onScroll={onScroll} className="overflow-auto relative rounded-xl border border-white/10 bg-black/20 backdrop-blur" style={{height:'calc(100vh - 220px)'}}>
        <div style={{height: totalH, position:'relative'}}>
          <div style={{position:'absolute', top: start*ROW_HEIGHT, left:0, right:0}}>
            {visible.map(order => (
              <div key={order.id} style={{height: ROW_HEIGHT}} className="flex items-center gap-2 px-2 border-b border-white/5 hover:bg-white/5 transition">
                <Checkbox checked={selected.includes(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{order.user_name || 'Guest'} – #{order.id.slice(0,8)}</div>
                  <div className="text-xs text-zinc-400">{new Date(order.created_at).toLocaleDateString()}</div>
                </div>
                <div className="w-24 text-right text-sm text-purple-300">{parseFloat(order.total_amount).toLocaleString()} Ks</div>
                <div className="w-24 text-center">
                  <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                    <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 text-right flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => viewDetail(order.id)} title="View Details"><Eye className="w-4 h-4 text-blue-400" /></Button>
                  <a href={`/api/admin/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon" title="Invoice"><FileText className="w-4 h-4 text-green-400" /></Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Detail Dialog */}
      {detailOrder && (
        <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
          <DialogContent className="max-w-2xl bg-black/90 backdrop-blur-xl border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Order #{detailOrder.id.slice(0,8)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-400">Customer</p>
                  <p className="font-medium">{detailOrder.user_name || 'Guest'}</p>
                  {detailOrder.user_phone && <p className="text-xs text-zinc-400">{detailOrder.user_phone}</p>}
                </div>
                <div>
                  <p className="text-zinc-400">Status</p>
                  <Badge className="capitalize">{detailOrder.status}</Badge>
                </div>
                <div>
                  <p className="text-zinc-400">Date</p>
                  <p>{new Date(detailOrder.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Total</p>
                  <p className="text-purple-300 font-bold">{parseFloat(detailOrder.total_amount).toLocaleString()} Ks</p>
                </div>
              </div>
              {detailOrder.shipping_address && (
                <div>
                  <p className="text-zinc-400">Shipping Address</p>
                  <p className="text-sm">{detailOrder.shipping_address}</p>
                </div>
              )}
              {detailOrder.items && detailOrder.items.length > 0 && (
                <div>
                  <p className="text-zinc-400 mb-2">Order Items</p>
                  <div className="space-y-2">
                    {detailOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between bg-white/5 p-2 rounded text-sm">
                        <span>{item.product_title || `Product ${item.product_id}`} x {item.quantity}</span>
                        <span className="text-purple-300">{parseFloat(item.price).toLocaleString()} Ks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <a href={`/api/admin/orders/${detailOrder.id}/invoice`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="border-white/10"><FileText className="w-4 h-4 mr-2"/> Download Invoice</Button>
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
