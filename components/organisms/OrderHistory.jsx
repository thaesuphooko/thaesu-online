'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Package, ChevronRight, Loader2 } from 'lucide-react';

function getToken() { return localStorage.getItem('token'); }

const statusColor = (status) => {
  switch(status) {
    case 'delivered': return 'bg-green-500/20 text-green-400';
    case 'shipped': return 'bg-blue-500/20 text-blue-400';
    case 'confirmed': return 'bg-purple-500/20 text-purple-400';
    case 'cancelled': return 'bg-red-500/20 text-red-400';
    default: return 'bg-yellow-500/20 text-yellow-400';
  }
};

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken(); if (!token) return;
    fetch('/api/user/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><Package className="w-5 h-5 text-purple-400" /> Recent Orders</h2>
      {orders.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No orders yet.</p>
          <Link href="/products" className="text-purple-400 text-sm hover:underline mt-2 inline-block">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Link key={order.id} href={`/order-tracking?id=${order.id}`} className="block bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-purple-500/30 transition">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-sm">Order #{order.id.slice(0,8)}</p>
                  <p className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <Badge className={`${statusColor(order.status)} capitalize`}>{order.status}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-purple-300 font-bold">{parseFloat(order.total_amount).toLocaleString()} Ks</span>
                <span className="flex items-center text-zinc-400 text-xs">View Details <ChevronRight className="w-3 h-3 ml-1" /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
