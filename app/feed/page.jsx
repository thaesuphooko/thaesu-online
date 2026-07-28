'use client';

import RecommendedProducts from '@/components/organisms/RecommendedProducts';
import PollDisplay from '@/components/organisms/PostCardPoll';
import StoriesBar from '@/components/organisms/StoriesBar';
import { useState, useEffect, useRef, useCallback, useOptimistic, startTransition } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Share2, Send, ShoppingCart,
  MoreHorizontal, Edit3, Trash2, Sparkles, ImagePlus, Tag, X,
  BookOpen, Loader2, ExternalLink, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import useFeedStore from '@/store/feedStore';

// ─── Network retry helper ──────────────────────
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

// ─── Utilities ─────────────────────────────────
const getToken = () => localStorage.getItem('token');
const getUser = () => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } };

// ─── Relative time formatter ───────────────────
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

// ─── Skeleton Loader ───────────────────────────
const PostSkeleton = () => (
  <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-5 animate-pulse space-y-4">
    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-zinc-800" /><div className="flex-1 space-y-2"><div className="h-4 bg-zinc-800 rounded w-1/3" /><div className="h-3 bg-zinc-800 rounded w-1/4" /></div></div>
    <div className="h-48 bg-zinc-800 rounded-xl" />
    <div className="flex gap-4"><div className="h-6 w-16 bg-zinc-800 rounded" /><div className="h-6 w-16 bg-zinc-800 rounded" /></div>
  </div>
);

// ─── Particle Effect for Like ──────────────────
const useParticles = () => {
  const [particles, setParticles] = useState([]);
  const createBurst = (x, y) => {
    const newParticles = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i, x, y, angle: (i / 8) * 360, distance: 50 + Math.random() * 60,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))), 600);
  };
  return { particles, createBurst };
};

