'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DollarSign, Wallet } from 'lucide-react';

export default function VendorPayoutsPage() {
  const [payouts, setPayouts] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/vendor/payouts', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setPayouts(data.payouts || []);
        setTotalEarnings(data.total_earnings || 0);
        setLoading(false);
      });
  }, []);

  const requestPayout = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter valid amount');
    const token = localStorage.getItem('token');
    const res = await fetch('/api/vendor/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount }),
    });
    if (res.ok) {
      toast.success('Payout requested');
      const newPayout = await res.json();
      setPayouts(prev => [newPayout, ...prev]);
      setAmount('');
    } else {
      toast.error('Request failed');
    }
  };

  const statusColor = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payouts</h1>
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white/5 rounded-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-purple-400" />
          <span className="text-zinc-400">Available Balance:</span>
          <span className="text-xl font-bold text-white">${totalEarnings}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-32 bg-white/10" />
          <Button onClick={requestPayout} className="bg-purple-600"><DollarSign className="w-4 h-4 mr-1"/> Request</Button>
        </div>
      </div>
      <div className="space-y-2">
        {payouts.map(p => (
          <div key={p.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-white">${p.amount}</div>
              <div className="text-xs text-zinc-400">{new Date(p.created_at).toLocaleDateString()}</div>
            </div>
            <Badge className={`${statusColor(p.status)} capitalize`}>{p.status}</Badge>
          </div>
        ))}
        {payouts.length === 0 && <p className="text-zinc-500 text-center py-10">No payout requests yet.</p>}
      </div>
    </div>
  );
}
