"use client";
import { useAudio } from "@/store/AudioContext";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

const BAR_COUNT = 20;

export default function MusicFloatingPlayer() {
  const { musicState, analyserRef, togglePlayLocal } = useAudio();
  const [heights, setHeights] = useState(Array(BAR_COUNT).fill(3));
  const animFrameRef = useRef(null);

  if (musicState.visualizerType !== 'Floating') return null;

  const updateBars = useCallback(() => {
    if (analyserRef.current && musicState.playing) {
      const buffer = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(buffer);
      const newHeights = [];
      const groupSize = Math.floor(buffer.length / BAR_COUNT);
      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < groupSize; j++) sum += buffer[i * groupSize + j] || 0;
        newHeights.push(Math.max(2, (sum / groupSize / 255) * 14));
      }
      setHeights(newHeights);
    } else {
      setHeights(Array.from({ length: BAR_COUNT }, () => Math.random() * 6 + 2));
    }
    animFrameRef.current = requestAnimationFrame(updateBars);
  }, [analyserRef, musicState.playing]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(updateBars);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [updateBars]);

  const accent = musicState.accentColor || '#a855f7';

  return (
    <motion.div
      drag dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }} dragElastic={0.1}
      className="fixed bottom-6 right-6 z-50 select-none"
    >
      <motion.button
        onClick={togglePlayLocal}
        className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-xl bg-black/50 border border-white/20 shadow-lg shadow-purple-500/30"
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
      >
        <div className="flex items-end gap-[1px] h-6">
          {heights.map((h, i) => (
            <motion.div key={i} className="w-[2px] rounded-full"
              style={{ height: h, backgroundColor: accent, boxShadow: musicState.playing ? `0 0 6px ${accent}` : 'none' }}
              animate={{ height: musicState.playing ? h : [h, 3, h] }}
              transition={{ duration: musicState.playing ? 0.1 : 1 }}
            />
          ))}
        </div>
        <span className="text-xs font-bold text-white">{musicState.playing ? '⏸' : '▶'}</span>
      </motion.button>
    </motion.div>
  );
}
