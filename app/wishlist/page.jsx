"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    loadWishlist();
    window.addEventListener('wishlistUpdated', loadWishlist);
    return () => window.removeEventListener('wishlistUpdated', loadWishlist);
  }, []);

  const loadWishlist = () => {
    const items = JSON.parse(localStorage.getItem('wishlist') || '[]');
    setWishlist(items);
  };

  const removeItem = (id) => {
    const updated = wishlist.filter(item => item.id !== id);
    localStorage.setItem('wishlist', JSON.stringify(updated));
    setWishlist(updated);
    window.dispatchEvent(new Event('wishlistUpdated'));
  };

  const moveToCart = (item) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(c => c.id === item.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...item, quantity: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    removeItem(item.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white p-4 pt-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2"><Heart className="w-8 h-8 text-red-400" /> My Wishlist</h1>
          <Link href="/products" className="text-purple-400 hover:underline flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to Shop</Link>
        </div>

        {wishlist.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-gray-400">
            <Heart className="w-20 h-20 mx-auto mb-4 text-gray-600" />
            <p className="text-xl mb-4">Your wishlist is empty</p>
            <Link href="/products" className="inline-block px-6 py-3 bg-purple-600 rounded-xl font-bold hover:bg-purple-700 transition">Browse Products</Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {wishlist.map(item => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                  <Image src={item.image} alt={item.title} fill className="object-cover" unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.slug || item.id}`} className="text-white font-medium hover:text-purple-400 transition truncate block">{item.title}</Link>
                  <p className="text-purple-400 font-bold mt-1">${parseFloat(item.price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => moveToCart(item)} className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 transition" title="Move to cart"><ShoppingCart className="w-5 h-5" /></button>
                  <button onClick={() => removeItem(item.id)} className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 transition text-red-400"><Trash2 className="w-5 h-5" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
