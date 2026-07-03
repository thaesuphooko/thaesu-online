'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AudioContext = createContext();

export function AudioProvider({ children }) {
  const [musicState, setMusicState] = useState({
    playing: false,
    volume: 0.5,
    speed: 1.0,
    currentTime: 0,
    url: '',
    title: 'Thaesu Radio',
    accentColor: '#a855f7',
    enabled: true,
    visualizerType: 'Status Bar',
    visualizerAlign: 'left',
    visualizerOffsetY: 0,
    visualizerOffsetX: 0,
  });
  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const pollingRef = useRef(null);
  const [actualPlaying, setActualPlaying] = useState(false); // real audio state

  // Sync metadata (url, volume, speed, seek) but NOT play/pause
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/music-config');
      const data = await res.json();
      setMusicState(prev => {
        const newState = { ...prev, ...data };
        const audio = audioRef.current;
        if (audio) {
          // apply source change
          if (newState.url && newState.url !== prev.url) {
            audio.src = newState.url;
            audio.load();
          }
          audio.volume = newState.volume;
          audio.playbackRate = newState.speed;
          if (Math.abs(newState.currentTime - audio.currentTime) > 2) {
            audio.currentTime = newState.currentTime;
          }
        }
        return newState;
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchState();
    pollingRef.current = setInterval(fetchState, 1000);
    return () => clearInterval(pollingRef.current);
  }, [fetchState]);

  // Create audio & analyser once
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = musicState.volume;
    audio.playbackRate = musicState.speed;
    audioRef.current = audio;

    const onPlay = () => setActualPlaying(true);
    const onPause = () => setActualPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      try {
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;
      } catch(e) {}
    }
    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audioRef.current = null;
    };
  }, []);

  // Local toggle – only user gesture triggers
  const togglePlayLocal = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !musicState.url) return;
    if (audio.paused) {
      audio.currentTime = musicState.currentTime || 0;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    // sync remote state
    const newPlaying = !audio.paused;
    fetch('/api/music-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playing: newPlaying, currentTime: audio.currentTime }),
    });
  }, [musicState.url, musicState.currentTime]);

  return (
    <AudioContext.Provider value={{
      musicState,
      audioRef,
      analyserRef,
      togglePlayLocal,
      actualPlaying,  // real playing state
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
