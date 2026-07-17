'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
const Ctx = createContext();

export function AudioProvider({ children }) {
  const [musicState, setMusicState] = useState({
    playing: false, volume: 0.5, speed: 1.0, currentTime: 0,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    accentColor: '#a855f7', title: 'Thaesu Radio',
    enabled: true, visualizerType: 'Floating', visualizerAlign: 'left',
    visualizerOffsetY: 0, visualizerOffsetX: 0,
  });
  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const pollingRef = useRef(null);

  const sync = useCallback(async () => {
    try {
      const res = await fetch('/api/music-config');
      const data = await res.json();
      setMusicState(prev => {
        const next = { ...prev, ...data };
        const a = audioRef.current;
        if (a) {
          if (next.url && next.url !== prev.url) { a.src = next.url; a.load(); }
          a.volume = next.volume;
          a.playbackRate = next.speed;
          if (next.playing && a.paused && next.url) {
            a.currentTime = next.currentTime || 0;
            a.play().catch(() => {});
          } else if (!next.playing && !a.paused) { a.pause(); }
          if (Math.abs(next.currentTime - a.currentTime) > 2) a.currentTime = next.currentTime;
        }
        return next;
      });
    } catch (e) {}
  }, []);

  useEffect(() => { sync(); pollingRef.current = setInterval(sync, 2000); return () => clearInterval(pollingRef.current); }, [sync]);

  useEffect(() => {
    const a = new Audio();
    a.loop = true;
    a.volume = musicState.volume;
    a.playbackRate = musicState.speed;
    audioRef.current = a;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      try {
        const ctx = new AudioCtx();
        const ana = ctx.createAnalyser();
        ana.fftSize = 64;
        const src = ctx.createMediaElementSource(a);
        src.connect(ana); ana.connect(ctx.destination);
        analyserRef.current = ana;
      } catch(e) {}
    }
    return () => { a.pause(); audioRef.current = null; };
  }, []);

  const togglePlayLocal = useCallback(() => {
    const a = audioRef.current;
    if (!a || !musicState.url) return;
    if (a.paused) { a.currentTime = musicState.currentTime || 0; a.play().catch(() => {}); }
    else { a.pause(); }
    const playing = !a.paused;
    setMusicState(prev => ({ ...prev, playing }));
    fetch('/api/music-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playing }) });
  }, [musicState.url, musicState.currentTime]);

  return <Ctx.Provider value={{ musicState, audioRef, analyserRef, togglePlayLocal }}>{children}</Ctx.Provider>;
}
export const useAudio = () => useContext(Ctx);
