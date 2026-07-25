"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ADMIN_HASH = 'super-secret-admin-step';

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/reports?admin_hash=${ADMIN_HASH}`)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-white">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">📊 Reports</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-zinc-400 text-sm">Total Revenue</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-green-400">${data?.totalRevenue}</CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-zinc-400 text-sm">Orders</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-blue-400">{data?.totalOrders}</CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-zinc-400 text-sm">Products</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-purple-400">{data?.totalProducts}</CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader><CardTitle className="text-zinc-400 text-sm">Users</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-amber-400">{data?.totalUsers}</CardContent>
        </Card>
      </div>
    </div>
  );
}
