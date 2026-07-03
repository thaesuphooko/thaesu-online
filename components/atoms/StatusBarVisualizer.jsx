"use client";
import { useAudio } from "@/store/AudioContext";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

const BAR_COUNT = 20;

export default function StatusBarVisualizer() {
  const { musicState, analyserRef, togglePlayLocal, actualPlaying } = useAudio();
  const [heights, setHeights] = useState(Array(BAR_COUNT).fill(3));
  const animFrameRef = useRef(null);

  const updateBars = useCallback(() => {
    if (!analyserRef.current || !actualPlaying) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    const newHeights = [];
    const groupSize = Math.floor(bufferLength / BAR_COUNT);
    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0;
      for (let j = 0; j < groupSize; j++) {
        sum += dataArray[i * groupSize + j] || 0;
      }
      newHeights.push(Math.max(2, (sum / groupSize / 255) * 12));
    }
    setHeights(newHeights);
    animFrameRef.current = requestAnimationFrame(updateBars);
  }, [analyserRef, actualPlaying]);

  useEffect(() => {
    if (actualPlaying) {
      updateBars();
    } else {
      cancelAnimationFrame(animFrameRef.current);
      setHeights(Array.from({ length: BAR_COUNT }, () => Math.random() * 4 + 2));
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [actualPlaying, updateBars]);

  const accent = musicState.accentColor || '#a855f7';

  return (
    <motion.button
      onClick={togglePlayLocal}
      className="w-full h-full flex items-center cursor-pointer select-none"
      style={{
        transform: `translate(${musicState.visualizerOffsetX}px, ${musicState.visualizerOffsetY}px)`,
        justifyContent:
          musicState.visualizerAlign === 'center'
            ? 'center'
            : musicState.visualizerAlign === 'right'
            ? 'flex-end'
            : 'flex-start',
        gap: '1.5px',
      }}
      whileTap={{ scale: 0.98 }}
    >
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full origin-bottom"
          style={{
            height: h,
            backgroundColor: accent,
            boxShadow: actualPlaying ? `0 0 4px ${accent}` : 'none',
          }}
          animate={{ height: actualPlaying ? h : [h, 3, h] }}
          transition={{ duration: actualPlaying ? 0.1 : 1 }}
        />
      ))}
    </motion.button>
  );
}
