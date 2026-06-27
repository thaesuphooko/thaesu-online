'use client';
import { useState } from 'react';
import useCartStore from '@/store/cartStore';
import { Button } from '@/components/ui/button';

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCartStore();
  const [step, setStep] = useState('summary'); // summary, timer, upload, done
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [timerExpiry, setTimerExpiry] = useState(null);
  const [timerLeft, setTimerLeft] = useState('');
  const [screenshot, setScreenshot] = useState(null);

  const finalTotal = totalAmount();

  const placeOrder = async () => {
    if (!phone.trim()) return alert('Please enter your phone number');
    setStep('timer');
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, total_amount: finalTotal, shipping_address: {}, phone, wave_transaction_id: 'manual' }),
    });
    const data = await res.json();
    if (data.order_id) {
      setOrderId(data.order_id);
      setTimerExpiry(new Date(data.timer_expiry));
      startTimer(new Date(data.timer_expiry));
    } else {
      alert('Order failed');
      setStep('summary');
    }
  };

  const startTimer = (expiry) => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiry - now;
      if (diff <= 0) {
        clearInterval(interval);
        setTimerLeft('00:00');
        setStep('expired');
      } else {
        const min = Math.floor(diff / 60000);
        const sec = Math.floor((diff % 60000) / 1000);
        setTimerLeft(`${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`);
      }
    }, 1000);
  };

  const uploadScreenshot = async () => {
    if (!screenshot || !orderId) return;
    const formData = new FormData();
    formData.append('file', screenshot);
    const res = await fetch(`/api/orders/${orderId}/upload`, { method: 'POST', body: formData });
    if (res.ok) {
      setStep('done');
      clearCart();
    } else {
      alert('Upload failed');
    }
  };

  if (items.length === 0 && step === 'summary') return <div className="p-8 text-center">Your cart is empty.</div>;

  return (
    <div className="max-w-md mx-auto p-4 py-8 animate-fadeIn">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      {/* Step 1: Order Summary & Phone */}
      {step === 'summary' && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold">Order Summary</h2>
          <div className="text-2xl font-bold">{finalTotal.toLocaleString()} Ks</div>
          <p className="text-sm text-muted-foreground">Refund & Exchange Policy: 7-day return policy.</p>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone number" className="w-full p-2 border rounded" />
          <Button onClick={placeOrder} className="w-full">ဝယ်ယူမည်</Button>
        </div>
      )}

      {/* Step 2: Timer & WavePay Info */}
      {step === 'timer' && (
        <div className="glass-card p-6 space-y-4 text-center">
          <div className="text-4xl font-mono font-bold">{timerLeft}</div>
          <p>Please transfer <b>{finalTotal.toLocaleString()} Ks</b> to WavePay: <b>097xxxxxxxx</b></p>
          <p className="text-xs text-muted-foreground">After payment, upload screenshot below.</p>
          <input type="file" accept="image/*" onChange={e => setScreenshot(e.target.files[0])} />
          {screenshot && <img src={URL.createObjectURL(screenshot)} alt="preview" className="max-h-40 mx-auto rounded" />}
          <Button onClick={uploadScreenshot} disabled={!screenshot}>Confirm Payment</Button>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <div className="glass-card p-6 text-center">
          <p className="text-green-600 font-semibold">ကျေးဇူးတင်ပါသည်၊ Admin မှ စစ်ဆေးနေပါသည်။</p>
        </div>
      )}

      {/* Expired */}
      {step === 'expired' && (
        <div className="glass-card p-6 text-center text-red-500">
          <p>Order expired. Please try again.</p>
          <Button onClick={() => { setStep('summary'); clearCart(); }} className="mt-4">Go Back</Button>
        </div>
      )}
    </div>
  );
}
