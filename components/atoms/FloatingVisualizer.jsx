"use client";
import { useAudio } from "@/store/AudioContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function FloatingVisualizer() {
  const { musicState, audioRef, togglePlayLocal, actualPlaying } = useAudio();
  const [expanded, setExpanded] = useState(false);

  if (musicState.visualizerType !== 'Floating') return null;

  const accent = musicState.accentColor || '#a855f7';
  const bars = Array.from({ length: 10 }, () => Math.random() * 10 + 4);

  return (
    <motion.div
      drag
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      dragElastic={0.1}
      className="fixed z-50 select-none"
      style={{
        bottom: `calc(1.5rem - ${musicState.visualizerOffsetY}px)`,
        right: musicState.visualizerAlign === 'right'
          ? `calc(1.5rem - ${musicState.visualizerOffsetX}px)`
          : 'auto',
        left: musicState.visualizerAlign === 'left'
          ? `calc(1.5rem + ${musicState.visualizerOffsetX}px)`
          : 'auto',
      }}
    >
      <motion.button
        onClick={() => { togglePlayLocal(); setExpanded(!expanded); }}
        className="w-12 h-12 rounded-full backdrop-blur-xl bg-black/40 border border-white/20 flex items-center justify-center shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <div className="flex items-end gap-[1px] h-6">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-[2px] rounded-full"
              style={{
                height: h,
                backgroundColor: accent,
                opacity: actualPlaying ? 1 : 0.6,
              }}
            />
          ))}
        </div>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full mb-2 right-0 w-44 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3 text-white text-xs shadow-2xl"
          >
            <p className="truncate font-medium mb-1">{musicState.title}</p>
            <input
              type="range" min="0" max="1" step="0.01"
              value={musicState.volume}
              onChange={async (e) => {
                const vol = parseFloat(e.target.value);
                if (audioRef.current) audioRef.current.volume = vol;
                fetch('/api/music-config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ volume: vol }),
                });
              }}
              className="w-full h-1 accent-purple-500 mb-1"
            />
            <div className="flex justify-between items-center">
              <button onClick={() => setExpanded(false)} className="text-[10px] underline">Close</button>
              <button onClick={togglePlayLocal} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">
                {actualPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
