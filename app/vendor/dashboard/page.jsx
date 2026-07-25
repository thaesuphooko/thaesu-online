'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function VendorDashboardPage() {
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0 });
  const [salesData, setSalesData] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/vendor/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setStats)
      .catch(() => {});
    // Mock sales data for chart
    setSalesData([
      { name: 'Mon', sales: 400 }, { name: 'Tue', sales: 300 }, { name: 'Wed', sales: 500 },
      { name: 'Thu', sales: 700 }, { name: 'Fri', sales: 600 }, { name: 'Sat', sales: 800 },
      { name: 'Sun', sales: 1000 }
    ]);
  }, []);

  return (
    <div className="space-y-8">
      <motion.h1 initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="text-3xl font-bold">Dashboard</motion.h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ label: 'Products', value: stats.products, icon: Package, color: 'text-blue-400' },
          { label: 'Orders', value: stats.orders, icon: ShoppingCart, color: 'text-green-400' },
          { label: 'Revenue', value: `$${stats.revenue}`, icon: DollarSign, color: 'text-yellow-400' }]
          .map((item, i) => (
          <motion.div key={item.label} initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <item.icon className={`w-8 h-8 ${item.color} mb-3`} />
            <div className="text-2xl font-bold">{item.value}</div>
            <div className="text-sm text-zinc-400">{item.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" /> Sales This Week</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}><CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#666" /><YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="sales" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
