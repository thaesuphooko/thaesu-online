'use client';
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const fetchNotifs = () => {
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setNotifications(d.notifications); setUnread(d.unread); });
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id) => {
    const token = localStorage.getItem('token');
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-2 relative">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:10 }}
            className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 max-h-80 overflow-y-auto"
          >
            <h4 className="text-sm font-bold p-2 border-b border-zinc-800">Notifications</h4>
            {notifications.length === 0 && <p className="text-zinc-500 text-sm p-4">No notifications</p>}
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.read) markRead(n.id); }}
                className={`p-2 rounded-lg mb-1 cursor-pointer ${n.read ? 'text-zinc-500' : 'text-white bg-purple-500/10'}`}
              >
                <p className="text-xs">{n.message}</p>
                <span className="text-[10px] text-zinc-500">{new Date(n.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
