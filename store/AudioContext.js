'use client';
import { createContext, useContext, useRef, useState, useEffect } from 'react';

const AudioContext = createContext();

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [currentTrack, setCurrentTrack] = useState(0);
  const tracks = ['/audio/ambient1.mp3', '/audio/ambient2.mp3']; // ကိုယ်ထည့်ထားတဲ့ ဖိုင်တွေ

  // Initialize audio element only once (client side)
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;
    audioRef.current.loop = true;
    audioRef.current.src = tracks[currentTrack];

    return () => {
      audioRef.current.pause();
      audioRef.current = null;
    };
  }, []);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Play function – must be called after user gesture
  const play = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {}); // ignore autoplay blocks
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

  const switchTrack = (index) => {
    setCurrentTrack(index);
    if (audioRef.current) {
      audioRef.current.src = tracks[index];
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
  };

  return (
    <AudioContext.Provider value={{ isPlaying, volume, setVolume, togglePlay, switchTrack, tracks, currentTrack }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => useContext(AudioContext);
