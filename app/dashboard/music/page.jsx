"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MusicAdmin() {
  const [urlInput, setUrlInput] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [state, setState] = useState({
    enabled: true,
    visualizerType: 'Status Bar',
    visualizerAlign: 'left',
    visualizerOffsetY: 0,
    visualizerOffsetX: 0,
    url: '',
    title: 'Thaesu Radio',
    accentColor: '#a855f7',
    playing: false,
    volume: 0.5,
    speed: 1.0,
    currentTime: 0,
    duration: 180
  });

  const fetchState = async () => {
    try {
      const res = await fetch('/api/music-config');
      const data = await res.json();
      if (data) setState(prev => ({ ...prev, ...data }));
    } catch (e) {}
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

  const saveUrl = () => {
    if (!urlInput.trim()) return;
    updateState({ url: urlInput.trim(), playing: true, currentTime: 0 });
    setUrlInput('');
  };

  const updateState = async (patch) => {
    setState(prev => {
      const updated = { ...prev, ...patch };
      fetch('/api/music-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(e => console.error(e));
      return updated;
    });
  };

  const handleFileUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', f);
    try {
      const res = await fetch('/api/admin/upload-audio', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.audioUrl) {
        updateState({ url: data.audioUrl, title: f.name.replace(/\.[^/.]+$/, ""), playing: true, currentTime: 0 });
      }
    } catch (err) { alert("File upload failed"); } finally { setLoading(false); }
  };

  const handleYouTube = async () => {
    if (!youtubeUrl) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/youtube-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        updateState({ url: data.audioUrl, title: data.title || 'YouTube Stream', playing: true, currentTime: 0 });
        setYoutubeUrl('');
      } else { alert(data.error || "YouTube extraction failed"); }
    } catch (err) { alert("Backend extraction error"); } finally { setLoading(false); }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 text-neutral-200 bg-neutral-950 min-h-screen font-sans">
      <div className="flex flex-col gap-1 border-b border-neutral-900 pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-500 to-amber-500 bg-clip-text text-transparent">🎵 Music Remote Controller</h1>
        <p className="text-neutral-400 text-xs">Website ပေါ်ရှိ Visualizer နှင့် သီချင်းဖွင့်စနစ်အား အဝေးမှ ထိန်းချုပ်ရန် (ဖွင့်ရန် ဝက်ဘ်ဆိုက်ပေါ်တွင် Visualizer ကို နှိပ်ပါ)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-neutral-900/60 border-neutral-800 text-white backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-purple-400">1. Engine Switch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                <span className="text-sm">Broadcast Link</span>
                <button 
                  onClick={() => updateState({ enabled: !state.enabled })}
                  className={`w-16 h-8 rounded-full transition-all duration-300 relative p-1 ${state.enabled ? 'bg-purple-600' : 'bg-neutral-800'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${state.enabled ? 'translate-x-8' : 'translate-x-0'}`} />
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/60 border-neutral-800 text-white backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-400">2. Visualizer Position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-neutral-400">Style</label>
                <select value={state.visualizerType} onChange={e => updateState({ visualizerType: e.target.value })} className="w-full h-9 bg-neutral-950 border border-neutral-800 rounded-md px-2 text-sm">
                  <option value="Status Bar">Status Bar</option>
                  <option value="Floating">Floating</option>
                  <option value="Hidden">Hidden</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-neutral-400">Horizontal Align</label>
                <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-md border border-neutral-800">
                  {['left', 'center', 'right'].map(align => (
                    <button key={align} onClick={() => updateState({ visualizerAlign: align })} className={`text-xs py-1.5 rounded ${state.visualizerAlign === align ? 'bg-amber-500 text-black' : 'text-neutral-400'}`}>{align}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><span>Y Offset</span><span className="text-amber-400">{state.visualizerOffsetY}px</span></div>
                <input type="range" min="-50" max="50" value={state.visualizerOffsetY} onChange={e => updateState({ visualizerOffsetY: parseInt(e.target.value) })} className="w-full h-1.5 bg-neutral-800 rounded-lg accent-amber-500" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><span>X Offset</span><span className="text-amber-400">{state.visualizerOffsetX}px</span></div>
                <input type="range" min="-50" max="50" value={state.visualizerOffsetX} onChange={e => updateState({ visualizerOffsetX: parseInt(e.target.value) })} className="w-full h-1.5 bg-neutral-800 rounded-lg accent-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="bg-neutral-900/60 border-neutral-800 text-white">
            <CardHeader><CardTitle className="text-lg font-bold">3. Audio Sources</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs">YouTube URL (VPN လိုအပ်နိုင်)</label>
                <div className="flex gap-2 mt-1">
                  <Input className="bg-neutral-950 border-neutral-800" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtu.be/..." />
                  <Button onClick={handleYouTube} disabled={loading} className="bg-purple-600">{loading ? '...' : 'Extract'}</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs">Upload File</label>
                  <Input type="file" accept="audio/*" onChange={handleFileUpload} className="bg-neutral-950 border-neutral-800 mt-1" />
                </div>
                <div>
                  <label className="text-xs">Direct URL (တိုက်ရိုက်ဖွင့်ရန်)</label>
                  <div className="flex gap-2 mt-1">
                    <Input className="bg-neutral-950 border-neutral-800 flex-1" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://example.com/song.mp3" />
                    <Button onClick={saveUrl} className="bg-amber-600">▶ Play</Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-purple-400 font-bold">Title</label>
                  <Input className="bg-neutral-950 border-neutral-800" value={state.title} onChange={e => updateState({ title: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs">Color</label>
                  <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded border border-neutral-800 mt-1">
                    <input type="color" value={state.accentColor} onChange={e => updateState({ accentColor: e.target.value })} className="w-8 h-6" />
                    <span className="text-xs font-mono">{state.accentColor}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/60 border-neutral-800 border-l-4 border-l-purple-500">
            <CardHeader><CardTitle className="text-lg">4. Controls</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <button onClick={() => updateState({ playing: !state.playing })} className={`w-32 h-12 rounded-lg font-bold text-white ${state.playing ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                  {state.playing ? '⏸ PAUSE' : '▶ PLAY'}
                </button>
                <div className="flex-1">
                  <div className="flex justify-between text-xs"><span>Volume</span><span className="text-purple-400">{Math.round(state.volume * 100)}%</span></div>
                  <input type="range" min="0" max="1" step="0.01" value={state.volume} onChange={e => updateState({ volume: parseFloat(e.target.value) })} className="w-full h-1.5 bg-neutral-800 rounded-lg accent-purple-500" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                <span className="text-sm">Speed</span>
                <select value={state.speed} onChange={e => updateState({ speed: parseFloat(e.target.value) })} className="w-32 h-9 bg-neutral-900 border border-neutral-800 rounded-md">
                  <option value="0.5">0.5x</option>
                  <option value="1.0">1x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2.0">2x</option>
                </select>
              </div>
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                <div className="flex justify-between text-xs font-mono">
                  <span>Timeline</span>
                  <span className="text-purple-400">{Math.floor(state.currentTime/60)}:{String(Math.floor(state.currentTime%60)).padStart(2,'0')} / {Math.floor(state.duration/60)}:{String(Math.floor(state.duration%60)).padStart(2,'0')}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button onClick={() => updateState({ currentTime: Math.max(0, state.currentTime - 10) })} className="text-xs px-2 py-1">⏪ -10s</Button>
                  <input type="range" min="0" max={state.duration || 180} value={state.currentTime} onChange={e => updateState({ currentTime: parseInt(e.target.value) })} className="flex-1 h-1.5 bg-neutral-800 rounded-lg accent-purple-500" />
                  <Button onClick={() => updateState({ currentTime: Math.min(state.duration, state.currentTime + 10) })} className="text-xs px-2 py-1">⏩ +10s</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
