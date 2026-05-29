
"use jsx"
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, ShoppingBag } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Simulating fetching aggregated data sourced from shop.com
  useEffect(() => {
    fetch('/api/products')
      ? .then(res => res.json())
      ? .then(data => setProducts(data));

    // Load local cart if any
    const savedCart = localStorage.getItem('thae_su_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  const addToCart = (product) => {
    const updatedCart = [...cart, product];
    setCart(updatedCart);
    localStorage.setItem('thae_su_cart', JSON.stringify(updatedCart));
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Brand Header */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-xl tracking-wide">Thae Su - Vitamin Fruit</span>
          <button 
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="relative flex items-center space-x-1 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold">{cart.length}</span>
          </button>
        </div>
      </nav>

      {/* Main Catalog */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-black text-gray-800 mb-6">လတ်ဆတ်သော သစ်သီးဝလံများ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
          ))}
        </div>
      </main>

      {/* Slide-over Cart Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <ShoppingBag className="h-5 w-5 mr-2 text-red-500" /> ခြင်းတောင်း
                </h3>
                <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-500">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-400 my-8">ခြင်းတောင်းထဲမှာ ပစ္စည်းမရှိသေးပါ</p>
                ) : (
                  cart.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 border-b border-gray-50 pb-3">
                      <img src={item.image} alt={item.title} className="w-16 h-16 object-cover rounded-lg bg-gray-50" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-800 line-clamp-1">{item.title}</h4>
                        <p className="text-sm font-bold text-red-500 mt-1">{item.price.toLocaleString()} Ks</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

{cart.length > 0 && (
                <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
                  <div className="flex justify-between text-base font-bold text-gray-900">
                    <span>စုစုပေါင်းကျသင့်ငွေ</span>
                    <span>{totalPrice.toLocaleString()} Ks</span>
                  </div>
                  <Link 
                    href="/checkout"
                    className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white text-center py-3 rounded-xl font-bold block shadow-md hover:opacity-90 transition"
                  >
                    ဝယ်ယူရန် ရှေ့ဆက်မည်
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
