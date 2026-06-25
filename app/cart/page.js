'use client';
import useCartStore from '@/store/cartStore';
import Link from 'next/link';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e2e8f0%22 width=%22100%22 height=%22100%22/%3E%3Ctext fill=%22%2394a3b8%22 font-size=%2210%22 dy=%221.5%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22%3ENo Img%3C/text%3E%3C/svg%3E';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const totalAmount = useCartStore((s) => s.totalAmount);

  if (items.length === 0) return <div className="text-center py-12">Your cart is empty.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      <div className="space-y-4">
        {items.map((item) => {
          const imgSrc = item.image || PLACEHOLDER_IMAGE;
          return (
            <div key={item.product_id} className="glass-card p-4 flex items-center gap-4">
              <img src={imgSrc} alt={item.title} className="w-20 h-20 object-cover rounded-lg" />
              <div className="flex-1">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.price.toLocaleString()} Ks</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="px-2 py-1 bg-gray-200 rounded">-</button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="px-2 py-1 bg-gray-200 rounded">+</button>
              </div>
              <p className="font-bold w-24 text-right">{(item.price * item.quantity).toLocaleString()} Ks</p>
              <button onClick={() => removeItem(item.product_id)} className="text-red-500">✕</button>
            </div>
          );
        })}
      </div>
      <div className="mt-8 text-right">
        <p className="text-2xl font-bold">Total: {totalAmount().toLocaleString()} Ks</p>
        <Link href="/checkout" className="mt-4 inline-block px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700">
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
