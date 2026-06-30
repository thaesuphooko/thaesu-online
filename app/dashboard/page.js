'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Chart from 'react-apexcharts';
import { ShoppingCart, DollarSign, AlertTriangle, Activity, Clock, Server, TrendingUp } from 'lucide-react';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

// Glowing Stat Card Component
function StatCard({ title, value, icon: Icon, color, subtitle, onClick }) {
  return (
    <motion.div variants={fadeInUp} whileHover={{ scale: 1.02 }} className="cursor-pointer" onClick={onClick}>
      <Card className="glass-card border-none overflow-hidden relative group">
        <CardContent className="p-5 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
        </CardContent>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </Card>
    </motion.div>
  );
}

// Low Stock Modal
function LowStockModal({ data, onClose }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl glass-card">
        <DialogHeader><DialogTitle>Low Stock Products</DialogTitle></DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {data?.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-red-500">Stock: {p.stock}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => {
                adminFetch('/api/admin/scrape', { method: 'POST', body: JSON.stringify({ url: p.scrape_url || '' }), headers: { 'Content-Type': 'application/json' } })
                  .then(() => toast.success('Sync started'))
                  .catch(() => toast.error('Failed'));
              }}>Sync Stock</Button>
            </div>
          ))}
          {(!data || data.length === 0) && <p className="text-center text-muted-foreground">All products well stocked.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick Crawl Card
function QuickCrawlCard() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const startCrawl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      await adminFetch('/api/admin/crawler', {
        method: 'POST',
        body: JSON.stringify({ start_url: url, config: { maxPages: 50 } }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Crawl job started!');
      setUrl('');
    } catch (e) { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Card className="glass-card">
      <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-blue-400" /> Quick Crawl</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter product or site URL..." />
        <Button onClick={startCrawl} disabled={loading || !url} className="w-full">
          {loading ? 'Starting...' : 'Start Crawl'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Bulk Editor Card
function BulkEditorCard() {
  const [category, setCategory] = useState('');
  const [percent, setPercent] = useState('');
  const [loading, setLoading] = useState(false);

  const apply = async () => {
    if (!category || !percent) return;
    setLoading(true);
    try {
      // Call bulk price update API (existing) with category filter
      await adminFetch('/api/admin/products/bulk/price/by-category', {
        method: 'PATCH',
        body: JSON.stringify({ category, factor: 1 + parseFloat(percent) / 100 }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success(`All ${category} prices updated by ${percent}%`);
    } catch (e) { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Card className="glass-card">
      <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" /> Bulk Price Update</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {['Electronics','Fashion','Home & Living','Books','Sports','Health','Beauty','Food','Other'].map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="number" value={percent} onChange={e => setPercent(e.target.value)} placeholder="e.g., +5 or -5 (%)" />
        <Button onClick={apply} disabled={loading || !category || !percent} className="w-full">Apply to Category</Button>
      </CardContent>
    </Card>
  );
}

// Proxy Status Card
function ProxyStatusCard() {
  const [status, setStatus] = useState('unknown');
  useEffect(() => {
    // Check proxy config from settings
    adminFetch('/api/admin/settings').then(r => r.json()).then(s => {
      setStatus(s.scraper_api_key ? 'active' : 'disabled');
    });
  }, []);
  return (
    <Card className="glass-card">
      <CardHeader><CardTitle className="flex items-center gap-2"><Server className="w-5 h-5 text-purple-400" /> Proxy Status</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm">{status === 'active' ? 'ScraperAPI Active' : 'No proxy configured'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardHome() {
  const queryClient = useQueryClient();
  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminFetch('/api/admin/sales').then(r => r.json()),
    staleTime: 30000,
  });
  const { data: lowStock } = useQuery({
    queryKey: ['lowStock'],
    queryFn: () => adminFetch('/api/admin/sales').then(r => r.json()).then(d => d.lowStock),
    staleTime: 30000,
  });
  const { data: recentActivities } = useQuery({
    queryKey: ['recentActivities'],
    queryFn: () => adminFetch('/api/admin/activity').then(r => r.json()),
    staleTime: 10000,
  });
  const [showLowStock, setShowLowStock] = useState(false);

  // Sales chart data
  const orderDays = stats?.ordersByDay?.map(o => o.day).reverse() || [];
  const orderCounts = stats?.ordersByDay?.map(o => o.count).reverse() || [];
  const revenueDays = stats?.ordersByDay?.map(o => o.day).reverse() || [];
  const revenueData = stats?.ordersByDay?.map(o => parseFloat(o.revenue)).reverse() || [];

  const orderChartOptions = {
    chart: { type: 'area', toolbar: { show: false }, sparkline: { enabled: true } },
    stroke: { curve: 'smooth' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.2 } },
    xaxis: { categories: orderDays },
    dataLabels: { enabled: false },
    colors: ['#6366f1'],
  };
  const revenueChartOptions = {
    ...orderChartOptions,
    colors: ['#10b981'],
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-6">
      <h1 className="text-3xl font-bold">King Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={ShoppingCart} color="bg-blue-500" />
        <StatCard title="Revenue" value={`${(stats?.totalRevenue || 0).toLocaleString()} Ks`} icon={DollarSign} color="bg-green-500" />
        <StatCard title="Low Stock" value={lowStock?.length || 0} icon={AlertTriangle} color="bg-yellow-500" onClick={() => setShowLowStock(true)} />
        <StatCard title="Pending Payouts" value={`${(stats?.pendingPayouts || 0).toLocaleString()} Ks`} icon={Clock} color="bg-purple-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader><CardTitle>Orders Trend</CardTitle></CardHeader>
          <CardContent>
            <Chart options={orderChartOptions} series={[{ name: 'Orders', data: orderCounts }]} type="area" height={250} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <Chart options={revenueChartOptions} series={[{ name: 'Revenue', data: revenueData }]} type="area" height={250} />
          </CardContent>
        </Card>
      </div>

      {/* Quick Tools Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickCrawlCard />
        <BulkEditorCard />
        <ProxyStatusCard />
      </div>

      {/* Recent Activities */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Recent Activities</CardTitle></CardHeader>
        <CardContent className="max-h-64 overflow-y-auto space-y-2">
          {recentActivities?.map((a, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleTimeString()}</span>
              <span>{a.action}</span>
            </div>
          ))}
          {(!recentActivities || recentActivities.length === 0) && <p className="text-muted-foreground text-sm">No recent activity.</p>}
        </CardContent>
      </Card>

      {/* Low Stock Modal */}
      {showLowStock && <LowStockModal data={lowStock} onClose={() => setShowLowStock(false)} />}
    </motion.div>
  );
}
