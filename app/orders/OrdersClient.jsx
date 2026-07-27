'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Package, Clock, CheckCircle2, XCircle, Truck, Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  pending:    { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Pending' },
  processing: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Processing' },
  shipped:    { icon: Truck, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Shipped' },
  delivered:  { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Delivered' },
  cancelled:  { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Cancelled' },
};

export default function OrdersClient({ orders: initialOrders }) {
  const [expandedId, setExpandedId] = useState(null);

  if (initialOrders.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="glass-card p-12 rounded-3xl">
          <ShoppingBag className="w-20 h-20 text-zinc-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">No orders yet</h2>
          <p className="text-zinc-400 mb-8">Looks like you haven't placed any orders yet.</p>
          <Link href="/products">
            <Button size="lg" className="gap-2"><ExternalLink className="w-4 h-4" /> Start Shopping</Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-purple-400" />
          My Orders
          <Badge variant="secondary" className="ml-2">{initialOrders.length}</Badge>
        </h1>
      </motion.div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {initialOrders.map((order, index) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isExpanded = expandedId === order.id;

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="glass-card border-white/10 hover:border-purple-500/30 transition-all duration-300 overflow-hidden">
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${status.bg}`}>
                          <StatusIcon className={`w-6 h-6 ${status.color}`} />
                        </div>
                        <div>
                          <p className="text-sm text-zinc-500 font-mono">#{order.id.slice(0, 8)}…</p>
                          <p className="text-lg font-bold text-white">${Number(order.total_amount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <Badge className={`${status.bg} ${status.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" /> {status.label}
                          </Badge>
                          <p className="text-xs text-zinc-500 mt-1">{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        </div>
                        <div className="text-zinc-400">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-2 border-t border-white/10 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-zinc-500">Status</p>
                              <Badge className={`${status.bg} ${status.color} mt-1`}>{status.label}</Badge>
                            </div>
                            <div>
                              <p className="text-zinc-500">Payment</p>
                              <p className="text-white capitalize">{order.payment_status || 'unpaid'}</p>
                            </div>
                            <div>
                              <p className="text-zinc-500">Items</p>
                              <p className="text-white">{order.item_count}</p>
                            </div>
                            <div>
                              <p className="text-zinc-500">Order Date</p>
                              <p className="text-white">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-zinc-400 mb-2">Items</p>
                            <div className="space-y-1">
                              {order.items && order.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm text-zinc-300">
                                  <span>{item.title} ×{item.quantity}</span>
                                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-3 justify-end">
                            {order.status === 'pending' && (
                              <Button variant="outline" size="sm" className="text-red-400 hover:text-red-600">
                                <XCircle className="w-4 h-4 mr-1" /> Cancel Order
                              </Button>
                            )}
                            <Link href={`/order-tracking?orderId=${order.id}`}>
                              <Button size="sm"><Truck className="w-4 h-4 mr-1" /> Track Order</Button>
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
