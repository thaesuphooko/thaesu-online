"use client";
import { motion } from "framer-motion";
import { TrendingUp, Package, ShoppingCart, DollarSign, Eye } from "lucide-react";

const stats = [
  { label: "Total Revenue", value: "$2,450.00", icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10" },
  { label: "Orders", value: "34", icon: ShoppingCart, color: "text-blue-400", bg: "bg-blue-500/10" },
  { label: "Products", value: "12", icon: Package, color: "text-purple-400", bg: "bg-purple-500/10" },
  { label: "Store Views", value: "1.2K", icon: Eye, color: "text-amber-400", bg: "bg-amber-500/10" },
];

export default function VendorDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">📊 Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`${stat.bg} p-2 rounded-xl`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-zinc-400 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Orders Preview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">📋 Recent Orders</h2>
        <p className="text-zinc-400 text-sm">Orders will appear here once customers place them.</p>
      </div>
    </div>
  );
}
