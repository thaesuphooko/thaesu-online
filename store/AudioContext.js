'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AudioContext = createContext();

export function AudioProvider({ children }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [audio, setAudio] = useState(null);
  const [musicUrl, setMusicUrl] = useState('');

  useEffect(() => {
    // Load music config from API
    fetch('/api/music-config')
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          setMusicUrl(data.url);
          setMusicEnabled(data.enabled !== false);
          const audioEl = new Audio(data.url);
          audioEl.loop = true;
          audioEl.volume = (data.volume || 50) / 100;
          setAudio(audioEl);
        }
      })
      .catch(() => {});
  }, []);

  const togglePlay = () => {
    if (!audio || !musicUrl) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <AudioContext.Provider value={{ isPlaying, togglePlay, musicEnabled }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