// ─── Post Card (Premium Ultra) ─────────────────
function PostCard({ post, user, refresh }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { particles, createBurst } = useParticles();
  const isOwner = user && (user.uid === post.user_uid);

  // Like state
  const [likeState, setLikeState] = useState({ liked: post.liked_by_user || false, count: post.like_count || 0 });
  const [optimisticLike, addOptimisticLike] = useOptimistic(likeState, (state, newLiked) => ({
    liked: newLiked, count: state.count + (newLiked ? 1 : -1),
  }));

  // Share count (optimistic)
  const [shareCount, setShareCount] = useState(post.share_count || 0);

  // ── Like handler ─────────────────────────────
  const handleLike = async (e) => {
    const token = getToken();
    if (!token) { toast.error("Please login to like"); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    createBurst(rect.left + rect.width/2, rect.top + rect.height/2);
    const newLiked = !optimisticLike.liked;
    startTransition(() => addOptimisticLike(newLiked));
    try {
      const res = await fetchWithRetry(`/api/social/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Like failed");
      setLikeState({ liked: data.liked, count: data.likes_count });
    } catch (err) {
      if (err.name !== "AbortError") {
        startTransition(() => addOptimisticLike(!newLiked));
        toast.error(err.message);
      }
    }
  };

  // ── Comment handler ─────────────────────────
  const submitComment = async () => {
    if (!commentText.trim()) return;
    const token = getToken();
    if (!token) return toast.error("Login required");
    try {
      const res = await fetchWithRetry(`/api/social/posts/${post.id}/comment`, {
        method: 'POST',
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: commentText }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Comment failed");
      }
      setCommentText('');
      toast.success('Comment added!');
      refresh(); // re-fetch feed (or just re-fetch comments)
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Share handler ───────────────────────────
  const handleShare = async () => {
    const token = getToken();
    if (!token) return toast.error("Login required");
    // Optimistic update
    setShareCount(prev => prev + 1);
    try {
      const shareRes = await fetchWithRetry(`/api/social/posts/${post.id}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!shareRes.ok) {
        const errData = await shareRes.json().catch(() => ({}));
        throw new Error(errData.error || "Share failed");
      }
      toast.success("Shared!");
      refresh(); // re-fetch feed to update share count properly
    } catch (err) {
      setShareCount(prev => prev - 1); // rollback
      toast.error(err.message);
    }
  };

  // ── Fetch comments on toggle ─────────────────
  useEffect(() => {
    if (showComments) {
      fetch(`/api/social/posts/${post.id}/comments`)
        .then(r => r.json())
        .then(d => setComments(d.comments || []));
    }
  }, [showComments, post.id]);

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="relative bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl hover:border-zinc-600/80 transition-all duration-300">
      {particles.map(p => (
        <motion.div key={p.id} initial={{ x:0, y:0, opacity:1, scale:1 }} animate={{ x: Math.cos(p.angle*Math.PI/180)*p.distance, y: Math.sin(p.angle*Math.PI/180)*p.distance, opacity:0, scale:0 }} transition={{ duration:0.5 }} className="absolute w-2 h-2 rounded-full bg-purple-500 z-50 pointer-events-none" style={{ left: p.x, top: p.y }} />
      ))}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/profile?uid=${post.user_uid}`} className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {post.user_name?.[0] || 'U'}
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/profile?uid=${post.user_uid}`} className="font-semibold text-sm hover:underline">{post.user_name}</Link>
            <p className="text-xs text-zinc-400">{timeAgo(post.created_at)}</p>
          </div>
          {isOwner && (
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 rounded-full hover:bg-zinc-800"><MoreHorizontal className="w-5 h-5" /></button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-10 py-1">
                  <button onClick={() => { setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700 flex items-center gap-2"><Edit3 className="w-4 h-4" /> Edit</button>
                  <button onClick={() => { setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Post content – linked to detail */}
        <Link href={`/post/${post.id}`} className="text-sm leading-relaxed mb-3 block hover:text-purple-300 transition">{post.content}</Link>

        {/* Poll */}
        {post.poll && <PollDisplay post={post} refresh={refresh} />}

        {/* Media */}
        {post.media_urls?.length > 0 && !post.product && (
          <div className="mb-3 rounded-xl overflow-hidden">
            {post.media_urls.map((url,i) => (
              url.match(/\.(mp4|webm|ogg)$/) ? <video key={i} src={url} controls className="w-full max-h-80 object-cover" /> : <img key={i} src={url} alt="" className="w-full max-h-80 object-cover" />
            ))}
          </div>
        )}

        {/* Product card */}
        {post.product && (
          <Link href={`/products/${post.product.slug || post.product_id}`} className="block p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl mb-3 hover:border-purple-500 transition">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-zinc-700 flex items-center justify-center text-2xl shrink-0">📦</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{post.product.title}</p>
                <p className="text-purple-400 font-bold text-sm">${parseFloat(post.product.price).toFixed(2)}</p>
              </div>
              <ShoppingCart className="w-5 h-5 text-purple-400" />
            </div>
          </Link>
        )}

        {/* Actions */}
        <div className="flex items-center gap-6 border-t border-zinc-800 pt-3 text-zinc-400 text-xs">
          <button onClick={handleLike} className={`flex items-center gap-1 transition ${optimisticLike.liked ? 'text-red-500' : 'hover:text-red-500'}`}>
            <Heart className={`w-4 h-4 ${optimisticLike.liked ? 'fill-current' : ''}`} />
            <span>{optimisticLike.count}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 hover:text-blue-400 transition">
            <MessageCircle className="w-4 h-4" /> <span>{post.comment_count || 0}</span>
          </button>
          <button onClick={handleShare} className="flex items-center gap-1 hover:text-green-400 transition">
            <Share2 className="w-4 h-4" /> <span>{shareCount}</span>
          </button>
        </div>

        {/* Comments section */}
        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ height:0 }} animate={{ height:'auto' }} exit={{ height:0 }} className="overflow-hidden border-t border-zinc-800 mt-3 pt-3">
              <div className="space-y-2">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2 text-sm">
                    <Link href={`/profile?uid=${c.uid}`} className="font-medium text-purple-400 shrink-0">{c.user_name}</Link>
                    <p className="text-zinc-300">{c.content}</p>
                  </div>
                ))}
              </div>
              {user && (
                <div className="flex gap-2 mt-2">
                  <input type="text" placeholder="Write a comment..." value={commentText} onChange={e=>setCommentText(e.target.value)} className="flex-1 px-3 py-1 bg-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500" />
                  <button onClick={submitComment} className="text-purple-400"><Send className="w-4 h-4" /></button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Product Card ──────────────────────────────
function ProductCard({ product }) {
  const addToCart = async () => {
    const token = getToken(); if (!token) return toast.error('Login required');
    await fetch('/api/cart/add', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId: product.id, quantity: 1 }) });
    toast.success('Added to cart');
  };
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl hover:border-zinc-600/80 transition-all">
      <Link href={`/products/${product.slug || product.id}`}>
        <div className="relative h-52 bg-zinc-800"><img src={product.image || '/placeholder.jpg'} alt={product.title} className="w-full h-full object-cover" /><span className="absolute top-2 left-2 bg-black/60 backdrop-blur text-xs px-2 py-1 rounded-full">{product.category || 'Product'}</span></div>
      </Link>
      <div className="p-4"><h3 className="font-semibold text-sm truncate">{product.title}</h3><p className="text-xs text-zinc-400 mt-1 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between mt-3"><span className="text-lg font-bold text-purple-400">${parseFloat(product.price).toFixed(2)}</span><button onClick={addToCart} className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-full transition"><ShoppingCart className="w-3 h-3" /> Add</button></div>
      </div>
    </motion.div>
  );
}

