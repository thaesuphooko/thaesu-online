'use client';
import { createContext, useContext, useRef, useState, useEffect } from 'react';

const AudioContext = createContext();

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicEnabled, setMusicEnabled] = useState(true);

  // Fetch public music settings from admin
  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(settings => {
        if (settings.music_url) setMusicUrl(settings.music_url);
        if (settings.music_volume) setVolume(parseFloat(settings.music_volume));
        if (settings.music_enabled) setMusicEnabled(settings.music_enabled === 'true');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (!musicUrl || !musicEnabled) return;
    const audio = new Audio(musicUrl);
    audio.volume = volume;
    audio.loop = true;
    audioRef.current = audio;
    // Auto-play may be blocked; will start on user gesture
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [musicUrl, musicEnabled]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const play = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };
  const pause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };
  const togglePlay = () => {
    if (isPlaying) pause();
    else play();
  };

  return (
    <AudioContext.Provider value={{ isPlaying, volume, setVolume, togglePlay, musicEnabled }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => useContext(AudioContext);
