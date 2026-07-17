'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, ShoppingCart, Newspaper, MessageCircle, User } from 'lucide-react';

const tabs = [
  { name: 'Products', href: '/products', icon: ShoppingBag },
  { name: 'Cart', href: '/cart', icon: ShoppingCart },
  { name: 'News', href: '/news', icon: Newspaper },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Profile', href: '/profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card !rounded-none !border-b-0 !border-l-0 !border-r-0">
      <div className="flex items-center justify-around h-16">
        {tabs.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-primary scale-110'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
