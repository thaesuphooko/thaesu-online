'use client';
import { useAudio } from '@/store/AudioContext';

export default function MediaWidget() {
  const { isPlaying, togglePlay, musicEnabled } = useAudio();
  if (!musicEnabled) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 glass-card p-3">
      <button onClick={togglePlay} className="text-2xl">
        {isPlaying ? '⏸️' : '▶️'}
      </button>
    </div>
  );
}
