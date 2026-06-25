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
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [shippingCost, setShippingCost] = useState(0);

  const finalTotal = Math.max(totalAmount() - discount + shippingCost, 0);

  const applyCoupon = async () => { /* same as before, omitted for brevity */ };

  const calculateShipping = async () => {
    if (!address) return 0;
    // Simple matching: extract first word of region (e.g., Yangon)
    const region = address.split(',')[0].trim();
    const res = await fetch('/api/admin/shipping?search=' + region, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const zones = await res.json();
      if (zones.length > 0) setShippingCost(zones[0].price);
      else setShippingCost(0);
    }
  };

  const handleOrder = async () => {
    setLoading(true);
    await calculateShipping(); // ensure shipping is set
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items, total_amount: finalTotal, shipping_address: { address }, wave_transaction_id: 'demo_wave_' + Date.now(), coupon_code: couponCode || undefined })
    });
    const data = await res.json();
    if (res.ok) { clearCart(); router.push(`/order-tracking?id=${data.order_id}`); }
    else alert('Order failed: ' + data.error);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      <div className="glass-card p-6 space-y-4">
        <div>
          <label className="block mb-1 text-sm font-medium">Your JWT Token</label>
          <input type="text" value={token} onChange={e => setToken(e.target.value)} className="w-full p-2 border rounded" placeholder="Paste your token..." />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium">Delivery Address (e.g., Yangon, Downtown)</label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} onBlur={calculateShipping} className="w-full p-2 border rounded" />
          {shippingCost > 0 && <p className="text-sm text-green-600 mt-1">Shipping: {shippingCost} Ks</p>}
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium">Coupon Code (optional)</label>
          <div className="flex gap-2">
            <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} className="flex-1 p-2 border rounded" />
            <button onClick={applyCoupon} className="px-4 py-2 bg-purple-600 text-white rounded">Apply</button>
          </div>
          {couponError && <p className="text-red-500 text-sm mt-1">{couponError}</p>}
          {discount > 0 && <p className="text-green-600 text-sm mt-1">Discount: -{discount.toLocaleString()} Ks</p>}
        </div>
        <div className="text-2xl font-bold">Total: {finalTotal.toLocaleString()} Ks</div>
        <button onClick={handleOrder} disabled={loading} className="w-full px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50">
          {loading ? 'Placing Order...' : 'Place Order (Mock Wave Pay)'}
        </button>
      </div>
    </div>
  );
}
