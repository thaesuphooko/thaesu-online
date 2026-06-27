'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, Moon, Sun } from 'lucide-react';

const queryClient = new QueryClient();

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Products', href: '/dashboard/products', icon: '📦' },
  { name: 'Orders', href: '/dashboard/orders', icon: '🛒' },
  { name: 'Coupons', href: '/dashboard/coupons', icon: '🎫' },
  { name: 'Gift Cards', href: '/dashboard/giftcards', icon: '🎁' },
  { name: 'Payouts', href: '/dashboard/payouts', icon: '💸' },
  { name: 'Sales', href: '/dashboard/sales', icon: '📈' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: '📉' },
  { name: 'Shipping', href: '/dashboard/shipping', icon: '🚚' },
  { name: 'Pricing', href: '/dashboard/pricing', icon: '💰' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
  { name: 'Telegram Test', href: '/dashboard/telegram-test', icon: '📡' },
  { name: 'Scrape', href: '/dashboard/scrape', icon: '🕷️' },
  { name: 'Crawl', href: '/dashboard/crawl', icon: '🕸️' },
  { name: 'System Health', href: '/dashboard/health', icon: '🫀' },
];

function useNewOrderNotification() {
  useEffect(() => {
    const evtSource = new EventSource('/api/admin/live');
    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_ORDERS') {
        toast.success(`New order received! (${data.orders.length})`);
      }
    };
    return () => evtSource.close();
  }, []);
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('themePreference');
    if (stored === 'dark') setDark(true);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('themePreference', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };
  return (
    <Button variant="ghost" size="icon" onClick={toggle}>
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  );
}

function AdminLogin({ onAuthenticated }) {
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const stored = localStorage.getItem('adminSecret');
    if (hash === process.env.NEXT_PUBLIC_ADMIN_HASH || stored === 'magic-link-verified') {
      onAuthenticated(true);
    }
  }, []);

  const requestMagicLink = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/magic-link', { method: 'POST' });
    if (res.ok) {
      setRequested(true);
    } else {
      toast.error('Failed to send magic link');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass-card p-8 max-w-sm w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">Admin Access</h1>
        {!requested ? (
          <Button onClick={requestMagicLink} disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Request Secure Access'}
          </Button>
        ) : (
          <p className="text-muted-foreground">Magic link sent to your Telegram. Check your device.</p>
        )}
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useNewOrderNotification();

  if (!authenticated) {
    return <AdminLogin onAuthenticated={setAuthenticated} />;
  }

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/dashboard/products?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <Toaster position="top-right" />
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 glass-card !rounded-none border-r border-border transform transition-transform duration-300",
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          "lg:translate-x-0 lg:static lg:z-auto"
        )}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h1 className="text-lg font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">Thaesu Admin</h1>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </Button>
          </div>
          <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
            {menuItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-2xl text-sm font-medium transition-all duration-200",
                  pathname === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent/10'
                )}
              >
                <span>{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 glass-card !rounded-none border-b border-border p-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </Button>
            <form onSubmit={handleGlobalSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search orders, products..." className="pl-10" />
              </div>
            </form>
            <div className="flex items-center gap-2 ml-auto">
              <ThemeToggle />
              <Link href="/" className="text-sm text-primary hover:underline">View Site</Link>
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">A</div>
            </div>
          </header>
          <main className="p-4 md:p-6 animate-fadeIn">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
