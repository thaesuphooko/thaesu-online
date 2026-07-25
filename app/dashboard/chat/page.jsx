'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Send, User, Loader2, Search, ChevronDown } from 'lucide-react';

const SOCKET_URL = typeof window !== 'undefined' ? window.location.origin : '';

export default function AdminChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const socketRef = useRef(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const chatEndRef = useRef(null);

  // Socket connection
  useEffect(() => {
    const socket = io(SOCKET_URL, { path: '/api/chat/socket' });
    socketRef.current = socket;
    socket.emit('join', { token });
    socket.on('new message', (msg) => {
      if (activeConv && msg.conversation_id === activeConv) {
        setMessages(prev => [...prev, msg]);
      }
      fetchConversations();
    });
    socket.on('typing', ({ conversationId, userId }) => {
      if (conversationId === activeConv) setTyping(true);
      setTimeout(() => setTyping(false), 3000);
    });
    return () => socket.disconnect();
  }, [activeConv, token]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/chat/conversations', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (e) {}
  }, [token]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const selectConversation = (conv) => {
    setActiveConv(conv.id);
    fetch(`/api/admin/chat/messages/${conv.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setMessages(data.messages || []));
  };

  const sendMessage = () => {
    if (!input.trim() || !activeConv) return;
    const conv = conversations.find(c => c.id === activeConv);
    socketRef.current.emit('admin message', {
      conversationId: activeConv,
      message: input,
      customerId: conv.customer_uid || activeConv
    });
    setInput('');
  };

  const filteredConversations = conversations.filter(c =>
    (c.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.last_message || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-black text-white">
      {/* Sidebar */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold mb-2">Conversations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-800 rounded-lg text-sm text-white outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map(c => (
            <button
              key={c.id}
              onClick={() => selectConversation(c)}
              className={`w-full text-left p-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition ${
                activeConv === c.id ? 'bg-purple-500/20 border-l-2 border-purple-500' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm truncate">{c.customer_name || 'Customer'}</p>
                <span className="text-xs text-zinc-500">{new Date(c.last_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
              </div>
              <p className="text-xs text-zinc-400 truncate mt-1">{c.last_message}</p>
              {c.unread > 0 && <span className="inline-block bg-purple-600 text-white text-xs rounded-full px-2 py-0.5 mt-1">{c.unread}</span>}
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <p className="text-zinc-500 text-sm p-4">No conversations found.</p>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConv ? (
          <>
            <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm">
                {conversations.find(c=>c.id===activeConv)?.customer_name?.[0] || 'C'}
              </div>
              <div>
                <p className="font-medium">{conversations.find(c=>c.id===activeConv)?.customer_name || 'Customer'}</p>
                {typing && <p className="text-xs text-zinc-400">Typing...</p>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-xl ${
                    msg.sender_role === 'admin' ? 'bg-purple-600' :
                    msg.sender_role === 'ai' ? 'bg-blue-600' :
                    'bg-zinc-700'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <span className="text-[10px] text-white/60 mt-1 block">
                      {msg.sender_role === 'ai' ? '🤖 AI' :
                       msg.sender_role === 'admin' ? 'Admin' : 'Customer'}
                    </span>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <div className="text-zinc-500 text-center py-10">No messages yet.</div>}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-zinc-800 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Admin reply..."
                className="flex-1 p-2 bg-zinc-800 rounded-xl text-white outline-none"
              />
              <button onClick={sendMessage} className="p-2 bg-purple-600 rounded-xl">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
