"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Rss, MessageSquare, ShoppingCart, Heart, User } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/products", label: "Shop", icon: ShoppingBag },
  { href: "/feed", label: "Feed", icon: Rss },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 
                    bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full shadow-2xl shadow-black/50">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-col items-center justify-center px-3 py-1 group"
          >
            <motion.div
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className="relative z-10"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive
                    ? "text-purple-400 drop-shadow-lg"
                    : "text-white/70 group-hover:text-white"
                }`}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.div>
            <span
              className={`text-[10px] font-medium mt-0.5 transition-colors ${
                isActive ? "text-purple-400" : "text-white/60 group-hover:text-white/80"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
