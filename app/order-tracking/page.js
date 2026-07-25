'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Home, CheckCircle, Clock, Loader2, MapPin } from 'lucide-react';

const DeliveryMap = dynamic(() => import('@/components/organisms/DeliveryMap'), {
  ssr: false,
  loading: () => <div className="h-80 bg-zinc-800 rounded-2xl animate-pulse flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
});

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    const fetchOrder = async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/orders/${orderId}`, { headers });
      const data = await res.json();
      setOrder(data);
      setLoading(false);
    };
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    const steps = ['confirmed', 'processing', 'shipped', 'delivered'];
    const now = Date.now();
    const created = new Date(order.created_at).getTime();
    const delivered = order.delivered_at ? new Date(order.delivered_at).getTime() : Date.now();
    const totalDuration = delivered - created || 1;
    const elapsed = now - created;
    const pct = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    setProgress(pct);
  }, [order]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-purple-400" /></div>;
  if (!orderId || !order) {
    return (
      <div className="max-w-2xl mx-auto p-4 py-20 text-center">
        <div className="glass-card p-8 space-y-4">
          <h1 className="text-3xl font-bold">No Order Found</h1>
          <p className="text-muted-foreground">You need an order ID to track your delivery.</p>
          <div className="flex gap-4 justify-center mt-4">
            <Link href="/products" className="px-6 py-2 bg-primary text-primary-foreground rounded-xl">Shop Now</Link>
            <Link href="/cart" className="px-6 py-2 bg-secondary rounded-xl">View Cart</Link>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 'confirmed', label: 'Order Confirmed', icon: CheckCircle, time: 'Just now' },
    { id: 'processing', label: 'Processing', icon: Package, time: '~3 hours' },
    { id: 'shipped', label: 'On the way', icon: Truck, time: '~12 hours' },
    { id: 'delivered', label: 'Delivered', icon: Home, time: '~2 days' },
  ];

  const currentStepIdx = steps.findIndex(s => s.id === order.status);
  const isDelivered = order.status === 'delivered';

  return (
    <div className="max-w-4xl mx-auto p-4 py-8 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Tracking</h1>
          <p className="text-zinc-400 text-sm">Order #{order.id.slice(0,8)}</p>
        </div>
        <Badge className={`capitalize ${isDelivered ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>
          {order.status}
        </Badge>
      </div>

      {/* Timeline */}
      <div className="glass-card p-6">
        <div className="relative">
          <div className="absolute top-5 left-0 w-full h-1.5 bg-zinc-700 rounded-full z-0">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between relative z-10">
            {steps.map((step, idx) => {
              const isCompleted = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isCompleted
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-zinc-700 text-zinc-500'
                    } ${isCurrent ? 'ring-4 ring-purple-500/30 scale-110' : ''}`}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <p className={`text-xs mt-2 text-center font-medium ${isCompleted ? 'text-white' : 'text-zinc-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{step.time}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Map */}
      <div className="glass-card overflow-hidden rounded-2xl">
        <DeliveryMap order={order} />
      </div>

      {/* Order Summary */}
      <div className="glass-card p-4">
        <h3 className="font-bold mb-2 flex items-center gap-2"><Package className="w-5 h-5 text-purple-400" /> Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-400">Subtotal</span><span>{parseFloat(order.total_amount).toLocaleString()} Ks</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Shipping</span><span>Free</span></div>
          <div className="flex justify-between font-bold border-t border-zinc-700 pt-2"><span>Total</span><span className="text-purple-300">{parseFloat(order.total_amount).toLocaleString()} Ks</span></div>
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-purple-400" /></div>}>
      <OrderTrackingContent />
    </Suspense>
  );
}
