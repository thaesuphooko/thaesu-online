"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function CartPage() {
  const [cartItems, setCartItems] = useState([]);

  // Function to load cart from localStorage
  const loadCart = useCallback(() => {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartItems(cart);
    } catch (e) {
      setCartItems([]);
    }
  }, []);

  useEffect(() => {
    // Load cart on mount
    loadCart();
    // Listen for cart updates
    window.addEventListener('cartUpdated', loadCart);
    return () => window.removeEventListener('cartUpdated', loadCart);
  }, [loadCart]);

  const updateQuantity = (productId, newQty) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const updated = cart.map(item => {
      if (item.id === productId) {
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    });
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeItem = (productId) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const updated = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🛒 Your Cart</h1>
        {cartItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">Your cart is empty.</p>
            <Link href="/products" className="text-purple-400 hover:underline mt-4 inline-block">Continue Shopping</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                  <Image src={item.image || '/placeholder.jpg'} alt={item.title} fill className="object-cover" unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.slug || item.id}`} className="text-white font-medium hover:text-purple-400 transition line-clamp-2">
                    {item.title}
                  </Link>
                  <p className="text-purple-400 font-bold mt-1">${parseFloat(item.price).toFixed(2)}</p>
                </div>
                <div className="flex items-center border border-white/20 rounded-lg overflow-hidden">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 transition">-</button>
                  <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 transition">+</button>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-300 transition p-2">
                  🗑️
                </button>
              </div>
            ))}
            <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mt-6">
              <div>
                <p className="text-gray-400">Total</p>
                <p className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  ${totalAmount.toFixed(2)}
                </p>
              </div>
              <Link
                href="/checkout"
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-lg transition-all"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
