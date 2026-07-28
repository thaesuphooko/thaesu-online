'use client';

import {
  useState, useCallback, useEffect, useRef, memo
} from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

// ─── Confetti hearts burst ─────────────────────
const fireHearts = () => {
  confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.6, x: 0.5 },
    shapes: [confetti.shapeFromText({ text: '❤️', scalar: 2 })],
    scalar: 0.8,
    gravity: 0.5,
    ticks: 100,
  });
  setTimeout(() => {
    confetti({
      particleCount: 20,
      spread: 30,
      origin: { y: 0.6, x: 0.5 },
      shapes: ['circle'],
      colors: ['#ff69b4', '#ff1493', '#ffb6c1'],
    });
  }, 80);
};

// ─── Ripple effect helper (memory‑safe) ────────
const useRipple = (ref) => {
  const createRipple = (e) => {
    const button = ref.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
    `;
    button.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  };

  useEffect(() => {
    if (!document.getElementById('ripple-keyframes')) {
      const style = document.createElement('style');
      style.id = 'ripple-keyframes';
      style.textContent = `
        @keyframes ripple {
          to { transform: scale(4); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    // No cleanup needed for style, it's global
  }, []);

  return createRipple;
};

const LikeButton = memo(function LikeButton({ postId, initialLiked = false, initialCount = 0 }) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef(null);
  const ripple = useRipple(buttonRef);

  // Real‑time socket sync
  useEffect(() => {
    const io = global.io;
    if (!io) return;
    const handler = (data) => {
      if (data.postId === postId) {
        setLiked(data.liked);
        setCount(data.likesCount);
      }
    };
    io.on('like:update', handler);
    return () => io.off('like:update', handler);
  }, [postId]);

  // Retry with exponential backoff (inside component for isolation)
  const fetchWithRetry = useCallback(async (url, options, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, options);
        if (res.ok) return res;
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Request failed');
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }, []);

  const toggle = useCallback(async (e) => {
    if (pending) return;
    setPending(true);
    ripple(e);

    // Optimistic update
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to like');
        router.push('/auth/login');
        throw new Error('Authentication required'); // stops execution
      }

      const res = await fetchWithRetry(`/api/social/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Like failed');
      setLiked(data.liked);
      setCount(data.likes_count);
      if (data.liked) fireHearts();
    } catch (err) {
      // Rollback only if the error is not a login redirect
      if (err.message !== 'Authentication required') {
        setLiked(prevLiked);
        setCount(prevCount);
        toast.error(err.message);
      }
    } finally {
      setPending(false);
    }
  }, [postId, liked, count, pending, router, ripple, fetchWithRetry]);

  return (
    <div className="relative inline-flex items-center">
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 border border-white/10 text-xs text-white rounded-md whitespace-nowrap z-10"
          >
            {liked ? 'Unlike' : 'Like'}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={buttonRef}
        onClick={toggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={pending}
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.05 }}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-md transition-colors disabled:opacity-50 overflow-hidden ${
          liked
            ? 'bg-pink-500/10 border-pink-500/30 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.3)]'
            : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-pink-500/10 hover:text-pink-400'
        }`}
        aria-label={liked ? 'Unlike' : 'Like'}
        aria-pressed={liked}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={liked ? 'liked' : 'unliked'}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.span
            key={count}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-medium"
          >
            {count}
          </motion.span>
        </AnimatePresence>
        {liked && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle,rgba(255,105,180,0.4)_0%,transparent_70%)]" />
          </motion.div>
        )}
      </motion.button>
    </div>
  );
});

export default LikeButton;
