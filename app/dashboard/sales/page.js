'use client';
import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function SalesDashboard() {
  const [token, setToken] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchData(savedToken);
  }, []);

  const fetchData = async (authToken) => {
    const res = await fetch('/api/admin/sales', { headers: { Authorization: `Bearer ${authToken}` } });
    if (res.ok) setData(await res.json());
  };

  useEffect(() => { if (token) fetchData(token); }, [token]);

  if (!data) return <div className="p-8 text-center">Loading... (Enter token and click Refresh)</div>;

  // Prepare chart data
  const dailyLabels = data.ordersByDay?.map(o => o.day).reverse() || [];
  const dailyOrders = data.ordersByDay?.map(o => o.count).reverse() || [];
  const dailyRevenue = data.ordersByDay?.map(o => parseFloat(o.revenue)).reverse() || [];

  const topProductLabels = data.topProducts?.map(p => p.title) || [];
  const topProductSold = data.topProducts?.map(p => p.sold) || [];

  const orderChartData = {
    labels: dailyLabels,
    datasets: [
      {
        label: 'Orders per Day',
        data: dailyOrders,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
      },
    ],
  };

  const revenueChartData = {
    labels: dailyLabels,
    datasets: [
      {
        label: 'Revenue (Ks)',
        data: dailyRevenue,
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const topProductsData = {
    labels: topProductLabels,
    datasets: [
      {
        label: 'Units Sold',
        data: topProductSold,
        backgroundColor: 'rgba(245, 158, 11, 0.6)',
        borderColor: 'rgba(245, 158, 11, 1)',
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Sales Dashboard</h1>
      <div className="mb-4 flex items-center gap-2">
        <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="p-2 border rounded w-full max-w-xs" />
        <button onClick={() => fetchData(token)} className="px-4 py-2 bg-blue-600 text-white rounded">Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold">Total Orders</h3>
          <p className="text-4xl font-bold">{data.totalOrders}</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold">Total Revenue</h3>
          <p className="text-4xl font-bold">{data.totalRevenue.toLocaleString()} Ks</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold">Low Stock Items</h3>
          <p className="text-4xl font-bold">{data.lowStock.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-4">
          <h2 className="text-xl font-semibold mb-4">Daily Orders</h2>
          {dailyLabels.length > 0 ? <Bar data={orderChartData} options={{ responsive: true }} /> : <p>No data available</p>}
        </div>
        <div className="glass-card p-4">
          <h2 className="text-xl font-semibold mb-4">Daily Revenue</h2>
          {dailyLabels.length > 0 ? <Line data={revenueChartData} options={{ responsive: true }} /> : <p>No data available</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-4">
          <h2 className="text-xl font-semibold mb-4">Top Products</h2>
          {topProductLabels.length > 0 ? <Bar data={topProductsData} options={{ indexAxis: 'y', responsive: true }} /> : <p>No data available</p>}
        </div>
        <div className="glass-card p-4">
          <h2 className="text-xl font-semibold mb-4">Low Stock Alert</h2>
          {data.lowStock.length === 0 ? <p>All products well stocked.</p> :
            data.lowStock.map(p => (
              <div key={p.id} className="flex justify-between items-center py-1">
                <span>{p.title}</span>
                <span className="text-red-500 font-bold">{p.stock} left</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
