'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAudio } from '@/store/AudioContext';
import StatusBarVisualizer from './StatusBarVisualizer';

export default function StatusBar() {
  const [time, setTime] = useState('');
  const { musicState } = useAudio();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="sticky top-0 z-50 flex items-center h-7 px-3
                 bg-black/20 backdrop-blur-2xl border-b border-white/5
                 text-white text-xs font-medium"
    >
      {/* LEFT – Logo */}
      <Link
        href="/"
        className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent shrink-0 mr-3"
      >
        Thaesu
      </Link>

      {/* BETWEEN Logo & Clock – Visualizer (flex-1) */}
      <div className="flex-1 min-w-0 h-full">
        {musicState.visualizerPosition === 'statusBar' && <StatusBarVisualizer />}
      </div>

      {/* CENTER – Clock (absolute) */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <span className="tabular-nums text-xs">{time}</span>
      </div>

      {/* RIGHT – Icons */}
      <div className="flex items-center gap-1.5 shrink-0 ml-3">
        {/* Cellular */}
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 12" fill="currentColor">
          <rect x="1" y="7" width="3" height="5" rx="0.5" />
          <rect x="5.5" y="5" width="3" height="7" rx="0.5" />
          <rect x="10" y="3" width="3" height="9" rx="0.5" />
          <rect x="14.5" y="1" width="3" height="11" rx="0.5" />
        </svg>
        {/* WiFi */}
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M8 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" fill="currentColor" stroke="none"/>
          <path d="M5.2 8.4a4 4 0 015.6 0" />
          <path d="M3 6.2a7 7 0 0110 0" />
          <path d="M1 4a11 11 0 0114 0" />
        </svg>
        {/* Battery */}
        <svg className="w-4 h-3.5" viewBox="0 0 18 12" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="1" y="1" width="14" height="10" rx="2" />
          <rect x="15.5" y="3.5" width="1.5" height="5" rx="0.75" fill="currentColor" stroke="none"/>
          <rect x="3" y="3" width="10" height="6" rx="1" fill="currentColor" stroke="none"/>
        </svg>
      </div>
    </div>
  );
}
