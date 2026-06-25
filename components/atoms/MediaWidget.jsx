'use client';
import { useAudio } from '@/store/AudioContext';

export default function MediaWidget() {
  const { isPlaying, volume, setVolume, togglePlay, switchTrack, tracks, currentTrack } = useAudio();

  return (
    <div className="fixed bottom-6 right-6 glass-card p-4 flex flex-col gap-3 z-50 shadow-xl">
      <div className="flex items-center gap-3">
        <button onClick={togglePlay} className="text-2xl">
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-24"
        />
      </div>
      <div className="flex gap-2">
        {tracks.map((_, i) => (
          <button
            key={i}
            onClick={() => switchTrack(i)}
            className={`px-2 py-1 text-xs rounded-full ${i === currentTrack ? 'bg-white/30' : 'bg-white/10'}`}
          >
            Track {i+1}
          </button>
        ))}
      </div>
    </div>
  );
}
