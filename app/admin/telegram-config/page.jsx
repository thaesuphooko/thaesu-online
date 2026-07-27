'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Save, Trash2, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';

export default function TelegramConfigPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form state
  const [botToken, setBotToken] = useState('');
  const [userIds, setUserIds] = useState('');
  const [notifyOrder, setNotifyOrder] = useState(true);
  const [notifyLowstock, setNotifyLowstock] = useState(true);
  const [notifyCrawler, setNotifyCrawler] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/telegram-config');
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setBotToken(data.config.bot_token || '');
        setUserIds(data.config.user_ids || '');
        setNotifyOrder(data.config.notify_order);
        setNotifyLowstock(data.config.notify_lowstock);
        setNotifyCrawler(data.config.notify_crawler);
      }
    } catch (e) {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!botToken.trim() || !userIds.trim()) {
      toast.error('Bot Token and User IDs are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/telegram-config', {
        method: config?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: config?.id,
          bot_token: botToken.trim(),
          user_ids: userIds.trim(),
          notify_order: notifyOrder,
          notify_lowstock: notifyLowstock,
          notify_crawler: notifyCrawler,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Configuration saved');
        setConfig(data.config || data);
        fetchConfig(); // refresh
      } else {
        toast.error(data.error || 'Save failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config) return toast.error('Save the configuration first');
    setTesting(true);
    try {
      const res = await fetch('/api/admin/telegram-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: userIds.split(',')[0]?.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Test message sent! Check your Telegram.');
      } else {
        toast.error(data.error || 'Test failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Deactivate all Telegram configurations?')) return;
    try {
      const res = await fetch('/api/admin/telegram-config', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Configurations deactivated');
        setConfig(null);
        setBotToken(''); setUserIds('');
      }
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-purple-400" />
          Telegram Configuration
        </h1>
        <Badge variant={config?.is_active ? 'default' : 'secondary'}>
          {config?.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-lg">Bot Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bot_token">Bot Token *</Label>
            <Input
              id="bot_token"
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              placeholder="123456:ABC-DEF1234..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="user_ids">User IDs *</Label>
            <Textarea
              id="user_ids"
              value={userIds}
              onChange={e => setUserIds(e.target.value)}
              placeholder="Comma‑separated chat IDs, e.g. 12345,67890"
              rows={2}
              className="mt-1"
            />
            <p className="text-xs text-zinc-500 mt-1">
              First ID will be used for test notifications.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-lg">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notify_order">Order Notifications</Label>
            <Switch id="notify_order" checked={notifyOrder} onCheckedChange={setNotifyOrder} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify_lowstock">Low Stock Alerts</Label>
            <Switch id="notify_lowstock" checked={notifyLowstock} onCheckedChange={setNotifyLowstock} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify_crawler">Crawler Alerts</Label>
            <Switch id="notify_crawler" checked={notifyCrawler} onCheckedChange={setNotifyCrawler} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        {config && (
          <Button variant="outline" onClick={handleDelete} className="text-red-500 hover:text-red-700">
            <Trash2 className="w-4 h-4 mr-2" /> Deactivate
          </Button>
        )}
        <Button variant="outline" onClick={handleTest} disabled={!config || testing}>
          {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Test
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {config ? 'Update' : 'Save'}
        </Button>
      </div>
    </motion.div>
  );
}
