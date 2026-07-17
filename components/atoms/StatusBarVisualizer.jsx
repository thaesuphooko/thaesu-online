"use client";
import { useAudio } from "@/store/AudioContext";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

const N = 20;
export default function StatusBarVisualizer() {
  const { musicState, analyserRef, togglePlayLocal } = useAudio();
  const [heights, setHeights] = useState(Array(N).fill(3));
  const frame = useRef(null);

  const update = useCallback(() => {
    if (analyserRef.current && musicState.playing) {
      const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(buf);
      const g = Math.floor(buf.length / N);
      const h = [];
      for (let i = 0; i < N; i++) {
        let s = 0; for (let j = 0; j < g; j++) s += buf[i * g + j] || 0;
        h.push(Math.max(2, (s / g / 255) * 12));
      }
      setHeights(h);
    } else {
      setHeights(Array.from({ length: N }, () => Math.random() * 4 + 2));
    }
    frame.current = requestAnimationFrame(update);
  }, [analyserRef, musicState.playing]);

  useEffect(() => { frame.current = requestAnimationFrame(update); return () => cancelAnimationFrame(frame.current); }, [update]);

  const accent = musicState.accentColor || '#a855f7';
  return (
    <button onClick={togglePlayLocal} className="w-full h-full flex items-center cursor-pointer select-none"
      style={{ justifyContent: musicState.visualizerAlign === 'center' ? 'center' : musicState.visualizerAlign === 'right' ? 'flex-end' : 'flex-start', gap: '1.5px' }}>
      {heights.map((h, i) => (
        <motion.div key={i} className="w-[2px] rounded-full origin-bottom" style={{ height: h, backgroundColor: accent, boxShadow: musicState.playing ? `0 0 4px ${accent}` : 'none' }}
          animate={{ height: musicState.playing ? h : [h, 3, h] }} transition={{ duration: musicState.playing ? 0.1 : 1 }} />
      ))}
    </button>
  );
}
