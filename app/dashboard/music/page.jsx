"use client";
import { useState, useEffect, useRef } from 'react';

export default function MusicAdmin() {
  const [urlInput, setUrlInput] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState({
    playing: false, volume: 0.5, speed: 1.0, visualizerType: 'Floating',
    enabled: true, title: 'Thaesu Radio', accentColor: '#a855f7',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Default URL
  });

  const localAudioRef = useRef(null);
  const [localPlaying, setLocalPlaying] = useState(false);

  const fetchState = () => fetch('/api/music-config').then(r => r.json()).then(d => { if (d) setState(prev => ({ ...prev, ...d })); });
  useEffect(() => { fetchState(); const i = setInterval(fetchState, 3000); return () => clearInterval(i); }, []);

  const update = (patch) => {
    setState(prev => {
      const n = { ...prev, ...patch };
      fetch('/api/music-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(n) });
      return n;
    });
  };

  const remotePlayPause = () => update({ playing: !state.playing });

  const toggleLocalPreview = () => {
    if (!state.url) return alert('No audio URL set. Please enter an MP3 URL first.');
    if (localPlaying) {
      if (localAudioRef.current) {
        localAudioRef.current.pause();
        localAudioRef.current = null;
      }
      setLocalPlaying(false);
    } else {
      const audio = new Audio(state.url);
      audio.loop = true;
      audio.volume = state.volume;
      audio.play()
        .then(() => setLocalPlaying(true))
        .catch(err => alert('Preview play failed: ' + err.message));
      localAudioRef.current = audio;
      audio.addEventListener('pause', () => setLocalPlaying(false));
      audio.addEventListener('error', (e) => {
        alert('Audio file cannot be loaded. Check the URL.');
        setLocalPlaying(false);
      });
    }
  };

  const playUrl = () => { if (urlInput.trim()) { update({ url: urlInput.trim(), playing: true, currentTime: 0 }); setUrlInput(''); } };
  const uploadFile = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/admin/upload-audio', { method: 'POST', body: fd });
    const { audioUrl } = await res.json();
    if (audioUrl) update({ url: audioUrl, title: file.name.replace(/\.[^/.]+$/, ''), playing: true, currentTime: 0 });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8 text-white">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">🎵 Music Remote Controller</h1>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-5">
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">Music Engine</span>
            <button onClick={() => update({ enabled: !state.enabled })}
              className={`w-14 h-7 rounded-full transition-colors ${state.enabled ? 'bg-purple-600' : 'bg-gray-600'}`}>
              <div className={`w-6 h-6 rounded-full bg-white shadow transform transition-transform ${state.enabled ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* MP3 URL */}
          <div>
            <label className="text-sm text-gray-300 mb-1 block">MP3 Audio URL</label>
            <div className="flex gap-2">
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://...mp3"
                className="flex-1 bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none" />
              <button onClick={playUrl} disabled={!urlInput.trim()}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition disabled:opacity-50">
                ▶ Play
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="text-sm text-gray-300 mb-1 block">Or Upload MP3 File</label>
            <div className="flex gap-2">
              <input type="file" accept="audio/*" onChange={e => setFile(e.target.files[0])}
                className="flex-1 bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-sm file:bg-gray-700 file:text-white file:border-0 file:rounded file:px-3 file:py-1" />
              <button onClick={uploadFile} disabled={!file || loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold transition disabled:opacity-50">
                Upload & Play
              </button>
            </div>
          </div>

          {/* Visualizer Style */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">Visualizer</span>
            <select value={state.visualizerType} onChange={e => update({ visualizerType: e.target.value })}
              className="bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-sm">
              <option value="Floating">🫧 Floating Bubble</option>
              <option value="Hidden">🚫 Hidden</option>
            </select>
          </div>

          {/* Volume & Speed */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300 flex justify-between">
                Volume <span className="text-purple-400">{Math.round(state.volume * 100)}%</span>
              </label>
              <input type="range" min="0" max="1" step="0.01" value={state.volume}
                onChange={e => update({ volume: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-1" />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Speed</label>
              <select value={state.speed} onChange={e => update({ speed: parseFloat(e.target.value) })}
                className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-sm">
                <option value="0.5">0.5x</option>
                <option value="1.0">1x</option>
                <option value="1.5">1.5x</option>
                <option value="2.0">2x</option>
              </select>
            </div>
          </div>

          {/* Remote Play/Pause for Website */}
          <button onClick={remotePlayPause}
            className={`w-full py-3 rounded-xl font-bold text-lg transition ${state.playing ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'}`}>
            {state.playing ? '⏸ Pause Website Music' : '▶ Play Website Music'}
          </button>

          <hr className="border-gray-700" />

          {/* Preview on Admin Section */}
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-400">🔊 Preview on Admin Panel</h3>
            <p className="text-xs text-gray-500">Listen directly from this page (for testing)</p>
            <button onClick={toggleLocalPreview}
              className={`w-full py-2 rounded-lg font-bold transition ${localPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
              {localPlaying ? '⏹ Stop Preview' : '▶ Preview Current Audio'}
            </button>
            {localPlaying && <p className="text-xs text-green-400">Preview playing…</p>}
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-sm text-gray-400 space-y-1">
          <p>Current Track: <span className="text-white">{state.title}</span></p>
          <p>Current URL: <span className="text-white text-xs truncate">{state.url}</span></p>
          <p>Website Status: <span className={state.playing ? 'text-green-400' : 'text-gray-400'}>{state.playing ? 'Playing' : 'Paused'}</span></p>
          <p>Visualizer: <span className="text-white">{state.visualizerType === 'Floating' ? 'Floating Bubble' : 'Hidden'}</span></p>
        </div>

        <p className="text-xs text-gray-500">
          💡 <strong>အသုံးပြုနည်း</strong><br />
          1. ဝဘ်ဆိုက်ကို သီးသန့် Tab တစ်ခုမှာ ဖွင့်ထားပါ။<br />
          2. Floating Bubble ကို တစ်ချက်နှိပ်ပါ (အသံစရန်)။<br />
          3. Admin Panel မှ သီချင်းလင့်ခ်ထည့်၊ Play နှိပ်ပါ။<br />
          4. ဝဘ်ဆိုက်မှာ အသံထွက်လာပါမည်။ ဤနေရာမှ Preview ခလုတ်ဖြင့် Admin Panel မှာလည်း တိုက်ရိုက်နားဆင်နိုင်ပါသည်။
        </p>
      </div>
    </div>
  );
}
