"use client";
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export default function MusicController() {
  const [url, setUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('Thaesu Radio');
  const [accent, setAccent] = useState('#a855f7');
  const [file, setFile] = useState(null);
  const [state, setState] = useState({
    playing: false,
    volume: 0.5,
    speed: 1.0,
    currentTime: 0,
    url: '',
  });

  const fetchState = async () => {
    const res = await fetch('/api/music-config');
    const data = await res.json();
    setState(data);
    if (data.url) setUrl(data.url);
    if (data.title) setTitle(data.title);
    if (data.accentColor) setAccent(data.accentColor);
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateState = async (patch) => {
    // Optimistic local update
    setState(prev => ({ ...prev, ...patch }));
    await fetch('/api/music-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  };

  const handleFileUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    // (simplified: assume you have a file upload API returning a URL)
    const formData = new FormData();
    formData.append('file', f);
    const res = await fetch('/api/admin/upload-audio', { method: 'POST', body: formData });
    const { audioUrl } = await res.json();
    setUrl(audioUrl);
    updateState({ url: audioUrl });
  };

  const handleYouTubeSubmit = async () => {
    const res = await fetch('/api/admin/youtube-audio', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({url: youtubeUrl}) });
    const data = await res.json();
    if (data.audioUrl) {
      setUrl(data.audioUrl);
      updateState({ url: data.audioUrl, title: data.title || 'YouTube Audio' });
      setTitle(data.title || 'YouTube Audio');
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🎵 Music Controller</h1>
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Audio File Upload</label>
            <Input type="file" accept="audio/*" onChange={handleFileUpload} />
          </div>
          <div>
            <label className="text-sm">YouTube URL</label>
            <div className="flex gap-2">
              <Input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtu.be/..." />
              <Button onClick={handleYouTubeSubmit}>Extract</Button>
            </div>
          </div>
          <div>
            <label className="text-sm">Direct Audio URL</label>
            <Input value={url} onChange={e => setUrl(e.target.value)} onBlur={() => updateState({ url })} />
          </div>
          <div>
            <label className="text-sm">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => updateState({ title })} />
          </div>
          <div>
            <label className="text-sm">Accent Color</label>
            <Input type="color" value={accent} onChange={e => { setAccent(e.target.value); updateState({ accentColor: e.target.value }); }} className="w-16 h-10" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={() => updateState({ playing: !state.playing })}>
            {state.playing ? '⏸ Pause' : '▶ Play'}
          </Button>
          <div className="flex-1">
            <label className="text-sm">Volume</label>
            <Slider min={0} max={1} step={0.01} value={[state.volume]} onValueChange={([v]) => updateState({ volume: v })} />
          </div>
          <div>
            <label className="text-sm">Speed</label>
            <Select value={state.speed} onChange={e => updateState({ speed: parseFloat(e.target.value) })}>
              <option value={0.5}>0.5x</option>
              <option value={1.0}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2x</option>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => updateState({ currentTime: Math.max(0, state.currentTime - 10) })}>⏪ -10s</Button>
          <div className="flex-1">
            <label className="text-sm">Progress</label>
            <input
              type="range" min={0} max={300} value={state.currentTime}
              onChange={e => updateState({ currentTime: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <Button onClick={() => updateState({ currentTime: state.currentTime + 10 })}>⏩ +10s</Button>
          <span className="text-sm">{Math.floor(state.currentTime/60)}:{String(Math.floor(state.currentTime%60)).padStart(2,'0')}</span>
        </div>
      </Card>
    </div>
  );
}
