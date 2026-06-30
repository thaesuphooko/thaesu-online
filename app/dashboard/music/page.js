'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

export default function MusicSettingsPage() {
  const [musicUrl, setMusicUrl] = useState('');
  const [volume, setVolume] = useState(0.5);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load current settings from global settings
    adminFetch('/api/admin/settings').then(r => r.json()).then(s => {
      if (s.music_url) setMusicUrl(s.music_url);
      if (s.music_volume) setVolume(parseFloat(s.music_volume));
      if (s.music_enabled) setEnabled(s.music_enabled === 'true');
    });
  }, []);

  const saveSettings = async () => {
    setLoading(true);
    try {
      await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ key: 'music_url', value: musicUrl }),
        headers: { 'Content-Type': 'application/json' },
      });
      await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ key: 'music_volume', value: String(volume) }),
        headers: { 'Content-Type': 'application/json' },
      });
      await adminFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ key: 'music_enabled', value: String(enabled) }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Music settings saved!');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Background Music</h1>
      <Card className="glass-card">
        <CardHeader><CardTitle>Music Source</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">YouTube URL or Direct MP3 Link</label>
            <Input
              value={musicUrl}
              onChange={e => setMusicUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Volume ({Math.round(volume * 100)}%)</label>
            <Slider
              value={[volume]}
              onValueChange={([v]) => setVolume(v)}
              min={0}
              max={1}
              step={0.1}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Enable Music for Visitors</span>
          </div>
          <Button onClick={saveSettings} disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
