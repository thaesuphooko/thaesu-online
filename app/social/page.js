'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function SocialFeedPage() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    setToken(localStorage.getItem('adminSecret') || '');
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const res = await fetch('/api/social');
    if (res.ok) setPosts(await res.json());
  };

  const handlePost = async () => {
    if (!newPost.trim() || !token) return;
    await fetch('/api/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: newPost }),
    });
    setNewPost('');
    fetchPosts();
  };

  const likePost = async (postId) => {
    await fetch('/api/social/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ post_id: postId }),
    });
    fetchPosts();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Social Feed</h1>
      {token && (
        <div className="glass-card p-4 mb-6 flex gap-2">
          <Input value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="What's on your mind?" />
          <Button onClick={handlePost}>Post</Button>
        </div>
      )}
      <div className="space-y-4">
        {posts.map(p => (
          <div key={p.id} className="glass-card p-4">
            <p className="font-semibold">{p.user_name}</p>
            <p className="text-sm mt-1">{p.content}</p>
            <div className="flex gap-4 mt-3">
              <button onClick={() => likePost(p.id)} className="text-sm text-muted-foreground hover:text-red-500">
                ❤️ {p.like_count}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
