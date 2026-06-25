'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (orderId) {
      fetch(`/api/orders/${orderId}`).then(res => res.json()).then(data => {
        setOrder(data);
        let p = data.status === 'delivering' ? 50 : data.status === 'delivered' ? 100 : 10;
        setProgress(p);
        if (data.status === 'delivering') {
          const interval = setInterval(() => {
            setProgress(prev => {
              if (prev >= 100) { clearInterval(interval); return 100; }
              return prev + 2;
            });
          }, 300);
          return () => clearInterval(interval);
        }
      });
    }
  }, [orderId]);

  if (!order) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Order Tracking</h1>
      <div className="glass-card p-6 mb-6">
        <p>Order ID: {order.id}</p>
        <p>Status: {order.status}</p>
        <p>Estimated Delivery: 30-45 min</p>
      </div>
      <div className="relative w-full h-[400px] bg-cover bg-center rounded-xl overflow-hidden border"
        style={{ backgroundImage: 'url(https://staticmap.openstreetmap.de/staticmap.php?center=16.8409,96.1735&zoom=14&size=800x400&maptype=mapnik)' }}
      >
        <div className="absolute" style={{ left: `${10 + progress * 0.6}%`, bottom: `${20 + Math.sin(progress * 0.1) * 10}%`, transition: 'left 1s, bottom 1s' }}>
          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-xl animate-bounce shadow-lg">
            ❤️
          </div>
        </div>
        <div className="absolute bottom-10 left-5 text-sm bg-white px-2 py-1 rounded shadow">🏪 Store</div>
        <div className="absolute top-10 right-5 text-sm bg-white px-2 py-1 rounded shadow">🏠 You</div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading tracking...</div>}>
      <OrderTrackingContent />
    </Suspense>
  );
}
