'use client';
import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

export default function AdminLiveVisitors() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const res = await fetch('/api/admin/live-users', { headers: { 'x-admin-hash': localStorage.getItem('adminSecret') || 'step' } });
      const data = await res.json();
      setCount(data.count || 0);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
      <div className="p-3 bg-green-500/10 rounded-xl">
        <Users className="w-6 h-6 text-green-400" />
      </div>
      <div>
        <p className="text-sm text-zinc-400">Live Visitors</p>
        <p className="text-2xl font-bold">{count}</p>
      </div>
    </div>
  );
}
