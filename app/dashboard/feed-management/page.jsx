"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, Edit3, Save, X, Heart, MessageCircle } from "lucide-react";

const ADMIN_HASH = 'super-secret-admin-step';

export default function FeedManagementPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState("");

  const fetchPosts = () => {
    setLoading(true);
    fetch(`/api/admin/feed-management?admin_hash=${ADMIN_HASH}`)
      .then(res => res.json())
      .then(data => { setPosts(data.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/admin/feed-management?admin_hash=${ADMIN_HASH}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    fetchPosts();
  };

  const startEdit = (post) => { setEditingPost(post); setEditContent(post.content || ""); };
  const saveEdit = async () => {
    if (!editingPost || !editContent.trim()) return;
    await fetch(`/api/admin/feed-management?admin_hash=${ADMIN_HASH}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingPost.id, content: editContent })
    });
    setEditingPost(null); setEditContent("");
    fetchPosts();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">📰 Feed Management</h1>
      {loading ? <div className="text-center py-10">Loading...</div> : posts.length === 0 ? <div className="text-center py-10 text-zinc-500">No posts found.</div> : (
        <div className="space-y-4">
          {posts.map(post => (
            <motion.div key={post.id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white">{post.user_name}</span>
                  <span className="text-zinc-500 text-xs">{new Date(post.created_at).toLocaleString()}</span>
                </div>
                {editingPost?.id === post.id ? (
                  <div className="space-y-2">
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full p-2 bg-zinc-800 rounded-xl text-zinc-200 text-sm" rows={3} />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="px-3 py-1 bg-purple-600 rounded-lg text-sm"><Save className="w-4 h-4 inline mr-1" />Save</button>
                      <button onClick={() => setEditingPost(null)} className="px-3 py-1 bg-zinc-700 rounded-lg text-sm"><X className="w-4 h-4 inline mr-1" />Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-zinc-300 text-sm">{post.content}</p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-400" /> {post.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 text-blue-400" /> {post.comments}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(post)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(post.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
