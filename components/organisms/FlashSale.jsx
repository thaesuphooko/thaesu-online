'use client';
import { useState, useEffect } from 'react';
export default function FlashSale({ endTime, children }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = new Date(endTime) - now;
      if (diff <= 0) { setTimeLeft('Expired'); clearInterval(timer); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);
  return (
    <div className="relative">
      {children}
      {timeLeft && <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-sm">{timeLeft}</div>}
    </div>
  );
}
