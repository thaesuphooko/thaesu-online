export const dynamic = 'force-dynamic';
import { useSearchParams } from 'next/navigation';
import FakeDeliveryMap from '@/components/organisms/FakeDeliveryMap';
import Link from 'next/link';

export default function OrderTrackingPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  if (!orderId) {
    return (
      <div className="max-w-2xl mx-auto p-4 py-8 animate-fadeIn text-center">
        <div className="glass-card p-8 space-y-4">
          <h1 className="text-3xl font-bold">No Order Found</h1>
          <p className="text-muted-foreground">You need an order ID to track your delivery.</p>
          <div className="flex gap-4 justify-center mt-4">
            <Link href="/products" className="px-6 py-2 bg-primary text-primary-foreground rounded-xl">
              Shop Now
            </Link>
            <Link href="/cart" className="px-6 py-2 bg-secondary rounded-xl">
              View Cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 py-8 animate-fadeIn">
      <h1 className="text-3xl font-bold mb-6">Order Tracking</h1>
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Order #{orderId.slice(0,8)}</p>
            <p className="font-semibold">Estimated delivery: 15-25 min</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">On the way</span>
        </div>
      </div>
      <FakeDeliveryMap />
    </div>
  );
}
