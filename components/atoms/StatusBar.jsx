'use client';
import { useState, useEffect } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

export default function StatusBar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sticky top-0 z-50 glass-card !rounded-none !border-t-0 !border-l-0 !border-r-0 px-4 py-2 flex items-center justify-between text-xs font-medium">
      <div className="flex items-center gap-2">
        <span className="font-bold tracking-wide">Thaesu</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="tabular-nums">{time}</span>
      </div>
      <div className="flex items-center gap-1">
        <Signal className="w-4 h-4" />
        <Wifi className="w-4 h-4" />
        <Battery className="w-4 h-4" />
      </div>
    </div>
  );
}
