'use client';
import { useState, useEffect } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/adminFetch';

export default function KingMusicPlayer() {
  const [url, setUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const [minimized, setMinimized] = useState(true);

  useEffect(() => {
    adminFetch('/api/admin/settings').then(r => r.json()).then(s => {
      if (s.music_url) setUrl(s.music_url);
    }).catch(() => {});
  }, []);

  if (!url) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <div className={`glass-card transition-all duration-300 ${minimized ? 'w-12 h-12' : 'w-72 p-3'}`}>
        {minimized ? (
          <button onClick={() => setMinimized(false)} className="w-full h-full flex items-center justify-center">
            <Music className="w-6 h-6" />
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ambient Music</span>
              <Button variant="ghost" size="icon" onClick={() => setMinimized(true)}>×</Button>
            </div>
            <iframe src={`${url}?autoplay=1`} className="hidden" allow="autoplay" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setPlaying(!playing)}>
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <div className="w-full h-1 bg-gray-200 rounded-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
