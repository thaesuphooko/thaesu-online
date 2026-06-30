'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import { Eye, EyeOff, Zap, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const CATEGORIES = {
  media: { label: '🖼️ Media (Cloudinary)', keys: ['CLOUDINARY_URL_1','CLOUDINARY_URL_2','CLOUDINARY_URL_3','CLOUDINARY_URL_4','CLOUDINARY_URL_5','CLOUDINARY_URL_6','CLOUDINARY_URL_7','CLOUDINARY_URL_8','CLOUDINARY_URL_9','CLOUDINARY_URL_10'] },
  notification: { label: '🤖 Telegram Bots', keys: ['telegram_bot_token_1','telegram_user_id','telegram_bot_tokens'] },
  core: { label: '🔑 Core Credentials', keys: ['NEON_DATABASE_URL','UPSTASH_REDIS_URL','UPSTASH_REDIS_TOKEN','DEEPSEEK_API_KEY','SCRAPER_API_KEY','ADMIN_HASH'] },
  site: { label: '🌐 Site Identity', keys: ['site_title','site_logo','site_favicon','meta_description','meta_keywords','og_image'] },
  theme: { label: '🎨 Theme & Layout', keys: ['theme'] },
};

const DESCRIPTIONS = {
  'CLOUDINARY_URL_1': 'Cloudinary account 1 (format: cloudinary://api_key:api_secret@cloud_name)',
  'NEON_DATABASE_URL': 'PostgreSQL connection string',
  'DEEPSEEK_API_KEY': 'AI admin API key',
  'theme': 'JSON object: {"primary":"#C8A27A","secondary":"#4F46E5","background":"#FDFBF7","font":"Pyidaungsu","mode":"light"}',
};

export default function SettingsPage() {
  const [envEntries, setEnvEntries] = useState({});
  const [editKey, setEditKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [activeTab, setActiveTab] = useState('media');

  const fetchSettings = async () => {
    const res = await adminFetch('/api/admin/settings');
    if (res.ok) setEnvEntries(await res.json());
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    await adminFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ key: editKey, value: editValue }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success('Setting saved & server restarted');
    setEditKey(null);
    fetchSettings();
  };

  const testConnection = async (key) => {
    const action = key.startsWith('CLOUDINARY') ? 'test-cloudinary' : 'test-telegram';
    const res = await adminFetch('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ action, key }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setTestResult({ key, ...data });
  };

  const updateThemeField = (field, value) => {
    let themeObj = {};
    try { themeObj = JSON.parse(envEntries.theme || '{}'); } catch {}
    themeObj[field] = value;
    const newTheme = JSON.stringify(themeObj);
    setEnvEntries(prev => ({ ...prev, theme: newTheme }));
    adminFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ key: 'theme', value: newTheme }),
      headers: { 'Content-Type': 'application/json' },
    }).then(() => toast.success('Theme updated'));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Ultra Settings</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(CATEGORIES).map(([id, cat]) => (
            <TabsTrigger key={id} value={id} className="text-xs">{cat.label}</TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(CATEGORIES).map(([id, cat]) => (
          <TabsContent key={id} value={id} className="space-y-3">
            {id === 'theme' ? (
              <div className="glass-card p-6 space-y-4">
                <h2 className="text-lg font-bold">Website Theme</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm">Primary Color</label>
                    <input type="color" defaultValue={(() => { try { return JSON.parse(envEntries.theme||'{}').primary || '#C8A27A'; } catch { return '#C8A27A'; } })()} onChange={e => updateThemeField('primary', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-sm">Secondary Color</label>
                    <input type="color" defaultValue={(() => { try { return JSON.parse(envEntries.theme||'{}').secondary || '#4F46E5'; } catch { return '#4F46E5'; } })()} onChange={e => updateThemeField('secondary', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-sm">Background Color</label>
                    <input type="color" defaultValue={(() => { try { return JSON.parse(envEntries.theme||'{}').background || '#FDFBF7'; } catch { return '#FDFBF7'; } })()} onChange={e => updateThemeField('background', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-sm">Font Family</label>
                    <select defaultValue={(() => { try { return JSON.parse(envEntries.theme||'{}').font || 'Pyidaungsu'; } catch { return 'Pyidaungsu'; } })()} onChange={e => updateThemeField('font', e.target.value)} className="w-full p-2 border rounded">
                      <option value="Pyidaungsu">Pyidaungsu (Myanmar)</option>
                      <option value="Noto Sans">Noto Sans</option>
                      <option value="Inter">Inter</option>
                      <option value="Poppins">Poppins</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm">Mode</label>
                    <select defaultValue={(() => { try { return JSON.parse(envEntries.theme||'{}').mode || 'light'; } catch { return 'light'; } })()} onChange={e => updateThemeField('mode', e.target.value)} className="w-full p-2 border rounded">
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              cat.keys.map(k => (
                <div key={k} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-mono text-sm font-semibold">{k}</p>
                    <p className="text-xs text-muted-foreground">{DESCRIPTIONS[k] || ''}</p>
                    <p className="text-xs mt-1">
                      {showSecret ? (envEntries[k] || '') : '•'.repeat(Math.min((envEntries[k] || '').length, 20))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    {(k.startsWith('CLOUDINARY') || k.includes('telegram')) && (
                      <Button variant="outline" size="sm" onClick={() => testConnection(k)} className="gap-1">
                        <Zap className="w-3 h-3" /> Test
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { setEditKey(k); setEditValue(envEntries[k] || ''); }}>Edit</Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {editKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Edit {editKey}</h2>
            <Input value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="New value" type={showSecret ? 'text' : 'password'} />
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setEditKey(null)}>Cancel</Button>
              <Button onClick={handleSave}>Save & Restart</Button>
            </div>
          </div>
        </div>
      )}

      {testResult && (
        <div className="fixed bottom-4 right-4 glass-card p-4 z-50">
          <div className="flex items-center gap-2">
            {testResult.success ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
            <span>{testResult.key}: {testResult.success ? 'Connected' : testResult.error || 'Failed'}</span>
            <Button variant="ghost" size="icon" onClick={() => setTestResult(null)}>×</Button>
          </div>
        </div>
      )}
    </div>
  );
}
