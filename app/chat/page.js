'use client';
import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatPage() {
  const [token, setToken] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [profile, setProfile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const tok = localStorage.getItem('adminToken') || '';
    setToken(tok);
    if (tok) {
      fetch('/api/user/profile', { headers: { Authorization: `Bearer ${tok}` } }).then(r => r.json()).then(d => setProfile(d));
      fetch('/api/chat/contacts', { headers: { Authorization: `Bearer ${tok}` } }).then(r => r.json()).then(d => setContacts(d));
    }
  }, []);

  // If not logged in, set activeContact to a special AI contact
  useEffect(() => {
    if (!token) {
      setActiveContact({ id: 'ai', name: 'Thaesu AI', email: 'ai@thaesu.com' });
    }
  }, [token]);

  // Load messages when activeContact changes
  useEffect(() => {
    if (!activeContact) return;
    if (activeContact.id === 'ai') {
      // AI chat: show default greeting and handle via /api/chatbot
      setMessages([{ id: 0, sender_id: 'ai', content: 'Hello! How can I help you?', created_at: new Date().toISOString() }]);
      return;
    }
    if (!token) return;
    const fetchMessages = async () => {
      const res = await fetch(`/api/chat?with=${activeContact.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMessages((await res.json()).reverse());
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [activeContact, token]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeContact) return;
    if (activeContact.id === 'ai') {
      // Send to AI chatbot
      const userMsg = { id: Date.now(), sender_id: 'user', content: newMsg, created_at: new Date().toISOString() };
      setMessages(prev => [...prev, userMsg]);
      setNewMsg('');
      const res = await fetch('/api/chatbot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: newMsg }) });
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now() + 1, sender_id: 'ai', content: data.reply, created_at: new Date().toISOString() }]);
      return;
    }
    // User to user chat
    await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ receiver_id: activeContact.id, content: newMsg }) });
    setNewMsg('');
    const res = await fetch(`/api/chat?with=${activeContact.id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setMessages((await res.json()).reverse());
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] pb-16">
      {token && (
        <div className="w-1/3 border-r border-border p-4 hidden md:block">
          <h2 className="font-bold mb-4">Chats</h2>
          {contacts.map(c => (
            <div key={c.id} onClick={() => setActiveContact(c)} className={`p-3 rounded-xl cursor-pointer transition ${activeContact?.id === c.id ? 'bg-primary/10' : 'hover:bg-secondary'}`}>
              <div className="font-semibold">{c.full_name}</div>
              <div className="text-sm text-muted-foreground">{c.email}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 flex flex-col">
        {activeContact ? (
          <>
            <div className="p-4 border-b border-border font-semibold">{activeContact.id === 'ai' ? 'Thaesu AI Assistant' : activeContact.full_name || activeContact.name}</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${(msg.sender_id === profile?.id || msg.sender_id === 'user') ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${(msg.sender_id === profile?.id || msg.sender_id === 'user') ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                    <p>{msg.content}</p>
                    <p className="text-[10px] mt-1 opacity-70">{new Date(msg.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={activeContact.id === 'ai' ? 'Ask me anything...' : 'Type a message...'} className="flex-1 bg-transparent border rounded-xl px-4 py-2 outline-none" />
              <Button onClick={sendMessage} size="icon"><Send className="w-5 h-5" /></Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a contact or log in to chat</div>
        )}
      </div>
    </div>
  );
}
