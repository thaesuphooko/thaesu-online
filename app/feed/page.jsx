"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Heart, MessageCircle, Share2, Smile, Send,
  ImagePlus, Tag, X, ShoppingCart, Search,
  ChevronDown, ChevronUp
} from "lucide-react";

const REACTIONS = { like: "👍", love: "❤️", haha: "😂", wow: "😮", sad: "😢", angry: "😡" };

function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch(e) { return null; } }
function getToken() { return localStorage.getItem('token'); }

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState([]);
  const [postProduct, setPostProduct] = useState(null);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productResults, setProductResults] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => { setUser(getUser()); fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/social/posts', { headers });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreatePost = async () => {
    const token = getToken();
    if (!token) return alert("Please login");
    const media_urls = postMedia.length > 0 ? postMedia : undefined;
    const res = await fetch('/api/social/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        content: postContent,
        media_urls,
        product_id: postProduct?.id || undefined
      })
    });
    if (res.ok) {
      setPostContent(""); setPostMedia([]); setPostProduct(null); setShowPostForm(false);
      fetchPosts();
    } else { alert("Failed to create post"); }
  };

  const searchProducts = async (q) => {
    if (!q.trim()) { setProductResults([]); return; }
    const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setProductResults(data.products || []);
  };

  if (loading) return <div className="p-8 text-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-24 pb-24">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-zinc-100">📰 Feed</h1>

        {/* Create Post */}
        {user && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shrink-0">
                {user.name?.[0] || user.full_name?.[0] || 'U'}
              </div>
              <button
                onClick={() => setShowPostForm(!showPostForm)}
                className="flex-1 text-left text-zinc-400 hover:text-zinc-200 transition bg-zinc-800/50 rounded-xl px-4 py-2"
              >
                What's on your mind?
              </button>
            </div>

            <AnimatePresence>
              {showPostForm && (
                <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                  <textarea
                    value={postContent}
                    onChange={e => setPostContent(e.target.value)}
                    placeholder="Write something..."
                    className="w-full mt-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                  />

                  {postMedia.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {postMedia.map((url, i) => (
                        <div key={i} className="relative rounded-lg overflow-hidden bg-zinc-800">
                          {url.match(/\.(mp4|webm|ogg)$/) ? (
                            <video src={url} className="w-full h-24 object-cover" controls />
                          ) : (
                            <img src={url} className="w-full h-24 object-cover" alt="" />
                          )}
                          <button onClick={() => setPostMedia(prev => prev.filter((_,idx) => idx !== i))} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {postProduct && (
                    <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between">
                      <span className="text-sm text-purple-300">🔗 {postProduct.title}</span>
                      <button onClick={() => setPostProduct(null)} className="text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const url = prompt("Enter image or video URL:");
                          if (url) setPostMedia(prev => [...prev, url]);
                        }}
                        className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition"
                        title="Add media"
                      >
                        <ImagePlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowProductSearch(!showProductSearch)}
                        className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition"
                        title="Tag a product"
                      >
                        <Tag className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={handleCreatePost}
                      disabled={!postContent.trim() && postMedia.length === 0 && !postProduct}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-sm transition disabled:opacity-50"
                    >
                      Post
                    </button>
                  </div>

                  {showProductSearch && (
                    <div className="mt-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={productSearchQuery}
                          onChange={e => { setProductSearchQuery(e.target.value); searchProducts(e.target.value); }}
                          className="w-full pl-10 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      {productResults.length > 0 && (
                        <div className="mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                          {productResults.map(prod => (
                            <button
                              key={prod.id}
                              onClick={() => { setPostProduct(prod); setShowProductSearch(false); setProductSearchQuery(""); setProductResults([]); }}
                              className="w-full text-left px-3 py-2 hover:bg-zinc-700 text-sm text-zinc-300 flex justify-between"
                            >
                              <span className="truncate">{prod.title}</span>
                              <span className="text-purple-400">${parseFloat(prod.price).toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Posts List */}
        {posts.map(post => (
          <PostCard key={post.id} post={post} user={user} refresh={fetchPosts} />
        ))}

        {!loading && posts.length === 0 && (
          <p className="text-center text-zinc-500 py-10">No posts yet. Be the first!</p>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, user, refresh }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [reactOpen, setReactOpen] = useState(false);
  const [liked, setLiked] = useState(post.liked_by_user || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);

  useEffect(() => {
    if (showComments) {
      fetch(`/api/social/posts/${post.id}/comments`).then(r=>r.json()).then(d=>setComments(d.comments||[]));
    }
  }, [showComments, post.id]);

  const handleLike = async () => {
    const token = getToken(); if (!token) return alert("Login required");
    const res = await fetch(`/api/social/posts/${post.id}/like`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) {
      setLiked(data.liked);
      setLikeCount(prev => data.liked ? prev+1 : prev-1);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    const token = getToken(); if (!token) return alert("Login required");
    await fetch(`/api/social/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ content: commentText })
    });
    setCommentText("");
    refresh();
  };

  const handleShare = async () => {
    const token = getToken(); if (!token) return alert("Login required");
    await fetch(`/api/social/posts/${post.id}/share`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    refresh();
  };

  const handleReact = async (type) => {
    const token = getToken(); if (!token) return alert("Login required");
    if (type === 'remove') {
      await fetch(`/api/social/posts/${post.id}/react`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    } else {
      await fetch(`/api/social/posts/${post.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type })
      });
    }
    refresh();
  };

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/profile?uid=${post.user_uid}`} className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shrink-0">
          {post.user_name?.[0] || 'U'}
        </Link>
        <div>
          <Link href={`/profile?uid=${post.user_uid}`} className="text-zinc-100 font-semibold text-sm hover:text-purple-400 transition">
            {post.user_name}
          </Link>
          <p className="text-zinc-500 text-xs">{new Date(post.created_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Content */}
      {post.content && <p className="text-zinc-300 text-sm leading-relaxed mb-4">{post.content}</p>}

      {/* Product card if tagged */}
      {post.product && (
        <Link href={`/products/${post.product.slug || post.product_id}`}
          className="block p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl mb-4 hover:border-purple-500 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-zinc-700 overflow-hidden shrink-0">
              {post.media_urls?.[0] ? <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-200 text-sm truncate">{post.product.title}</p>
              <p className="text-purple-400 font-bold text-sm">${parseFloat(post.product.price).toFixed(2)}</p>
            </div>
            <ShoppingCart className="w-5 h-5 text-purple-400 shrink-0" />
          </div>
        </Link>
      )}

      {/* Media */}
      {post.media_urls?.length > 0 && !post.product && (
        <div className="grid grid-cols-1 gap-2 mb-4">
          {post.media_urls.map((url, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-zinc-800">
              {url.match(/\.(mp4|webm|ogg)$/) ? (
                <video src={url} controls className="w-full max-h-96 object-cover" />
              ) : (
                <img src={url} alt="" className="w-full max-h-96 object-cover" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 border-t border-zinc-800 pt-3 text-zinc-400 text-xs">
        <div className="relative flex items-center gap-2">
          <motion.button
            onClick={handleLike}
            className={`flex items-center gap-1 transition ${liked ? 'text-red-500' : 'hover:text-red-500'}`}
            whileTap={{ scale: 1.3 }}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          </motion.button>
          <span className="tabular-nums">{likeCount}</span>
          <button onClick={() => setReactOpen(!reactOpen)} className="ml-1 hover:text-zinc-200">
            <Smile className="w-4 h-4" />
          </button>
          {reactOpen && (
            <div className="absolute bottom-full mb-2 left-0 flex gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2 py-1 shadow-xl z-10">
              {Object.entries(REACTIONS).map(([key, emoji]) => (
                <button key={key} onClick={() => { handleReact(key); setReactOpen(false); }} className="text-lg hover:scale-125 transition">{emoji}</button>
              ))}
              <button onClick={() => { handleReact('remove'); setReactOpen(false); }} className="text-xs text-red-400 px-1">✕</button>
            </div>
  
          )}
        </div>

        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 hover:text-blue-400 transition">
          <MessageCircle className="w-4 h-4" />
          <span>{post.comment_count || 0}</span>
        </button>

        <button onClick={handleShare} className="flex items-center gap-1 hover:text-green-400 transition">
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden border-t border-zinc-800 mt-3 pt-3">
            <div className="space-y-2">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2 text-sm">
                  <Link href={`/profile?uid=${c.uid}`} className="font-medium text-purple-400 shrink-0">{c.user_name}</Link>
                  <p className="text-zinc-300">{c.content}</p>
                </div>
              ))}
              {user && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    className="flex-1 px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button onClick={submitComment} className="text-purple-400 hover:text-purple-300"><Send className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
