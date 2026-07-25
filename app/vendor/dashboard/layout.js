'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Store, Package, ShoppingCart, DollarSign, Settings, LogOut, Loader2,
  Menu, X, Bell, ChevronDown, PanelLeftClose, PanelLeftOpen, User
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { href: '/vendor/dashboard', label: 'ထိန်းချုပ်ရန်', icon: Store },
  { href: '/vendor/dashboard/products', label: 'ပစ္စည်းများ', icon: Package },
  { href: '/vendor/dashboard/orders', label: 'အော်ဒါများ', icon: ShoppingCart },
  { href: '/vendor/dashboard/payouts', label: 'ငွေထုတ်ရန်', icon: DollarSign },
  { href: '/vendor/dashboard/settings', label: 'ဆက်တင်များ', icon: Settings },
];

export default function VendorLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchVendor = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/vendor/login'); return; }
    try {
      const res = await fetch('/api/vendor/me', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setVendor(data);
      if (data.status === 'approved') {
        // Fetch notifications (mock)
        setUnreadCount(3); // Replace with real API
      }
    } catch {
      localStorage.removeItem('token'); localStorage.removeItem('user');
      router.replace('/vendor/login');
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchVendor(); }, [fetchVendor]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('အကောင့်ထွက်ပြီးပါပြီ');
    router.replace('/vendor/login');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-2xl border-b border-white/10 px-4 py-3 flex items-center gap-4">
        <button className="lg:hidden p-1.5 rounded-lg hover:bg-white/10" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <button className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>
        <div className="flex-1" />
        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg hover:bg-white/10" onClick={() => setNotificationsOpen(!notificationsOpen)}>
          <Bell className="w-5 h-5 text-zinc-400" />
          {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{unreadCount}</span>}
        </button>
        {/* User Menu */}
        <div className="relative">
          <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">{vendor?.name?.[0] || 'V'}</div>
            <div className="hidden md:block text-left"><p className="text-sm text-white">{vendor?.name}</p><p className="text-xs text-zinc-400">Vendor</p></div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-2 z-50">
              <Link href="/vendor/dashboard/settings" className="block px-3 py-2 text-sm hover:bg-zinc-800 rounded-lg">Settings</Link>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 rounded-lg">Logout</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {mobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
        {/* Sidebar */}
        <motion.aside animate={{ width: sidebarOpen ? 240 : 0, opacity: sidebarOpen ? 1 : 0 }} transition={{ duration: 0.2 }}
          className={`bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-800 overflow-hidden ${mobileMenuOpen ? 'fixed inset-y-0 left-0 z-40 w-60' : 'hidden lg:block'}`}>
          <div className="p-5">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Vendor Hub</h2>
          </div>
          <nav className="px-3 space-y-1">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${pathname === item.href ? 'bg-purple-600/20 text-purple-300' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                <item.icon className="w-5 h-5" /> {item.label}
              </Link>
            ))}
          </nav>
        </motion.aside>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
