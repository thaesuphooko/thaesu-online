'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  Heart, MessageCircle, Share2, Send, MoreHorizontal, Edit3, Trash2,
  ArrowLeft, Loader2, ShoppingCart, Copy, X, Check,
  ChevronLeft, ChevronRight, ExternalLink, Flag
} from 'lucide-react';

// ════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════

const sanitize = (str) => {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
};

const timeAgo = (date) => {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

const fetchWithRetry = async (url, options = {}, retries = 2) => {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...options });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with status ${res.status}`);
      }
      return res;
    } catch (err) {
      lastError = err;
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
};

// Confetti hearts
const fireHeartConfetti = () => {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.6 },
    shapes: [confetti.shapeFromText({ text: '❤️', scalar: 2 })],
    scalar: 0.8,
    gravity: 0.5,
    ticks: 80,
  });
};

const RichText = ({ text }) => {
  const html = text
    .replace(/#(\w+)/g, '<span class="text-purple-400 font-medium cursor-pointer hover:underline">#$1</span>')
    .replace(/@(\w+)/g, '<span class="text-cyan-400 font-medium cursor-pointer hover:underline">@$1</span>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

const PostSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-zinc-800" />
      <div className="flex-1 space-y-2"><div className="h-4 bg-zinc-800 rounded w-1/3" /><div className="h-3 bg-zinc-800 rounded w-1/4" /></div>
    </div>
    <div className="h-4 bg-zinc-800 rounded w-full" />
    <div className="h-4 bg-zinc-800 rounded w-3/4" />
    <div className="h-48 bg-zinc-800 rounded-xl" />
  </div>
);

// ════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export default function PostDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [likeState, setLikeState] = useState({ liked: false, count: 0 });
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [shareDropdown, setShareDropdown] = useState(false);
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [shareCount, setShareCount] = useState(0);

  const abortControllerRef = useRef(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(u);
  }, []);

  // Fetch post
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetchWithRetry(`/api/social/posts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await res.json();
        setPost(data.post);
        setLikeState({ liked: data.post.liked_by_user || false, count: data.post.like_count || 0 });
        setShareCount(data.post.share_count || 0);
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error('Post not found');
          router.push('/feed');
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id, router]);

  const fetchComments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetchWithRetry(`/api/social/posts/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      toast.error('Failed to load comments');
    }
  }, [id]);

  useEffect(() => {
    if (showComments && comments.length === 0) fetchComments();
  }, [showComments, fetchComments, comments.length]);

  // Like
  const handleLike = async () => {
    const token = localStorage.getItem('token');
    if (!token) return toast.error('Login required');
    const newLiked = !likeState.liked;
    setLikeState(prev => ({ liked: newLiked, count: prev.count + (newLiked ? 1 : -1) }));
    try {
      const res = await fetchWithRetry(`/api/social/posts/${id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLikeState({ liked: data.liked, count: data.likes_count });
      if (data.liked) fireHeartConfetti();
    } catch (err) {
      setLikeState(prev => ({ liked: !newLiked, count: prev.count - (newLiked ? 1 : -1) }));
      toast.error(err.message);
    }
  };

  // Comment
  const submitComment = async () => {
    const text = sanitize(commentText || '').trim();
    if (!text) return;
    const token = localStorage.getItem('token');
    if (!token) return toast.error('Login required');
    setCommentLoading(true);
    const optimistic = { id: `temp-${Date.now()}`, user_name: user?.name || 'You', content: text, created_at: new Date().toISOString(), uid: user?.uid, isTemp: true };
    setComments(prev => [...prev, optimistic]);
    setCommentText('');
    try {
      const res = await fetchWithRetry(`/api/social/posts/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      setComments(prev => prev.map(c => c.id === optimistic.id ? { ...data.comment, isTemp: false } : c));
      toast.success('Comment added!');
      fetchComments();
    } catch (err) {
      setComments(prev => prev.filter(c => c.id !== optimistic.id));
      setCommentText(text);
      toast.error(err.message);
    } finally {
      setCommentLoading(false);
    }
  };

  // Share helpers
  const callShareApi = async () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Login required');
    const res = await fetchWithRetry(`/api/social/posts/${id}/share`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Share failed');
    setShareCount(data.share_count);
    return data;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${id}`);
    toast.success('Link copied!');
    setShareDropdown(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: post?.content?.slice(0, 100), url: `${window.location.origin}/post/${id}` });
        // call share API after successful native share
        await callShareApi();
        toast.success('Shared!');
      } catch (err) {
        // user cancelled
      }
    } else {
      handleCopyLink();
    }
    setShareDropdown(false);
  };

  const handleSocialShare = async (platform) => {
    const url = encodeURIComponent(`${window.location.origin}/post/${id}`);
    const text = encodeURIComponent(post?.content?.slice(0, 200) || 'Check this out!');
    const links = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    };
    if (links[platform]) {
      window.open(links[platform], '_blank');
      // Optimistic share count
      setShareCount(prev => prev + 1);
      try {
        await callShareApi();
      } catch (err) {
        setShareCount(prev => prev - 1); // rollback
        toast.error(err.message);
      }
    }
    setShareDropdown(false);
  };

  // Delete
  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetchWithRetry(`/api/social/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Post deleted');
      router.push('/feed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Add to cart
  const addToCart = async (productId) => {
    const token = localStorage.getItem('token');
    if (!token) return toast.error('Login required');
    setAddToCartLoading(true);
    try {
      await fetchWithRetry('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddToCartLoading(false);
    }
  };

  const mediaUrls = post?.media_urls || [];
  const prevImage = () => setCarouselIndex(prev => (prev === 0 ? mediaUrls.length - 1 : prev - 1));
  const nextImage = () => setCarouselIndex(prev => (prev === mediaUrls.length - 1 ? 0 : prev + 1));
  const openLightbox = (index) => { setActiveMediaIndex(index); setLightboxOpen(true); };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-2xl w-full p-4"><PostSkeleton /></div>
      </div>
    );
  }
  if (!post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white text-lg">
        Post not found
      </div>
    );
  }

  const isOwner = user && (user.uid === post.user_uid || user.id === post.user_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-purple-950/30 text-white overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur border border-white/10 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Post</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] transition-shadow duration-500"
        >
          <div className="p-5">
            {/* Author */}
            <div className="flex items-center gap-3 mb-4">
              <Link href={`/profile?uid=${post.user_uid}`} className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg">
                {post.user_name?.[0] || 'U'}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/profile?uid=${post.user_uid}`} className="font-semibold text-sm hover:underline">{post.user_name}</Link>
                <p className="text-xs text-zinc-400">{timeAgo(post.created_at)}</p>
              </div>
              {isOwner ? (
                <div className="relative">
                  <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 rounded-full hover:bg-zinc-800"><MoreHorizontal className="w-5 h-5" /></button>
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-0 mt-1 w-36 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl shadow-xl z-20 py-1">
                        <button onClick={() => setMenuOpen(false)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 flex items-center gap-2"><Edit3 className="w-4 h-4" /> Edit</button>
                        <button onClick={() => { setMenuOpen(false); handleDelete(); }} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400" title="Report post">
                  <Flag className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Content */}
            {post.content && (
              <div className="text-sm leading-relaxed mb-4 text-zinc-200">
                <RichText text={post.content} />
              </div>
            )}

            {/* Media */}
            {mediaUrls.length > 0 && (
              <div className="relative mb-4 rounded-2xl overflow-hidden group">
                {mediaUrls.length === 1 ? (
                  <img src={mediaUrls[0]} alt="" className="w-full max-h-96 object-cover cursor-pointer" onClick={() => openLightbox(0)} />
                ) : (
                  <div className="relative">
                    <div className="overflow-hidden rounded-2xl">
                      <motion.div className="flex" animate={{ x: `-${carouselIndex * 100}%` }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                        {mediaUrls.map((url, i) => (
                          <div key={i} className="w-full flex-shrink-0">
                            {url.match(/\.(mp4|webm|ogg)$/) ? <video src={url} controls className="w-full max-h-96 object-cover" /> : <img src={url} alt="" className="w-full max-h-96 object-cover cursor-pointer" onClick={() => openLightbox(i)} />}
                          </div>
                        ))}
                      </motion.div>
                    </div>
                    {mediaUrls.length > 1 && (
                      <>
                        <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition"><ChevronLeft className="w-5 h-5" /></button>
                        <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition"><ChevronRight className="w-5 h-5" /></button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {mediaUrls.map((_, i) => (<div key={i} className={`w-2 h-2 rounded-full ${i === carouselIndex ? 'bg-purple-500' : 'bg-white/50'}`} />))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Product */}
            {post.product && (
              <div className="relative bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-4 mb-4 group hover:border-purple-500/30 transition-all">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent rounded-2xl pointer-events-none" />
                <Link href={`/products/${post.product.slug || post.product_id}`} className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-zinc-700 flex items-center justify-center text-2xl">📦</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{post.product.title}</p>
                    <p className="text-purple-400 font-bold text-lg">${parseFloat(post.product.price).toFixed(2)}</p>
                  </div>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(post.product.id || post.product_id); }} disabled={addToCartLoading} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50">
                    {addToCartLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Add
                  </button>
                </Link>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-zinc-400 text-xs">
              <div className="flex items-center gap-6">
                <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike} className={`flex items-center gap-1.5 transition ${likeState.liked ? 'text-pink-500' : 'hover:text-pink-400'}`}>
                  <motion.div
                    key={likeState.liked ? 'liked' : 'unliked'}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.3 }}
                  >
                    <Heart className={`w-5 h-5 ${likeState.liked ? 'fill-current' : ''}`} />
                  </motion.div>
                  <span className="font-medium">{likeState.count}</span>
                </motion.button>
                <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 hover:text-blue-400 transition">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">{comments.length}</span>
                </button>
                <div className="relative">
                  <button onClick={() => setShareDropdown(!shareDropdown)} className="flex items-center gap-1.5 hover:text-green-400 transition">
                    <Share2 className="w-5 h-5" />
                    <span className="font-medium">{shareCount}</span>
                  </button>
                  <AnimatePresence>
                    {shareDropdown && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute bottom-full left-0 mb-2 w-56 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-2 z-30">
                        <button onClick={handleCopyLink} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 flex items-center gap-3 transition"><Copy className="w-4 h-4" /> Copy Link</button>
                        {typeof navigator !== 'undefined' && navigator.share && <button onClick={handleNativeShare} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 flex items-center gap-3 transition"><ExternalLink className="w-4 h-4" /> Share via...</button>}
                        <button onClick={() => handleSocialShare('facebook')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 flex items-center gap-3 transition">📘 Facebook</button>
                        <button onClick={() => handleSocialShare('twitter')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 flex items-center gap-3 transition">🐦 Twitter</button>
                        <button onClick={() => handleSocialShare('telegram')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 flex items-center gap-3 transition"><Send className="w-4 h-4" /> Telegram</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Comments */}
            <AnimatePresence>
              {showComments && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/10 mt-4 pt-4">
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {comments.length > 0 ? comments.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex gap-2 text-sm">
                        <Link href={`/profile?uid=${c.uid}`} className="font-medium text-purple-400 shrink-0">{c.user_name}</Link>
                        <p className="text-zinc-300">{c.content}</p>
                      </motion.div>
                    )) : <p className="text-sm text-zinc-500 italic">No comments yet.</p>}
                  </div>
                  {user && (
                    <div className="flex gap-2 mt-3">
                      <input type="text" placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }} className="flex-1 px-3 py-2 bg-zinc-800/50 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:border-purple-500 outline-none transition" />
                      <button onClick={submitComment} disabled={commentLoading || !commentText.trim()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl disabled:opacity-50 transition flex items-center">
                        {commentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}>
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full"><X className="w-6 h-6" /></button>
            <img src={mediaUrls[activeMediaIndex]} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
