'use client';
import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewsFeedPage() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [token, setToken] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const tok = localStorage.getItem('adminToken') || '';
    setToken(tok);
    if (tok) fetch('/api/user/profile', { headers: { Authorization: `Bearer ${tok}` } }).then(r => r.json()).then(d => setProfile(d)).catch(()=>{});
    fetchPosts(tok);
  }, []);

  const fetchPosts = async (tok) => {
    const headers = tok ? { Authorization: `Bearer ${tok}` } : {};
    try {
      const res = await fetch('/api/news', { headers });
      if (res.ok) setPosts(await res.json());
    } catch {}
  };

  const handlePost = async () => {
    if (!newPost.trim() || !token) return;
    await fetch('/api/news', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content: newPost }) });
    setNewPost(''); fetchPosts(token);
  };

  const toggleLike = async (postId) => {
    if (!token) return;
    await fetch('/api/news/like', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ post_id: postId }) });
    fetchPosts(token);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 space-y-6 animate-fadeIn">
      <h1 className="text-3xl font-bold text-center mb-6">News Feed</h1>
      {token ? (
        <div className="glass-card p-4 space-y-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">{profile?.full_name?.[0] || 'U'}</div>
            <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="What's on your mind?" className="flex-1 bg-transparent resize-none outline-none text-sm" rows={2} />
          </div>
          <div className="flex justify-end"><Button onClick={handlePost} size="sm" className="gap-2"><Send className="w-4 h-4" /> Post</Button></div>
        </div>
      ) : (
        <div className="text-center">
          <Link href="/auth/login" className="text-primary hover:underline">Log in</Link> to post and interact.
        </div>
      )}
      {posts.map(post => <PostCard key={post.id} post={post} token={token} onLike={toggleLike} />)}
    </div>
  );
}

function PostCard({ post, token, onLike }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  const loadComments = async () => { const res = await fetch(`/api/news/comment?post_id=${post.id}`); if (res.ok) setComments(await res.json()); };
  useEffect(() => { if (showComments) loadComments(); }, [showComments]);

  const submitComment = async () => {
    if (!commentText.trim() || !token) return;
    await fetch('/api/news/comment', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ post_id: post.id, content: commentText }) });
    setCommentText(''); loadComments();
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">{post.user_name?.[0]}</div><span className="font-semibold">{post.user_name}</span></div>
      <p className="text-sm">{post.content}</p>
      {post.image_url && <img src={post.image_url} alt="Post" className="w-full rounded-xl object-cover max-h-72" loading="lazy" />}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <button onClick={() => { if(token) onLike(post.id); }} className={`flex items-center gap-1 transition-colors ${post.liked_by_me ? 'text-red-500' : 'text-muted-foreground'} ${!token ? 'opacity-50' : 'hover:text-red-500'}`}><Heart className={`w-5 h-5 ${post.liked_by_me ? 'fill-current' : ''}`} /> {post.likes_count}</button>
        <button onClick={() => { if(token) setShowComments(!showComments); }} className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"><MessageCircle className="w-5 h-5" /> {post.comments_count}</button>
        <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"><Share2 className="w-5 h-5" /> Share</button>
      </div>
      {showComments && token && (
        <div className="space-y-2 pt-2 border-t border-border">
          {comments.map(c => <div key={c.id} className="flex gap-2 text-sm"><span className="font-semibold">{c.full_name}:</span><span>{c.content}</span></div>)}
          <div className="flex gap-2 mt-2"><input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." className="flex-1 bg-transparent border-b border-border outline-none text-sm" /><Button size="sm" onClick={submitComment}>Post</Button></div>
        </div>
      )}
    </div>
  );
}
