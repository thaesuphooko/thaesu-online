'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const getToken = () => {
  if (typeof window !== 'undefined') return localStorage.getItem('token');
  return null;
};

export default function PollDisplay({ post, refresh }) {
  const [selected, setSelected] = useState(null);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localVotes, setLocalVotes] = useState(post.poll?.votes || []);

  if (!post.poll) return null;

  const poll = post.poll;
  const totalVotes = localVotes.reduce((a, b) => a + (b || 0), 0);

  const handleVote = async (optionIndex) => {
    if (voted || loading) return;
    const token = getToken();
    if (!token) {
      toast.error('Please login to vote');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/poll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ option_index: optionIndex }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelected(optionIndex);
        setVoted(true);
        // Optimistically update local votes count
        setLocalVotes(prev => {
          const updated = [...prev];
          updated[optionIndex] = (updated[optionIndex] || 0) + 1;
          return updated;
        });
        toast.success('Vote recorded! 🎉');
        if (refresh) refresh();
      } else {
        toast.error(data.error || 'Failed to vote');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Animation variants for option bars
  const barVariants = {
    initial: { width: 0 },
    animate: (width) => ({
      width: `${width}%`,
      transition: { duration: 0.6, ease: 'easeOut' },
    }),
  };

  return (
    <div className="mb-4 p-4 bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 backdrop-blur-md border border-zinc-700/50 rounded-2xl shadow-xl">
      <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
        <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">Poll</span>
        {poll.question}
      </h4>

      <div className="space-y-3">
        {(poll.options || []).map((opt, idx) => {
          const votes = localVotes[idx] || 0;
          const percent = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
          const isSelected = selected === idx;
          const showResult = voted;

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={voted || loading}
              className={`w-full text-left relative group transition-all duration-200 ${
                showResult ? 'cursor-default' : 'cursor-pointer hover:scale-[1.01]'
              }`}
            >
              {/* Background bar */}
              <motion.div
                className={`absolute inset-0 rounded-xl ${
                  isSelected
                    ? 'bg-purple-500/30 border border-purple-400/50'
                    : 'bg-zinc-700/40 border border-zinc-600/30'
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Progress fill */}
              {showResult && (
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600/30 to-purple-500/10 rounded-l-xl"
                  variants={barVariants}
                  initial="initial"
                  animate="animate"
                  custom={percent}
                />
              )}

              {/* Content */}
              <div className="relative z-10 flex justify-between items-center px-4 py-2.5">
                <span className={`text-sm font-medium ${isSelected ? 'text-purple-200' : 'text-zinc-200'}`}>
                  {opt}
                </span>
                {showResult && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs text-zinc-400 ml-2 flex items-center gap-1"
                  >
                    <span className="font-mono">{votes}</span>
                    <span className="text-zinc-500">({Math.round(percent)}%)</span>
                  </motion.span>
                )}
                {!showResult && !voted && (
                  <span className="text-xs text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to vote
                  </span>
                )}
              </div>

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-3 text-xs text-zinc-500">
        <span>{totalVotes} total vote{totalVotes !== 1 ? 's' : ''}</span>
        {voted && (
          <motion.span
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-purple-400 font-medium"
          >
            ✓ Voted
          </motion.span>
        )}
      </div>
    </div>
  );
}
