"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useAudio } from "@/store/AudioContext";
import { useEffect, useRef, useState, useCallback } from "react";

const BAR_COUNT = 20;

export default function DynamicIslandVisualizer() {
  const { musicState, audioRef, analyserRef, togglePlayLocal } = useAudio();
  const [heights, setHeights] = useState(Array(BAR_COUNT).fill(4));
  const [expanded, setExpanded] = useState(false);
  const animFrameRef = useRef(null);
  const intervalRef = useRef(null);

  // Real frequency data from analyser
  const updateBars = useCallback(() => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    const newHeights = [];
    const groupSize = Math.floor(bufferLength / BAR_COUNT);
    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0;
      for (let j = 0; j < groupSize; j++) sum += dataArray[i * groupSize + j] || 0;
      newHeights.push(Math.max(4, (sum / groupSize / 255) * 48));
    }
    setHeights(newHeights);
    animFrameRef.current = requestAnimationFrame(updateBars);
  }, [analyserRef]);

  useEffect(() => {
    if (musicState.playing) {
      updateBars();
    } else {
      cancelAnimationFrame(animFrameRef.current);
      setHeights(Array(BAR_COUNT).fill(4)); // static idle bars
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [musicState.playing, updateBars]);

  const accentColor = musicState.accentColor || '#a855f7';

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
      <motion.button
        onClick={() => {
          togglePlayLocal();
          setExpanded(!expanded);
        }}
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="flex items-center gap-2 h-9 px-4 rounded-full
                   backdrop-blur-xl border border-white/10 shadow-lg
                   cursor-pointer select-none overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`,
          boxShadow: musicState.playing ? `0 0 20px ${accentColor}40` : 'none',
        }}
      >
        {/* Visualizer bars */}
        <div className="flex items-end gap-[1.5px] h-6">
          {heights.map((h, i) => (
            <motion.div
              key={i}
              layout
              className="w-[2px] rounded-full origin-bottom"
              style={{
                height: h,
                backgroundColor: accentColor,
                boxShadow: musicState.playing ? `0 0 8px ${accentColor}` : 'none',
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          ))}
        </div>
      </motion.button>

      {/* Expanded panel (title, volume, etc.) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scaleY: 0.8 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -10, scaleY: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mt-1 px-4 py-2 rounded-2xl backdrop-blur-xl bg-black/40 border border-white/10 text-white text-xs w-48 shadow-2xl"
          >
            <p className="truncate font-medium mb-1">{musicState.title}</p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
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
              className="w-full h-1 accent-purple-500"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
