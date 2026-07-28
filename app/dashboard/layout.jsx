'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  LayoutDashboard, Package, ShoppingCart, TicketPercent, Store,
  BarChart3, Globe, Monitor, Wrench, HeartPulse, ShieldAlert,
  Bot, KeyRound, Activity, Settings, Send, Music, Users,
  ChevronDown, PanelLeftClose, PanelLeftOpen, Menu, X,
  BadgeCheck, Circle, FileText, Newspaper, LogOut, UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const queryClient = new QueryClient();

const menuCategories = [
  { id: 'main', items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }] },
  { id: 'ecommerce', label: 'E‑Commerce Management', icon: Package, items: [
      { name: 'Products', href: '/dashboard/products', icon: Package },
      { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
      { name: 'Coupons', href: '/dashboard/coupons', icon: TicketPercent },
      { name: 'Vendor Mgmt', href: '/dashboard/vendor-management', icon: Store },
      { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  ]},
  { id: 'automation', label: 'Automation & Scrapers', icon: Globe, items: [
      { name: 'Scrape', href: '/dashboard/scrape', icon: Globe },
      { name: 'Crawl', href: '/dashboard/crawl', icon: Globe },
      { name: 'Browser', href: '/dashboard/browser', icon: Monitor },
      { name: 'Catalog Sanitizer', href: '/dashboard/catalog-sanitizer', icon: Wrench },
  ]},
  { id: 'system', label: 'System & AI Security', icon: ShieldAlert, items: [
      { name: 'System Health', href: '/dashboard/health', icon: HeartPulse },
      { name: 'Error Bot', href: '/dashboard/error-bot', icon: ShieldAlert },
      { name: 'AI Chat', href: '/dashboard/ai-chat', icon: Bot },
      { name: 'Key Tester', href: '/dashboard/key-tester', icon: KeyRound },
      { name: 'Health Monitor', href: '/dashboard/health-monitor', icon: Activity },
  ]},
  { id: 'content', label: 'Content', icon: FileText, items: [
      { name: 'Feed Mgmt', href: '/dashboard/feed-management', icon: Newspaper },
      { name: 'Users', href: '/dashboard/users', icon: Users },
  ]},
  { id: 'settings', label: 'Global Settings', icon: Settings, items: [
      { name: 'Settings', href: '/dashboard/settings', icon: Settings },
      { name: 'Telegram Config', href: '/dashboard/telegram-config', icon: Send },
      { name: 'Music', href: '/dashboard/music', icon: Music },
  ]},
];

function AdminFooter() {
  const [admin, setAdmin] = useState(null);
  const [activeUsers, setActiveUsers] = useState(1); // Mock active users

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'admin') {
          setAdmin(payload);
          // In a real app, fetch active admin count from API
          setActiveUsers(Math.floor(Math.random() * 3) + 1); // Mock 1-3 active users
        }
      } catch (e) { /* invalid token */ }
    }
  }, []);

  if (!admin) return null;

  return (
    <div className="p-3 border-t border-white/10 space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5" /> {activeUsers} active
        </span>
        <span className="flex items-center gap-1">
          <Circle className="w-2 h-2 fill-green-400 text-green-400" /> Online
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/30">
          {admin.name?.[0] || admin.full_name?.[0] || 'A'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{admin.name || admin.full_name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <BadgeCheck className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] text-purple-400">Super Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState(menuCategories.map(c => c.id));
  const pathname = usePathname();
  const router = useRouter();

  const checkAuth = useCallback(() => {
    // 1. Hash check
    const hash = window.location.hash.substring(1);
    const stored = localStorage.getItem('adminSecret');
    const expected = process.env.NEXT_PUBLIC_ADMIN_HASH || 'step';
    if (hash === expected) {
      localStorage.setItem('adminSecret', expected);
      setAuthenticated(true);
      window.history.replaceState({}, '', window.location.pathname);
      return true;
    }
    if (stored === expected) {
      setAuthenticated(true);
      return true;
    }

    // 2. JWT admin token check with expiry validation
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.role === 'admin' && payload.exp > now) {
          setAuthenticated(true);
          return true;
        } else {
          // Token expired – clean up and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch {}
    }

    return false;
  }, []);

  useEffect(() => {
    if (checkAuth()) {
      setLoading(false);
    } else {
      router.replace('/auth/admin-login');
      setLoading(false);
    }
  }, [checkAuth, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminSecret');
    router.replace('/auth/admin-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!authenticated) return null;

  const toggleCategory = (id) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-black text-white flex">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 72 : 280 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            "fixed top-0 left-0 h-full z-50 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col lg:translate-x-0 lg:static lg:z-auto",
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            {!collapsed && (
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                King Panel v6.0
              </h1>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {menuCategories.map(category => (
              <div key={category.id}>
                {category.label && !collapsed && (
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition"
                  >
                    <span className="flex items-center gap-2">
                      {category.icon && <category.icon className="w-4 h-4" />}
                      {category.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        expandedCategories.includes(category.id) ? 'rotate-0' : '-rotate-90'
                      )}
                    />
                  </button>
                )}
                {category.label && collapsed ? (
                  <div className="flex justify-center py-1">
                    {category.icon && <category.icon className="w-5 h-5 text-zinc-500" />}
                  </div>
                ) : null}

                <AnimatePresence>
                  {(collapsed || expandedCategories.includes(category.id)) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {category.items.map(item => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                              isActive
                                ? 'bg-purple-600/20 text-purple-400 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.2)]'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                            )}
                          >
                            <div className="relative shrink-0">
                              <item.icon className={cn(
                                "w-5 h-5 transition-transform group-hover:scale-110",
                                isActive && 'drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                              )} />
                            </div>
                            {!collapsed && (
                              <span className="truncate flex-1">{item.name}</span>
                            )}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-2 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && 'Sign Out'}
            </button>
          </div>

          {!collapsed && <AdminFooter />}
        </motion.aside>

        <div className="flex-1 lg:pl-[var(--sidebar-width)] min-w-0">
          <header className="sticky top-0 z-30 bg-black/20 backdrop-blur-xl border-b border-white/10 p-4 flex items-center gap-4">
            <button className="lg:hidden text-white" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1" />
          </header>
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
