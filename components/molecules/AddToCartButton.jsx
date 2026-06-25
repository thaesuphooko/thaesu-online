'use client';
import useCartStore from '@/store/cartStore';

export default function AddToCartButton({ product }) {
  const addItem = useCartStore((s) => s.addItem);
  return (
    <button
      onClick={() => addItem(product)}
      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition active:scale-95"
    >
      Add to Cart
    </button>
  );
}
