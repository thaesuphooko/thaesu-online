'use client';
import { useState } from 'react';

export default function ChatbotPage() {
  const [messages, setMessages] = useState([{ from: 'bot', text: 'Hello! How can I assist you today?' }]);
  const [input, setInput] = useState('');

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { from: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input }),
    });
    const data = await res.json();
    setMessages(prev => [...prev, { from: 'bot', text: data.reply }]);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">AI Customer Support</h1>
      <div className="h-96 overflow-y-auto glass-card p-4 mb-4 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`p-2 rounded-xl ${msg.from === 'user' ? 'bg-blue-100 text-right' : 'bg-gray-100'}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} className="flex-1 p-2 border rounded" placeholder="Type your question..." />
        <button onClick={send} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
      </div>
    </div>
  );
}
