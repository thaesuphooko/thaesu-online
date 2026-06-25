'use client';
import { useState, useEffect } from 'react';

export default function ChatPage() {
  const [token, setToken] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [otherUser, setOtherUser] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken && otherUser) fetchMessages(savedToken, otherUser);
  }, [otherUser]);

  const fetchMessages = async (tok, withUser) => {
    const res = await fetch(`/api/chat?with=${withUser}`, { headers: { Authorization: `Bearer ${tok}` } });
    if (res.ok) setMessages(await res.json());
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !otherUser.trim()) return;
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receiver_id: otherUser, content: newMsg })
    });
    setNewMsg('');
    fetchMessages(token, otherUser);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Chat</h1>
      <input value={token} onChange={e => setToken(e.target.value)} placeholder="Your JWT Token" className="w-full p-2 border rounded mb-2" />
      <input value={otherUser} onChange={e => setOtherUser(e.target.value)} placeholder="User ID to chat with" className="w-full p-2 border rounded mb-4" />
      <div className="h-64 overflow-y-auto glass-card p-4 mb-4">
        {messages.map(msg => (
          <div key={msg.id} className="mb-2">
            <p className="text-sm font-bold">{msg.sender_name}</p>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..." className="flex-1 p-2 border rounded" />
        <button onClick={sendMessage} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
      </div>
    </div>
  );
}
