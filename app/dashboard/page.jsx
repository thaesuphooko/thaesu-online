"use client";
import AdminLiveVisitors from '@/components/organisms/AdminLiveVisitors';
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Zap, Package, ShoppingCart, Users, DollarSign, TrendingUp,
  Bot, ShieldAlert, BarChart3, Music,
} from "lucide-react";

export default function PremiumDashboard() {
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: "0.00", totalProducts: 0, totalUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/admin/reports")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(data => {
        setStats({
          totalOrders: data.totalOrders ?? 0,
          totalRevenue: data.totalRevenue ?? "0.00",
          totalProducts: data.totalProducts ?? 0,
          totalUsers: data.totalUsers ?? 0,
        });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Loading Skeleton
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-700" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-zinc-700 rounded w-2/3" />
              <div className="h-4 bg-zinc-700 rounded w-1/2" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-zinc-700 rounded w-3/4 mb-4" />
              <div className="h-8 bg-zinc-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-400">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg font-semibold">Failed to load dashboard</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition">Retry</button>
        </div>
      </div>
    );
  }

  // Stat cards data (objects only, no JSX)
  const statCards = [
    { label: "Total Products", value: stats.totalProducts, icon: Package, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Active Users", value: stats.totalUsers, icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Total Revenue", value: `$${parseFloat(stats.totalRevenue).toLocaleString()}`, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  const revenueData = [
    { name: "Mon", revenue: 1200 }, { name: "Tue", revenue: 1900 }, { name: "Wed", revenue: 1500 },
    { name: "Thu", revenue: 2200 }, { name: "Fri", revenue: 1800 }, { name: "Sat", revenue: 3100 }, { name: "Sun", revenue: 2700 },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back, Admin! 👋</h1>
            <p className="text-zinc-400 mt-1">Here's a live overview of your marketplace.</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid + Live Visitors */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`${card.bg} border border-zinc-800 rounded-2xl p-5 hover:scale-[1.02] transition-transform`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-zinc-800/50">
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-zinc-400 text-sm">{card.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
          </motion.div>
        ))}
        {/* Live Visitors – treated as a separate card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 hover:scale-[1.02] transition-transform"
        >
          <AdminLiveVisitors />
        </motion.div>
      </div>

      {/* Revenue Chart & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }} className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-400" /> Revenue This Week</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }} />
                <Bar dataKey="revenue" fill="#a855f7" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" /> Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Package, label: "Products", href: "/dashboard/products" },
              { icon: ShoppingCart, label: "Orders", href: "/dashboard/orders" },
              { icon: ShieldAlert, label: "Error Bot", href: "/dashboard/error-bot" },
              { icon: Bot, label: "AI Chat", href: "/dashboard/ai-chat" },
              { icon: BarChart3, label: "Reports", href: "/dashboard/reports" },
              { icon: Music, label: "Music", href: "/dashboard/music" },
            ].map(a => (
              <Link key={a.href} href={a.href} className="bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-2xl p-3 flex flex-col items-center gap-2 transition group">
                <a.icon className="w-6 h-6 text-white group-hover:scale-110 transition" />
                <span className="text-xs font-medium text-white">{a.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
