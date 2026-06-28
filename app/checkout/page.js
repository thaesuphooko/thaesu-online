'use client';
import { useState } from 'react';
import useCartStore from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCartStore();
  const [phone, setPhone] = useState('');
  const [giftWrap, setGiftWrap] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const finalTotal = totalAmount() + (giftWrap ? 1000 : 0);

  const placeOrder = async () => {
    if (!phone.trim()) return alert('Please enter your phone number');
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, total_amount: finalTotal, phone, gift_wrap: giftWrap }),
      });
      const data = await res.json();
      if (data.order_id) {
        clearCart();
        router.push(`/order-tracking?id=${data.order_id}`);
      } else {
        alert('Order failed');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 py-8 animate-fadeIn">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      <div className="glass-card p-6 space-y-4">
        <div className="text-2xl font-bold">Total: {finalTotal.toLocaleString()} Ks</div>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone number" className="w-full p-2 border rounded" />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={giftWrap} onChange={e => setGiftWrap(e.target.checked)} />
          Gift Wrap (+1,000 Ks)
        </label>
        <Button onClick={placeOrder} disabled={loading} className="w-full">
          {loading ? 'Placing Order...' : 'Place Order'}
        </Button>
      </div>
    </div>
  );
}
