'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useCartStore from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function StickyBottomBar({ product }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [urgentMsg, setUrgentMsg] = useState('');
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    const messages = [
      '🔥 5 people are viewing this item right now',
      '⏰ Free shipping if you order within 5 minutes',
      '📦 Only few left in stock!',
      '💨 Fast delivery available',
    ];
    let i = 0;
    const interval = setInterval(() => {
      setUrgentMsg(messages[i % messages.length]);
      i++;
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleBuyNow = async () => {
    if (!phone.trim()) return toast.error('Please enter your phone number');
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ product_id: product.id, title: product.title, price: product.price, quantity: 1 }],
          total_amount: product.price,
          phone,
          shipping_address: { address },
        }),
      });
      const data = await res.json();
      if (data.order_id) {
        toast.success('Order placed!');
        setShowCheckout(false);
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="sticky bottom-16 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-border px-4 py-2 space-y-2">
        {/* Urgency text */}
        {urgentMsg && (
          <p className="text-[10px] text-center text-rose-500 font-medium animate-pulse">{urgentMsg}</p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => { addItem(product); toast.success('Added to cart'); }}
          >
            Add to Cart
          </Button>
          <Button
            className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
            onClick={() => setShowCheckout(true)}
          >
            Buy Now
          </Button>
        </div>
      </div>

      {/* Mini Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Quick Checkout</h2>
              <button onClick={() => setShowCheckout(false)} className="text-muted-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 relative rounded-xl overflow-hidden bg-gray-200 shrink-0">
                  <Image src={product.media?.[0]?.url || '/placeholder.jpg'} alt="" fill className="object-cover" />
                </div>
                <div>
                  <p className="font-semibold text-sm line-clamp-2">{product.title}</p>
                  <p className="text-lg font-bold text-rose-500">{parseFloat(product.price).toLocaleString()} Ks</p>
                </div>
              </div>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number *" type="tel" />
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Delivery address (optional)" />
              <Button onClick={handleBuyNow} disabled={loading} className="w-full">
                {loading ? 'Placing Order...' : `Confirm Order – ${parseFloat(product.price).toLocaleString()} Ks`}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
