'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function TelegramTestPage() {
  const [token, setToken] = useState('');
  const [tokens, setTokens] = useState([]);
  const [chatId, setChatId] = useState('');
  const [results, setResults] = useState({});

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    // Fetch list of tokens (masked) from server
    if (savedToken) {
      fetch('/api/admin/telegram-tokens', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(r => r.json())
        .then(d => setTokens(d.tokens || []));
      // Load Telegram User ID from settings or env
      fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(r => r.json())
        .then(s => { if (s.telegram_user_id) setChatId(s.telegram_user_id); });
    }
  }, []);

  const testToken = async (tokenValue, index) => {
    const res = await fetch('/api/admin/test-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token: tokenValue, chat_id: chatId }),
    });
    const data = await res.json();
    setResults(prev => ({ ...prev, [index]: data }));
  };

  const saveChatId = async () => {
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key: 'telegram_user_id', value: chatId }),
    });
    alert('Chat ID saved');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Telegram Bot Test</h1>
      <div className="mb-4">
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="w-full p-2 border rounded mb-2" />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Telegram Chat ID (Admin)</label>
        <div className="flex gap-2">
          <input value={chatId} onChange={e => setChatId(e.target.value)} placeholder="Your Telegram user ID" className="flex-1 p-2 border rounded" />
          <Button onClick={saveChatId} variant="outline">Save</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tokens.map((tok, i) => (
          <div key={i} className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-sm">Token {i + 1}: {tok.prefix}...</p>
            </div>
            <Button onClick={() => testToken(tok.full, i)} size="sm">Test</Button>
            {results[i] && (
              <span className={`ml-2 text-sm ${results[i].ok ? 'text-green-600' : 'text-red-500'}`}>
                {results[i].ok ? 'OK' : results[i].error || 'Fail'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
