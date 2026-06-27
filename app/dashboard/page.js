'use client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Chart from 'react-apexcharts';
import { adminFetch } from '@/lib/adminFetch';

async function fetchStats() {
  const res = await adminFetch('/api/admin/sales');
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default function DashboardHome() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: fetchStats,
    staleTime: 30000, // 30 seconds
  });

  if (isLoading) return <div className="text-center py-8">Loading...</div>;
  if (!data) return <div>No data</div>;

  const dailyLabels = data.ordersByDay?.map(o => o.day).reverse() || [];
  const dailyOrders = data.ordersByDay?.map(o => o.count).reverse() || [];
  const dailyRevenue = data.ordersByDay?.map(o => parseFloat(o.revenue)).reverse() || [];

  const orderChartOptions = {
    chart: { type: 'area', toolbar: { show: false } },
    xaxis: { categories: dailyLabels },
    stroke: { curve: 'smooth' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.2 } },
    dataLabels: { enabled: false },
  };

  const orderSeries = [{ name: 'Orders', data: dailyOrders }];
  const revenueSeries = [{ name: 'Revenue (Ks)', data: dailyRevenue }];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Orders</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.totalOrders}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.totalRevenue.toLocaleString()} Ks</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Low Stock</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.lowStock.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Payouts</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.pendingPayouts?.toLocaleString() || 0} Ks</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Daily Orders</CardTitle></CardHeader>
          <CardContent>
            <Chart options={orderChartOptions} series={orderSeries} type="area" height={300} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Daily Revenue</CardTitle></CardHeader>
          <CardContent>
            <Chart options={{ ...orderChartOptions, chart: { ...orderChartOptions.chart, type: 'bar' } }} series={revenueSeries} type="bar" height={300} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top Products</CardTitle></CardHeader>
          <CardContent>
            {data.topProducts?.map((p, i) => (
              <div key={i} className="flex justify-between py-1 border-b last:border-0"><span>{p.title}</span><span className="font-semibold">{p.sold} sold</span></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Low Stock Alert</CardTitle></CardHeader>
          <CardContent>
            {data.lowStock?.length === 0 ? <p className="text-muted-foreground">All products well stocked.</p> : data.lowStock.map(p => (
              <div key={p.id} className="flex justify-between py-1 border-b last:border-0"><span>{p.title}</span><span className="text-red-500 font-semibold">{p.stock} left</span></div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
