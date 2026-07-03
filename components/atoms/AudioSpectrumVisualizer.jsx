"use client";
import { motion } from "framer-motion";
import { useAudio } from "@/store/AudioContext";
import { useEffect, useRef, useState, useCallback } from "react";

const BAR_COUNT = 24;

export default function AudioSpectrumVisualizer() {
  const { isPlaying, togglePlay, audioRef, isMuted, toggleMute } = useAudio();
  const [heights, setHeights] = useState(Array(BAR_COUNT).fill(4));
  const intervalRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const longPressTimer = useRef(null);

  // Real audio analyser
  useEffect(() => {
    if (!audioRef?.current) return;
    const audio = audioRef.current;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = { analyser, ctx, source };
      return () => {
        try { source?.disconnect(); analyser?.disconnect(); ctx?.close(); } catch(e) {}
      };
    } catch(e) {}
  }, [audioRef]);

  const updateReal = useCallback(() => {
    if (!analyserRef.current || !isPlaying) return;
    const { analyser } = analyserRef.current;
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
    animFrameRef.current = requestAnimationFrame(updateReal);
  }, [isPlaying]);

  // Animation control
  useEffect(() => {
    if (isPlaying) {
      if (analyserRef.current) {
        updateReal();
      } else {
        // Synthetic wave
        const animate = () => {
          setHeights(Array.from({ length: BAR_COUNT }, (_, i) => {
            const t = Date.now() / 800;
            return Math.max(4, Math.sin(t + i * 0.4) * 20 + 24);
          }));
          intervalRef.current = requestAnimationFrame(animate);
        };
        animate();
      }
    } else {
      cancelAnimationFrame(animFrameRef.current);
      cancelAnimationFrame(intervalRef.current);
      // Static idle bars
      setHeights(Array(BAR_COUNT).fill(4));
    }
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      cancelAnimationFrame(intervalRef.current);
    };
  }, [isPlaying, updateReal, analyserRef]);

  // Gradient color per bar (Cyan -> Blue -> Purple)
  const getColor = (index) => {
    if (isMuted) return '#6b7280'; // gray when muted
    const ratio = index / (BAR_COUNT - 1);
    const stops = [
      { pos: 0, r: 6, g: 182, b: 212 },
      { pos: 0.5, r: 59, g: 130, b: 246 },
      { pos: 1, r: 168, g: 85, b: 247 }
    ];
    let lower = stops[0], upper = stops[stops.length-1];
    for (let s of stops) { if (ratio >= s.pos && s.pos >= lower.pos) lower = s; if (ratio <= s.pos && s.pos <= upper.pos) upper = s; }
    const range = upper.pos - lower.pos || 1;
    const mix = (ratio - lower.pos) / range;
    const r = Math.round(lower.r + (upper.r - lower.r) * mix);
    const g = Math.round(lower.g + (upper.g - lower.g) * mix);
    const b = Math.round(lower.b + (upper.b - lower.b) * mix);
    return `rgb(${r},${g},${b})`;
  };

  // Long-press handler for mute
  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      toggleMute();
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <motion.button
      onClick={togglePlay}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      className="group flex-1 flex items-center justify-center gap-[2px] px-2 py-1.5 rounded-full
                 backdrop-blur-md bg-white/10 dark:bg-black/20 border border-white/10
                 shadow-lg transition-all duration-300 cursor-pointer select-none
                 hover:brightness-125 focus:outline-none
                 h-12"
      style={{
        filter: isPlaying && !isMuted ? 'drop-shadow(0 0 8px rgba(168,85,247,0.5))' : 'none',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      aria-label={isPlaying ? "Pause music" : "Play music"}
    >
      {/* Visualizer bars */}
      <div className="flex items-end gap-[2px] h-full">
        {heights.map((h, i) => (
          <motion.div
            key={i}
            layout
            className="w-[3px] rounded-full origin-bottom transition-transform duration-300 group-hover:scale-y-110"
            style={{
              height: h,
              backgroundColor: getColor(i),
              boxShadow: (isPlaying && !isMuted) ? `0 0 10px ${getColor(i)}` : 'none',
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
        ))}
      </div>
      {/* Mute indicator (small) */}
      {isMuted && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 text-xs font-bold">🔇</span>
      )}
    </motion.button>
  );
}
