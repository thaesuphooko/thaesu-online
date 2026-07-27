'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AuctionBid({ product }) {
  const [bidAmount, setBidAmount] = useState('');
  const [currentBid, setCurrentBid] = useState(product.auction_current_bid || product.auction_start_price);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const end = new Date(product.auction_end_time).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('Auction ended');
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [product.auction_end_time]);

  const placeBid = async () => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('Login required'); return; }
    const res = await fetch('/api/auction/bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_id: product.id, bid_amount: parseFloat(bidAmount) }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Bid placed!');
      setCurrentBid(data.current_bid);
    } else {
      toast.error(data.error || 'Bid failed');
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-4">
      <h3 className="font-bold flex items-center gap-2">⚡ Live Auction</h3>
      <p className="text-sm text-zinc-400">Time left: {timeLeft}</p>
      <p className="text-lg font-bold text-purple-400">Current bid: {currentBid} Ks</p>
      <div className="flex gap-2 mt-2">
        <Input
          type="number"
          placeholder="Your bid"
          value={bidAmount}
          onChange={e => setBidAmount(e.target.value)}
          className="bg-zinc-800"
        />
        <Button onClick={placeBid}>Bid</Button>
      </div>
    </div>
  );
}
