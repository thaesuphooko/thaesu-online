'use client';
import useCartStore from '@/store/cartStore';

export default function AddToCartButton({ product }) {
  const addItem = useCartStore((s) => s.addItem);
  return (
    <button
      onClick={() => addItem(product)}
      className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-all active:scale-95 text-lg font-semibold shadow-md"
    >
      Add to Cart
    </button>
  );
}
