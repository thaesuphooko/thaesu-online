'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Music, X } from 'lucide-react';

export default function GlobalAudioPlayer() {
  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [volume, setVolume] = useState(0.3);
  const [showLyrics, setShowLyrics] = useState(false);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Fetch music settings from admin
  useEffect(() => {
    fetch('/api/admin/music')
      .then(r => r.json())
      .then(s => {
        if (s.music_url) setAudioUrl(s.music_url);
        if (s.music_volume) setVolume(parseFloat(s.music_volume));
      })
      .catch(() => {});
  }, []);

  // Initialize Web Audio API
  const initAudio = useCallback(async () => {
    if (!audioUrl || !audioContextRef.current) return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioCtx;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(audioCtx.destination);
    gainNodeRef.current = gainNode;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    gainNode.connect(analyser);
    analyserRef.current = analyser;

    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(gainNode);
    source.start(0);
    sourceRef.current = source;
    setPlaying(true);
    drawWaveform();
  }, [audioUrl, volume]);

  // Draw live waveform on canvas
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#a78bfa';
      ctx.beginPath();
      const sliceWidth = W / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * H / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(W, H / 2);
      ctx.stroke();
    };
    draw();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceRef.current) sourceRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (!audioUrl) return;
    if (playing) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setPlaying(false);
    } else {
      initAudio();
    }
  };

  if (!audioUrl) return null;

  return (
    <div className="flex items-center">
      {/* Desktop: Waveform + Play/Pause button in Navbar */}
      <button
        onClick={togglePlay}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition"
      >
        <canvas ref={canvasRef} width={40} height={40} className="absolute inset-0 w-full h-full rounded-full" />
        {playing ? <Pause className="w-4 h-4 text-white z-10" /> : <Play className="w-4 h-4 text-white z-10" />}
      </button>

      {/* Lyrics / Audio Center Modal (on long press or click on waveform) */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl"
            onClick={() => setShowLyrics(false)}
          >
            <div className="glass-card w-full max-w-md p-8 space-y-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Now Playing</h2>
                <button onClick={() => setShowLyrics(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full h-32 rounded-2xl overflow-hidden bg-white/5">
                <canvas ref={canvasRef} width={400} height={128} className="w-full h-full" />
              </div>
              <div className="flex items-center justify-center gap-4">
                <button onClick={togglePlay} className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white">
                  {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
              </div>
              <p className="text-center text-white/50 text-sm">Background music playing • Admin panel to change</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
