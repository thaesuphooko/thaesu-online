'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`/api/vendor/orders?status=${statusFilter}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => toast.error('Failed to load orders'));
  }, [statusFilter]);

  const updateOrderStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/vendor/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId, status: newStatus }),
    });
    if (res.ok) {
      toast.success('Order status updated');
      setOrders(prev => prev.map(o => o.id === orderId ? {...o, status: newStatus} : o));
    }
  };

  const statusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'processing': return 'bg-blue-500/20 text-blue-400';
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="flex gap-2 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
   
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {orders.map(order => (
          <div key={order.id} className="bg-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex-1">
              <div className="font-medium text-white">{order.customer_name || 'Customer'}</div>
              <div className="text-sm text-zinc-400">Order #{order.id?.slice(0,8)} • {new Date(order.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-bold text-white">${order.total}</div>
                <div className="text-xs text-zinc-400">{order.items_count || 0} items</div>
              </div>
              <Badge className={`${statusColor(order.status)} capitalize`}>{order.status}</Badge>
              {order.status === 'pending' && (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => updateOrderStatus(order.id, 'processing')} className="bg-blue-600 text-xs">Accept</Button>
                  <Button size="sm" onClick={() => updateOrderStatus(order.id, 'cancelled')} className="bg-red-600 text-xs">Cancel</Button>
                </div>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-zinc-500 text-center py-10">No orders found.</p>}
      </div>
    </div>
  );
}
