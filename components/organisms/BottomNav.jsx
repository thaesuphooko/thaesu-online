"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Heart, User, MessageCircle, Store } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  const updateCartCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const count = cart.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(count);
    } catch (e) {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    return () => window.removeEventListener('cartUpdated', updateCartCount);
  }, []);

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/products', icon: ShoppingBag, label: 'Shop' },
    { href: '/cart', icon: ShoppingBag, label: 'Cart', badge: cartCount },
    { href: '/wishlist', icon: Heart, label: 'Wishlist' },
    { href: '/profile', icon: User, label: 'Profile' },
    { href: '/chat', icon: MessageCircle, label: 'Chat' },
    { href: '/vendor/dashboard', icon: Store, label: 'Vendor' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card !rounded-none !border-b-0 !border-l-0 !border-r-0 border-t border-white/10 px-2 py-1">
      <div className="flex justify-around items-center max-w-7xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all relative ${
                isActive ? 'text-purple-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
