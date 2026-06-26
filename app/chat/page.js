'use client';
import { useState, useEffect, useRef } from 'react';

export default function ChatPage() {
  const [token, setToken] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [otherUser, setOtherUser] = useState('');
  const [profile, setProfile] = useState(null);
  const chatEndRef = useRef(null);

  // Auto‑scroll to bottom
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) {
      fetch('/api/user/profile', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(res => res.json())
        .then(data => setProfile(data));
    }
  }, []);

  // Fetch messages periodically
  useEffect(() => {
    if (!token || !otherUser) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [token, otherUser]);

  const fetchMessages = async () => {
    const res = await fetch(`/api/chat?with=${otherUser}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      // Reverse to show oldest first
      setMessages(data.reverse());
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !otherUser.trim()) return;
    // Optimistic UI
    const tempMsg = {
      id: Date.now().toString(),
      sender_id: profile?.id,
      receiver_id: otherUser,
      content: newMsg,
      sender_name: profile?.full_name || 'You',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMsg('');
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receiver_id: otherUser, content: tempMsg.content }),
    });
    // Refresh to get the actual record
    fetchMessages();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Chat</h1>
      <div className="mb-4 space-y-2">
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="Your JWT Token" className="w-full p-2 border rounded" />
        <input value={otherUser} onChange={e => setOtherUser(e.target.value)} placeholder="User ID to chat with" className="w-full p-2 border rounded" />
      </div>
      <div className="h-80 overflow-y-auto glass-card p-4 mb-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl ${msg.sender_id === profile?.id ? 'bg-blue-100 text-right' : 'bg-gray-100'}`}>
              <p className="text-xs font-semibold">{msg.sender_name}</p>
              <p>{msg.content}</p>
              <p className="text-[10px] text-gray-500 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="flex gap-2">
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 p-2 border rounded" />
        <button onClick={sendMessage} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
      </div>
    </div>
  );
}
