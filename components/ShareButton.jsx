'use client';

import {
  useState, useCallback, useEffect, useRef, memo
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2, Copy, Facebook, MessageCircle, Twitter, Send, Check, Link
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

// ─── Confetti burst ──────────────────────────
const fireConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#a855f7', '#ec4899', '#3b82f6'],
  });
};

// ─── Ripple effect helper ────────────────────
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
  }, []);

  return createRipple;
};

// ─── Share platforms ─────────────────────────
const SHARE_PLATFORMS = [
  {
    id: 'copy',
    label: 'Copy Link',
    icon: Copy,
    color: 'text-zinc-400 hover:text-white',
    action: async (url) => {
      await navigator.clipboard.writeText(url);
      return 'copied';
    },
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    color: 'text-blue-400 hover:text-blue-300',
    action: (url) => {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      return 'shared';
    },
  },
  {
    id: 'messenger',
    label: 'Messenger',
    icon: MessageCircle,
    color: 'text-pink-400 hover:text-pink-300',
    action: (url) => {
      window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=YOUR_APP_ID`, '_blank');
      return 'shared';
    },
  },
  {
    id: 'twitter',
    label: 'Twitter',
    icon: Twitter,
    color: 'text-blue-300 hover:text-blue-200',
    action: (url) => {
      const text = 'Check out this post!';
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
      return 'shared';
    },
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: Send,
    color: 'text-sky-400 hover:text-sky-300',
    action: (url) => {
      const text = 'Check out this post!';
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
      return 'shared';
    },
  },
];

const ShareButton = memo(function ShareButton({ postId, initialShareCount = 0, postUrl }) {
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [isSharing, setIsSharing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const ripple = useRipple(buttonRef);

  const url = postUrl || (typeof window !== 'undefined' ? `${window.location.origin}/post/${postId}` : '');

  // Real‑time socket listener
  useEffect(() => {
    const io = global.io;
    if (!io) return;
    const handler = (data) => {
      if (data.postId === postId) {
        setShareCount(data.shareCount);
      }
    };
    io.on('share:update', handler);
    return () => io.off('share:update', handler);
  }, [postId]);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showMenu]);

  // Keyboard support for menu
  useEffect(() => {
    if (!showMenu) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowMenu(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showMenu]);

  const handlePlatformShare = useCallback(async (platform) => {
    if (platform.id === 'copy') {
      const result = await platform.action(url);
      if (result === 'copied') {
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      platform.action(url);
      toast.success(`Shared on ${platform.label}!`);
      // Optimistic count + API call
      if (!isSharing) {
        setIsSharing(true);
        setShareCount(prev => prev + 1);
        fireConfetti();

        try {
          const token = localStorage.getItem('token');
          if (!token) throw new Error('Login required');
          const res = await fetch(`/api/social/posts/${postId}/share`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Share failed');
          setShareCount(data.share_count);
        } catch (err) {
          setShareCount(prev => prev - 1);
          toast.error(err.message);
        } finally {
          setIsSharing(false);
        }
      }
    }
    setShowMenu(false);
  }, [url, postId, isSharing]);

  const toggleMenu = useCallback((e) => {
    ripple(e);
    setShowMenu(prev => !prev);
  }, [ripple]);

  return (
    <div className="relative inline-flex items-center">
      {/* Tooltip */}
      <motion.button
        ref={buttonRef}
        onClick={toggleMenu}
        disabled={isSharing}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        aria-label="Share this post"
        aria-expanded={showMenu}
        aria-haspopup="true"
        title="Share this post"
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-purple-500/10 transition-colors disabled:opacity-50 overflow-hidden group"
      >
        {/* Ripple handled inside toggleMenu */}
        <Share2 className="w-4 h-4 text-zinc-400 group-hover:text-purple-400 transition-colors" />
        <AnimatePresence mode="wait">
          <motion.span
            key={shareCount}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-sm font-medium text-zinc-300"
          >
            {shareCount}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Share Menu Dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-900/90 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl shadow-purple-500/20 overflow-hidden z-50"
            role="menu"
          >
            <div className="p-1.5 flex flex-col gap-0.5">
              {SHARE_PLATFORMS.map((platform) => (
                <motion.button
                  key={platform.id}
                  onClick={() => handlePlatformShare(platform)}
                  whileHover={{ backgroundColor: 'rgba(168,85,247,0.1)', scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${platform.color}`}
                  role="menuitem"
                >
                  {platform.id === 'copy' && copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <platform.icon className="w-4 h-4" />
                  )}
                  {platform.id === 'copy' && copied ? 'Copied!' : platform.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ShareButton;
