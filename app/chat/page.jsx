'use client';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, Loader2, Wifi, WifiOff, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_URL = typeof window !== 'undefined' ? window.location.origin : '';

const getCurrentUser = () => {
  if (typeof window !== 'undefined') {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  }
  return null;
};

// Quick reply suggestions (can be customized)
const QUICK_REPLIES = [
  'ပစ္စည်းဘယ်တော့ရောက်မလဲ',
  'ဈေးနှုန်းလေး ပြောပြပေးပါ',
  'အော်ဒါခြေရာခံချင်ပါတယ်',
  'ကျေးဇူးတင်ပါတယ်',
];

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const conversationId = 'general';

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (!u) {
      setLoading(false);
      return;
    }
    const socket = io(SOCKET_URL, { path: '/api/chat/socket' });
    socketRef.current = socket;
    socket.emit('join', { token: localStorage.getItem('token') });

    socket.on('new message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('admin online', () => setAdminOnline(true));
    socket.on('admin offline', () => setAdminOnline(false));
    socket.on('typing', () => setAdminTyping(true));
    socket.on('stop typing', () => setAdminTyping(false));

    socket.on('connect', () => setLoading(false));
    socket.on('disconnect', () => setLoading(false));

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, adminTyping]);

  const sendMessage = (text) => {
    const msg = text || input;
    if (!msg.trim() || !user) return;
    socketRef.current.emit('customer message', { conversationId, message: msg });
    setInput('');
  };

  const handleTyping = () => {
    if (socketRef.current) {
      socketRef.current.emit('typing', { conversationId, to: 'admins' });
      setTimeout(() => {
        socketRef.current.emit('stop typing', { conversationId, to: 'admins' });
      }, 2000);
    }
  };

  if (!user) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 text-center max-w-sm">
        <h2 className="text-2xl font-bold mb-2">💬 Support Chat</h2>
        <p className="text-zinc-400 mb-6">Please login to start chatting with our team.</p>
        <a href="/auth/login" className="inline-block px-6 py-3 bg-purple-600 rounded-xl font-bold">Login</a>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-2xl border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
            CS
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black ${adminOnline ? 'bg-green-500' : 'bg-zinc-500'}`} />
        </div>
        <div>
          <h1 className="font-bold text-sm">Customer Support</h1>
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            {adminOnline ? (
              <><Wifi className="w-3 h-3 text-green-400" /> Online</>
            ) : (
              <><WifiOff className="w-3 h-3 text-zinc-500" /> Offline - AI will reply</>
            )}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <div className="text-center">
              <p className="text-lg mb-2">👋 မင်္ဂလာပါ!</p>
              <p className="text-sm">စာရိုက်ပြီး စတင်မေးမြန်းနိုင်ပါပြီ။</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg, i) => {
              const isCustomer = msg.sender_role === 'customer';
              return (
                <motion.div
                  key={msg.id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    isCustomer
                      ? 'bg-purple-600 rounded-br-sm'
                      : msg.sender_role === 'ai'
                        ? 'bg-blue-600/80 rounded-bl-sm'
                        : 'bg-zinc-700/80 rounded-bl-sm'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-white/50">
                        {msg.sender_role === 'ai' ? '🤖 AI' : msg.sender_role === 'admin' ? 'Admin' : 'You'}
                      </span>
                      {isCustomer && (
                        msg.read ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3 text-white/40" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        {adminTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-zinc-400 text-sm pl-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
              <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
              <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
            </div>
            Admin is typing...
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
        {QUICK_REPLIES.map((reply, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(reply)}
            className="whitespace-nowrap px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300 hover:bg-zinc-700 transition flex-shrink-0"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-800 bg-black/40 backdrop-blur-xl">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="စာရိုက်ပါ..."
            className="flex-1 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            className="p-3 bg-purple-600 rounded-xl hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
