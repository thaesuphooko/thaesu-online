"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Package, ShoppingCart, Settings, 
  DollarSign, Store, LogOut, Menu, X, TrendingUp 
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/vendor/dashboard", icon: LayoutDashboard },
  { name: "Products", href: "/vendor/dashboard/products", icon: Package },
  { name: "Orders", href: "/vendor/dashboard/orders", icon: ShoppingCart },
  { name: "Payouts", href: "/vendor/dashboard/payouts", icon: DollarSign },
  { name: "Settings", href: "/vendor/dashboard/settings", icon: Settings },
];

export default function VendorDashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || user.role !== "vendor") {
      router.push("/vendor/login");
      return;
    }
    setVendor(user);
    setLoading(false);
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!vendor) return null;

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -280 }}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        transition={{ type: "spring", damping: 25 }}
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-800 transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-purple-400" />
            <h1 className="text-lg font-bold text-white">Vendor Panel</h1>
          </div>
          <button className="lg:hidden text-white" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="p-3 space-y-1">
          {menuItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                pathname === item.href ? "bg-purple-600/20 text-purple-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
          <button
            onClick={() => { localStorage.clear(); router.push("/vendor/login"); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition w-full mt-4"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </nav>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-30 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800 p-4 flex items-center gap-4">
          <button className="lg:hidden text-white" onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
          <div className="flex-1" />
          <span className="text-sm text-zinc-400">👋 {vendor.name || vendor.full_name}</span>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
