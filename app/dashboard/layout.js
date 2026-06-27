'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
];

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-secondary/30">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 glass-card !rounded-l-none !rounded-t-none transform transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">Thaesu Admin</h1>
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
        <header className="sticky top-0 z-30 glass-card !rounded-t-none border-b border-border p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-primary hover:underline">View Site</Link>
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">A</div>
          </div>
        </header>

        <main className="p-4 md:p-6 animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
}
