'use client';
import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, Moon, Sun, RefreshCw, Play, Pause } from 'lucide-react';
import { useAudio } from '@/store/AudioContext';

const queryClient = new QueryClient();

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Products', href: '/dashboard/products', icon: '📦' },
  { name: 'Orders', href: '/dashboard/orders', icon: '🛒' },
  { name: 'Coupons', href: '/dashboard/coupons', icon: '🎫' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
  { name: 'Telegram Config', href: '/dashboard/telegram-config', icon: '📡' },
  { name: 'Scrape', href: '/dashboard/scrape', icon: '🕷️' },
  { name: 'Crawl', href: '/dashboard/crawl', icon: '🕸️' },
  { name: 'Browser', href: '/dashboard/browser', icon: '🌐' },
  { name: 'System Health', href: '/dashboard/health', icon: '🫀' },
  { name: 'Catalog Sanitizer', href: '/dashboard/catalog-sanitizer', icon: '🧹' },
    { name: 'Background Music', href: '/dashboard/music', icon: '🎵' },
  { name: 'Health Monitor', href: '/dashboard/health-monitor', icon: '💓' },
  { name: 'Users', href: '/dashboard/users', icon: '👥' },
  { name: 'Error Bot', href: '/dashboard/error-bot', icon: '🤖' },
  { name: 'AI Chat', href: '/dashboard/ai-chat', icon: '🤖' },
  { name: 'Key Tester', href: '/dashboard/key-tester', icon: '🔬' },
];

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

function RefreshButton() {
  const queryClient = useQueryClient();
  return (
    <Button variant="ghost" size="icon" onClick={() => queryClient.invalidateQueries()}>
      <RefreshCw className="w-5 h-5" />
    </Button>
  );
}

function MusicToggle() {
  const { isPlaying, togglePlay, musicEnabled } = useAudio();
  if (!musicEnabled) return null;
  return (
    <Button variant="ghost" size="icon" onClick={togglePlay} title={isPlaying ? 'Pause Music' : 'Play Music'}>
      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
    </Button>
  );
}

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash === process.env.NEXT_PUBLIC_ADMIN_HASH) {
      setAuthenticated(true);
      localStorage.setItem('adminSecret', process.env.NEXT_PUBLIC_ADMIN_HASH);
    } else {
      router.replace('/');
    }
  }, []);

  if (!authenticated) return null;

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
            <h1 className="text-lg font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
              King Panel <span className="text-xs text-muted-foreground">v3.0</span>
            </h1>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </Button>
          </div>
          <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
            {menuItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={cn("flex items-center gap-3 px-3 py-2 rounded-2xl text-sm font-medium transition-all duration-200",
                  pathname === item.href ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/10')}>
                <span>{item.icon}</span>{item.name}
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
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-10" />
              </div>
            </form>
            <MusicToggle />
            <RefreshButton />
            <ThemeToggle />
            <Link href="/" className="text-sm text-primary hover:underline">View Site</Link>
          </header>
          <main className="p-4 md:p-6 animate-fadeIn">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
