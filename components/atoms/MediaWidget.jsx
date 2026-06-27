'use client';
import { useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '@/store/AudioContext';

export default function MediaWidget() {
  const { isPlaying, togglePlay, volume, setVolume, musicEnabled, musicUrl } = useAudio();
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!musicEnabled || !musicUrl) return null;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 0 : prev + 1));
    }, 300);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div
      className="fixed bottom-20 right-4 z-50"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className={`glass-card p-3 transition-all duration-300 ${expanded ? 'w-64' : 'w-12'} overflow-hidden`}>
        {expanded ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium truncate">Ambient Music</span>
              <button onClick={togglePlay} className="p-1 rounded-full hover:bg-primary/20">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
            <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setVolume(0)} className="p-1 hover:bg-primary/20 rounded-full">
                {volume === 0 ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 accent-primary"
              />
            </div>
          </div>
        ) : (
          <button onClick={togglePlay} className="w-full h-full flex items-center justify-center">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );
}
