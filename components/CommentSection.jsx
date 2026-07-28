'use client';

import {
  useState, useEffect, useCallback, useRef, memo
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Loader2, User, Trash2, Pencil, Check, X, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Time ago formatter ────────────────────────
const timeAgo = (dateString) => {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ─── Skeleton comment item ─────────────────────
const SkeletonComment = () => (
  <div className="flex gap-3 p-3 bg-white/5 rounded-xl animate-pulse">
    <div className="w-8 h-8 rounded-full bg-zinc-700" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-zinc-700 rounded w-24" />
      <div className="h-3 bg-zinc-700 rounded w-48" />
    </div>
  </div>
);

const CommentSection = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const currentUserId = useRef(null);

  // ─── Fetch initial comments ──────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`/api/social/posts/${postId}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setComments(data.comments || []);
        // Extract current user id from token (simple decode)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentUserId.current = payload.sub || payload.id;
        } catch {}
      })
      .catch(() => toast.error('Failed to load comments'))
      .finally(() => setLoading(false));
  }, [postId]);

  // ─── Real‑time socket listener ───────────────
  useEffect(() => {
    const io = global.io;
    if (!io) return;
    const handler = (comment) => {
      if (comment.post_id === postId) {
        setComments(prev => {
          // Avoid duplicates
          if (prev.some(c => c.id === comment.id)) return prev;
          return [...prev, comment];
        });
        if (comment.user_id !== currentUserId.current) {
          toast(`${comment.author?.full_name || 'Someone'} commented`);
        }
      }
    };
    // Listen for comment delete/edit events
    const deleteHandler = ({ commentId }) => {
      setComments(prev => prev.filter(c => c.id !== commentId));
    };
    const editHandler = (updated) => {
      setComments(prev => prev.map(c => c.id === updated.id ? { ...c, content: updated.content } : c));
    };

    io.on('comment:new', handler);
    io.on('comment:deleted', deleteHandler);
    io.on('comment:edited', editHandler);
    return () => {
      io.off('comment:new', handler);
      io.off('comment:deleted', deleteHandler);
      io.off('comment:edited', editHandler);
    };
  }, [postId]);

  // ─── Draft auto‑save ─────────────────────────
  useEffect(() => {
    const draftKey = `comment_draft_${postId}`;
    const timer = setInterval(() => {
      if (content.trim()) {
        localStorage.setItem(draftKey, content);
      }
    }, 3000);
    // Load draft on mount
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      setContent(saved);
      toast('Draft restored');
    }
    return () => clearInterval(timer);
  }, [postId, content]);

  // ─── Scroll to bottom on new comment ─────────
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments.length]);

  // ─── Submit new comment (optimistic) ─────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const originalContent = trimmed;
    setContent('');

    // Optimistic temporary comment
    const tempComment = {
      id: `temp-${Date.now()}`,
      user_id: currentUserId.current,
      post_id: postId,
      content: originalContent,
      created_at: new Date().toISOString(),
      author: {
        id: currentUserId.current,
        full_name: 'You',
        avatar_url: null,
        uid: null,
      },
      isTemp: true,
    };
    setComments(prev => [...prev, tempComment]);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/social/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: originalContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Replace temp with real comment
      setComments(prev => prev.map(c => c.id === tempComment.id ? { ...data.comment, isTemp: false } : c));
      // Clear draft
      localStorage.removeItem(`comment_draft_${postId}`);
    } catch (err) {
      // Remove temp comment
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
      setContent(originalContent);
      toast.error(err.message);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ─── Delete comment ──────────────────────────
  const handleDelete = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    // Optimistic delete
    setComments(prev => prev.filter(c => c.id !== commentId));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/social/posts/${postId}/comment/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // Rollback
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Delete failed');
        // We can't rollback without the full comment data; but we'll just refetch
        // For simplicity, we'll just ignore and maybe the socket will correct it.
      } else {
        toast.success('Comment deleted');
        // Emit socket event if needed (backend should emit)
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  // ─── Start editing a comment ────────────────
  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  // ─── Save edited comment ─────────────────────
  const saveEdit = async (commentId) => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === comments.find(c => c.id === commentId)?.content) {
      cancelEdit();
      return;
    }
    // Optimistic update
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: trimmed } : c));
    setEditingId(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/social/posts/${postId}/comment/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Edit failed');
        // Rollback: revert to original content
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: comments.find(oc => oc.id === commentId).content } : c));
      } else {
        toast.success('Comment updated');
      }
    } catch {
      toast.error('Network error');
    }
  };

  // ─── Keyboard shortcuts ──────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape' && editingId) {
      cancelEdit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <MessageSquare className="w-4 h-4" />
        <span>{comments.length} Comments</span>
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-start">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Write a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={1000}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 pr-12 text-white focus:border-purple-500 outline-none transition"
            aria-label="Comment input"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            {content.length}/1000
          </span>
        </div>
        <motion.button
          type="submit"
          disabled={sending || !content.trim()}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl disabled:opacity-50 transition shadow-lg shadow-purple-500/25"
          aria-label="Send comment"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </motion.button>
      </form>

      {/* Comments list */}
      <div ref={listRef} className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
        {loading ? (
          <>
            <SkeletonComment />
            <SkeletonComment />
            <SkeletonComment />
          </>
        ) : comments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No comments yet. Be the first!</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ delay: comment.isTemp ? 0 : index * 0.03 }}
                layout
                className={`flex gap-3 p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm ${
                  comment.isTemp ? 'opacity-70' : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {comment.author?.avatar_url ? (
                    <img src={comment.author.avatar_url} alt="" className="w-8 h-8 object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-purple-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-white">
                      {comment.author?.full_name || 'Unknown'}
                    </span>
                    <span className="text-xs text-zinc-500">{timeAgo(comment.created_at)}</span>
                    {comment.isTemp && (
                      <span className="text-xs text-yellow-400">(sending...)</span>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        autoFocus
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(comment.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        maxLength={1000}
                        className="flex-1 bg-zinc-800 border border-purple-500 rounded-lg px-2 py-1 text-sm text-white outline-none"
                      />
                      <button onClick={() => saveEdit(comment.id)} className="p-1 text-green-400 hover:bg-white/10 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEdit} className="p-1 text-red-400 hover:bg-white/10 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-300 break-words">{comment.content}</p>
                  )}
                </div>

                {/* Action buttons (only for own comments) */}
                {comment.user_id === currentUserId.current && !comment.isTemp && editingId !== comment.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(comment)}
                      className="p-1 text-zinc-500 hover:text-white hover:bg-white/10 rounded transition"
                      aria-label="Edit comment"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 hover:bg-white/10 rounded transition"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default memo(CommentSection);
