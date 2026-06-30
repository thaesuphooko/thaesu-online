'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sun, Moon, ShoppingCart, User, Search } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/products' },
  { label: 'Cart', href: '/cart', icon: ShoppingCart },
  { label: 'Dashboard', href: '/dashboard' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('themePreference');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
      setDark(true);
    }
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('themePreference', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-3 mt-3 px-4 py-2.5 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <Link href="/" className="text-xl font-extrabold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
            Thaesu
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {item.icon && <item.icon className="w-4 h-4 inline mr-1" />}
                {item.label}
                {pathname === item.href && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-rose-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/profile" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <User className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
