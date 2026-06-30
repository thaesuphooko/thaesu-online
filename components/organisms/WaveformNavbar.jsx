'use client';
import { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useAudio } from '@/store/AudioContext';
import Link from 'next/link';

const BAR_COUNT = 60;

export default function WaveformNavbar() {
  const { isPlaying, togglePlay, musicEnabled } = useAudio();
  const [heights, setHeights] = useState(Array(BAR_COUNT).fill(10));

  // Generate random heights while playing
  useEffect(() => {
    if (!isPlaying) {
      setHeights(Array(BAR_COUNT).fill(5)); // flat when paused
      return;
    }
    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: BAR_COUNT }, () => Math.floor(Math.random() * 40) + 10)
      );
    }, 300);
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!musicEnabled) return null;

  return (
    <div className="sticky top-0 z-50 w-full h-14 cursor-pointer overflow-hidden" onClick={togglePlay}>
      {/* Background waveform layer */}
      <div className="absolute inset-0 flex items-end justify-center gap-[2px] px-2 pointer-events-none">
        {heights.map((h, i) => (
          <motion.div
            key={i}
            className="w-1 bg-gradient-to-t from-rose-500/30 via-amber-500/30 to-purple-500/30"
            initial={{ height: 5 }}
            animate={{ height: h }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />
        ))}
      </div>

      {/* Foreground menu links */}
      <div className="relative z-10 h-full flex items-center justify-between px-4 backdrop-blur-md bg-white/10 dark:bg-black/20">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
            Thaesu Online
          </Link>
          <Link href="/products" className="text-sm font-medium hover:text-primary transition">Products</Link>
          <Link href="/cart" className="text-sm font-medium hover:text-primary transition">Cart</Link>
          <Link href="/wishlist" className="text-sm font-medium hover:text-primary transition">Wishlist</Link>
          <Link href="/profile" className="text-sm font-medium hover:text-primary transition">Profile</Link>
        </div>
      </div>
    </div>
  );
}