// ─── Wattpad Card ──────────────────────────────
function WattpadCard({ story }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} whileHover={{ y:-2, boxShadow:'0 0 25px -5px rgba(168,85,247,0.4)' }} onClick={() => setOpen(true)} className="relative bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl overflow-hidden cursor-pointer group transition-all">
        <div className="h-40 relative overflow-hidden"><img src={story.cover_url} alt={story.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /><div className="absolute bottom-2 left-2 right-2 text-white"><p className="font-semibold text-sm drop-shadow-lg">{story.title}</p><p className="text-xs text-zinc-300">{story.author}</p></div></div>
      </motion.div>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }} transition={{ type:'spring', damping:25, stiffness:300 }} className="relative w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border-l border-zinc-700 h-full overflow-y-auto p-6 shadow-2xl">
              <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-1 rounded-full bg-zinc-800 text-zinc-400"><X className="w-5 h-5" /></button>
              <img src={story.cover_url} className="w-full h-48 object-cover rounded-xl" />
              <h2 className="text-2xl font-bold mt-4">{story.title}</h2><p className="text-sm text-zinc-400">by {story.author}</p><p className="text-zinc-300 leading-relaxed mt-4">{story.description}</p>
              <a href={story.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full text-sm font-medium mt-6 transition"><ExternalLink className="w-4 h-4" /> Read on Wattpad</a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Composer ──────────────────────────────────
function Composer({ onPost }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState([]);
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim() && mediaUrls.length===0) return;
    setPosting(true);
    try {
      const token = getToken(); if (!token) { toast.error('Login required'); return; }
      const res = await fetchWithRetry('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, media_urls: mediaUrls.length>0 ? mediaUrls : undefined }),
      });
      if (res.ok) {
        toast.success('Post created!');
        setContent(''); setMediaUrls([]); setExpanded(false);
        onPost();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Post failed');
      }
    } catch (e) {
      toast.error('Network error');
    }
    setPosting(false);
  };

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">{getUser()?.name?.[0] || getUser()?.full_name?.[0] || 'U'}</div>
        <button onClick={() => setExpanded(true)} className="flex-1 text-left text-zinc-400 hover:text-white bg-zinc-800/50 rounded-xl px-4 py-2.5 transition">What's on your mind? ✨</button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="mt-4 space-y-3 overflow-hidden">
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write something..." className="w-full p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 resize-none" rows={4} />
            {mediaUrls.length>0 && (
              <div className="grid grid-cols-2 gap-2">
                {mediaUrls.map((url,i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden bg-zinc-800 group">
                    {url.match(/\.(mp4|webm|ogg)$/) ? <video src={url} className="w-full h-24 object-cover" controls /> : <img src={url} className="w-full h-24 object-cover" alt="" />}
                    <button onClick={() => setMediaUrls(prev => prev.filter((_,idx) => idx!==i))} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3 text-white" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button onClick={() => { const url = prompt('Enter image/video URL:'); if (url) setMediaUrls(prev => [...prev, url]); }} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition"><ImagePlus className="w-4 h-4" /></button>
                <button className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-yellow-400 transition"><Sparkles className="w-4 h-4" /></button>
              </div>
              <button onClick={handlePost} disabled={posting||(!content.trim() && mediaUrls.length===0)} className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-full text-sm font-medium transition disabled:opacity-50">{posting ? 'Posting...' : 'Post'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Feed Page ────────────────────────────
export default function FeedPage() {
  const { items, page, hasMore, scrollPosition, loading, initialLoading, refreshing,
    setItems, appendItems, setPage, setHasMore, setScrollPosition, setLoading, setInitialLoading, setRefreshing, reset } = useFeedStore();
  const [user, setUser] = useState(null);
  const loaderRef = useRef(null);

  const fetchFeed = useCallback(async (pageNum, resetData = false) => {
    setLoading(true);
    if (resetData) setInitialLoading(true);
    const token = getToken();
    const res = await fetch(`/api/feed/combined?page=${pageNum}&limit=10`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const data = await res.json();
    if (data.items) {
      if (resetData || pageNum===1) setItems(data.items);
      else appendItems(data.items);
      setHasMore(data.hasMore);
      setPage(pageNum);
    }
    setLoading(false);
    setInitialLoading(false);
    setRefreshing(false);
  }, [setItems, appendItems, setHasMore, setPage, setLoading, setInitialLoading, setRefreshing]);

  useEffect(() => {
    setUser(getUser());
    if (items.length===0) fetchFeed(1, true);
    else requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollPosition(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setScrollPosition]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading && !initialLoading) fetchFeed(page + 1);
    }, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, initialLoading, page, fetchFeed]);

  // Pull-to-refresh
  const touchStartY = useRef(0);
  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => { if (window.scrollY===0 && e.touches[0].clientY - touchStartY.current > 80) setRefreshing(true); };
  const handleTouchEnd = () => { if (refreshing) { reset(); fetchFeed(1, true); setRefreshing(false); } };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {refreshing && <motion.div initial={{ opacity:0, y:-30 }} animate={{ opacity:1, y:0 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-600/90 backdrop-blur-xl rounded-full px-6 py-2 shadow-2xl flex items-center gap-2 text-white text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Refreshing...</motion.div>}
      <div className="fixed inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(168,85,247,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-purple-900/20 via-transparent to-cyan-900/20" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-24 pb-24">
        <div className="sticky top-16 z-20 mb-4 flex justify-end">
          <button onClick={() => { reset(); fetchFeed(1, true); }} className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-full text-sm text-zinc-400 hover:text-white transition shadow-lg"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
        <StoriesBar />
        <RecommendedProducts />
        {user && <Composer onPost={() => { reset(); fetchFeed(1, true); }} />}
        {initialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)}</div>
        ) : items.length===0 ? (
          <div className="text-center py-20 text-zinc-500"><Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No content yet. Be the first to share!</p></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item, i) => {
                if (item.type==='post') return <PostCard key={item.data.id} post={item.data} user={user} refresh={() => fetchFeed(1, true)} />;
                if (item.type==='product') return <ProductCard key={`product-${item.data.id}`} product={item.data} />;
                if (item.type==='wattpad') return <WattpadCard key={`wattpad-${item.data.story_id}`} story={item.data} />;
                return null;
              })}
            </div>
            {hasMore && <div ref={loaderRef} className="h-10" />}
            {loading && !initialLoading && <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>}
          </>
        )}
      </div>
    </div>
  );
}
