'use client';
import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import Button from '@/components/ui/button';
export default function RefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const fetchRefunds = async () => {
    const res = await adminFetch('/api/admin/refunds');
    if (res.ok) setRefunds(await res.json());
  };
  useEffect(() => { fetchRefunds(); }, []);
  const updateStatus = async (id, status) => {
    await adminFetch('/api/admin/refunds', { method:'PATCH', body:JSON.stringify({ refund_id:id, status }), headers:{'Content-Type':'application/json'} });
    fetchRefunds();
  };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Refunds</h1>
      {refunds.map(r => (
        <div key={r.id} className="glass-card p-4 flex justify-between">
          <div><p className="font-semibold">Order {r.order_id?.slice(0,8)}</p><p>Amount: {r.amount} Ks</p></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => updateStatus(r.id, 'approved')}>Approve</Button>
            <Button size="sm" variant="destructive" onClick={() => updateStatus(r.id, 'rejected')}>Reject</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
