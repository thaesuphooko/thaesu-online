'use client';
import { useAudio } from '@/store/AudioContext';
import { motion } from 'framer-motion';

export default function AudioWaveformTrigger() {
  const { isPlaying, togglePlay, musicEnabled } = useAudio();
  if (!musicEnabled) return null;

  const bars = Array.from({ length: 5 }, (_, i) => ({
    height: isPlaying ? Math.random() * 24 + 8 : 4,
    delay: i * 0.15,
  }));

  return (
    <motion.button
      onClick={togglePlay}
      className="flex items-center gap-1.5 cursor-pointer p-1 rounded-xl hover:bg-white/10 transition-colors"
      whileTap={{ scale: 0.95 }}
      title={isPlaying ? 'Pause Music' : 'Play Music'}
    >
      <div className="flex items-end gap-[2px] h-5">
        {bars.map((bar, i) => (
          <motion.span
            key={i}
            className="w-1 rounded-full bg-gradient-to-t from-rose-400 to-amber-400"
            animate={{ height: bar.height }}
            transition={{ duration: 0.4, delay: bar.delay, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <span className="text-xs font-medium ml-1">{isPlaying ? '⏸️' : '▶️'}</span>
    </motion.button>
  );
}
