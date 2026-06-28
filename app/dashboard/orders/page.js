'use client';
import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const fetchOrders = async () => {
    try {
      const res = await adminFetch('/api/admin/orders');
      if (res.ok) setOrders(await res.json());
    } catch (e) { console.error(e); }
  };
  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (orderId, status) => {
    try {
      const res = await adminFetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        toast.success('Status updated');
        fetchOrders();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Orders</h1>
      <div className="glass-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-2">ID</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t">
                <td className="p-2 font-mono text-sm">{o.id.slice(0,8)}</td>
                <td>{parseFloat(o.total_amount).toLocaleString()} Ks</td>
                <td className={`px-2 py-1 rounded-full text-xs ${o.status==='confirmed'?'bg-green-100 text-green-800':o.status==='cancelled'?'bg-red-100 text-red-800':'bg-gray-100'}`}>{o.status}</td>
                <td className="text-sm">{new Date(o.created_at).toLocaleString()}</td>
                <td>
                  <select
                    value={o.status}
                    onChange={e => updateStatus(o.id, e.target.value)}
                    className="border rounded p-1 text-sm"
                  >
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="preparing">preparing</option>
                    <option value="delivering">delivering</option>
                    <option value="delivered">delivered</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
