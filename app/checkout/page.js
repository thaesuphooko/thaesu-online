'use client';
import { useState } from 'react';
import useCartStore from '@/store/cartStore';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCartStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [token, setToken] = useState('');

  const handleOrder = async () => {
    setLoading(true);
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items,
        total_amount: totalAmount(),
        shipping_address: { address },
        wave_transaction_id: 'demo_wave_' + Date.now(),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      clearCart();
      router.push(`/order-tracking?id=${data.order_id}`);
    } else {
      alert('Order failed: ' + data.error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      <div className="glass-card p-6">
        <label className="block mb-2 text-sm font-medium">Your JWT Token (for demo)</label>
        <input type="text" value={token} onChange={e => setToken(e.target.value)} className="w-full p-2 rounded border mb-4" placeholder="Paste your token..." />
        <label className="block mb-2 text-sm font-medium">Delivery Address</label>
        <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 rounded border mb-4" placeholder="Enter your address..." />
        <div className="text-2xl font-bold mb-4">Total: {totalAmount().toLocaleString()} Ks</div>
        <button onClick={handleOrder} disabled={loading} className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50">
          {loading ? 'Placing Order...' : 'Place Order (Mock Wave Pay)'}
        </button>
      </div>
    </div>
  );
}
