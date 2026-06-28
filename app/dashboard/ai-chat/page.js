'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';
import { Send, Bot, User, Trash2 } from 'lucide-react';

export default function AIChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Load history on mount
  useEffect(() => {
    (async () => {
      const res = await adminFetch('/api/admin/ai-chat');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map(m => ({ role: m.role, content: m.content })));
      } else {
        setMessages([{ role: 'assistant', content: 'Hello! I am your Ultimate AI Admin. How can I help?' }]);
      }
    })();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setInput('');
    setLoading(true);
    // Optimistic UI: add user message immediately
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await adminFetch('/api/admin/ai-chat', {
        method: 'POST',
        body: JSON.stringify({ message: input }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${data.error}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Network error.' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (confirm('Clear all chat history?')) {
      await adminFetch('/api/admin/ai-chat', { method: 'DELETE' });
      setMessages([{ role: 'assistant', content: 'History cleared. How can I help?' }]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">AI Admin</h1>
        <Button variant="ghost" size="icon" onClick={clearHistory} title="Clear history">
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex-1 glass-card p-4 overflow-y-auto mb-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${msg.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-secondary'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask me anything..."
          className="flex-1"
          disabled={loading}
        />
        <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon">
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
