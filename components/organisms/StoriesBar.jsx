'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const STORY_DURATION = 5000; // 5 seconds per story
const PROGRESS_INTERVAL = 50;

export default function StoriesBar() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingUser, setViewingUser] = useState(null); // user whose stories are being viewed
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState({});
  const timerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const touchStartX = useRef(0);

  // ========== Fetch Stories ==========
  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/stories?page=1&limit=20', { headers });
      if (!res.ok) throw new Error('Failed to fetch stories');
      const data = await res.json();
      setStories(data.stories || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  // ========== Group stories by user ==========
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) acc[story.user_id] = { user: { id: story.user_id, full_name: story.full_name, avatar_url: story.avatar_url }, stories: [] };
    acc[story.user_id].stories.push(story);
    return acc;
  }, {});
  const groupedList = Object.values(groupedStories);

  // ========== Story Viewer Logic ==========
  const openUserStories = (user) => {
    setViewingUser(user);
    setCurrentStoryIndex(0);
    setProgress(0);
    setIsPaused(false);
  };

  const closeViewer = () => {
    setViewingUser(null);
    setCurrentStoryIndex(0);
    setProgress(0);
    clearInterval(timerRef.current);
    clearInterval(progressTimerRef.current);
  };

  const goNext = useCallback(() => {
    if (!viewingUser) return;
    if (currentStoryIndex < viewingUser.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
    } else {
      closeViewer();
    }
  }, [viewingUser, currentStoryIndex]);

  const goPrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    }
  }, [currentStoryIndex]);

  // ========== Auto advance timer ==========
  useEffect(() => {
    if (!viewingUser || isPaused) return;
    timerRef.current = setTimeout(() => {
      goNext();
    }, STORY_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [viewingUser, currentStoryIndex, isPaused, goNext]);

  // ========== Progress bar timer ==========
  useEffect(() => {
    if (!viewingUser || isPaused) return;
    progressTimerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimerRef.current);
          return 100;
        }
        return prev + (100 / (STORY_DURATION / PROGRESS_INTERVAL));
      });
    }, PROGRESS_INTERVAL);
    return () => clearInterval(progressTimerRef.current);
  }, [viewingUser, currentStoryIndex, isPaused]);

  // ========== Touch / Gesture Support ==========
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) goNext();
      else goPrev();
    }
  };

  // ========== Image Preloading ==========
  const preloadImage = (url) => {
    if (!url || preloadedImages[url]) return;
    const img = new Image();
    img.src = url;
    setPreloadedImages(prev => ({ ...prev, [url]: true }));
  };

  // ========== Delete Own Story ==========
  const deleteStory = async (storyId) => {
    const token = getToken();
    if (!token) return toast.error('Login required');
    try {
      const res = await fetch(`/api/stories?id=${storyId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        toast.success('Story deleted');
        fetchStories();
        closeViewer();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Delete failed');
      }
    } catch (e) { toast.error('Network error'); }
  };

  // ========== Add Story ==========
  const handleAddStory = async () => {
    if (!mediaUrl.trim()) return toast.error('Please enter a media URL');
    const token = getToken();
    if (!token) return toast.error('Login required');
    const type = mediaUrl.match(/\.(mp4|webm|ogg)$/) ? 'video' : 'image';
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ media_url: mediaUrl, type }),
    });
    if (res.ok) {
      toast.success('Story added!');
      setMediaUrl('');
      setShowAddModal(false);
      fetchStories();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to add story');
    }
  };

  // ========== Loading State ==========
  if (loading) return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 shrink-0 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-zinc-800" />
          <div className="h-3 w-12 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div className="text-center py-2 text-zinc-500 text-sm">
      Failed to load stories. <button onClick={fetchStories} className="text-purple-400 underline">Retry</button>
    </div>
  );

  if (groupedList.length === 0 && !showAddModal) return null;

  return (
    <div className="relative">
      {/* Stories List */}
      <div className="flex gap-3 overflow-x-auto pb-2 px-2 scrollbar-hide">
        {/* Add Story Button */}
        <button onClick={() => setShowAddModal(true)} className="flex flex-col items-center gap-1 shrink-0 group">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 transition-transform group-hover:scale-105">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <Plus className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <span className="text-[10px] text-zinc-400">Your Story</span>
        </button>

        {/* Other users' stories */}
        {groupedList.map(group => (
          <button
            key={group.user.id}
            onClick={() => { openUserStories(group); group.stories.forEach(s => preloadImage(s.media_url)); }}
            className="flex flex-col items-center gap-1 shrink-0 group"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 transition-transform group-hover:scale-105">
              <img
                src={group.user.avatar_url || '/placeholder.jpg'}
                alt={group.user.full_name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="text-[10px] text-zinc-400 truncate w-16">{group.user.full_name}</span>
          </button>
        ))}
      </div>

      {/* Add Story Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" /> Add Story
              </h3>
              <input
                type="text"
                placeholder="Enter image or video URL"
                value={mediaUrl}
                onChange={e => setMediaUrl(e.target.value)}
                className="w-full p-3 bg-zinc-800 rounded-xl text-white placeholder-zinc-500 mb-4 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex gap-2">
                <button onClick={handleAddStory} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium transition">Post Story</button>
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story Viewer */}
      <AnimatePresence>
        {viewingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-20">
              {viewingUser.stories.map((_, idx) => (
                <div key={idx} className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: '0%' }}
                    animate={{ width: idx < currentStoryIndex ? '100%' : idx === currentStoryIndex ? `${progress}%` : '0%' }}
                    transition={{ ease: 'linear' }}
                  />
                </div>
              ))}
            </div>

            {/* Close button */}
            <button onClick={closeViewer} className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full">
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Delete button (own story) */}
            {viewingUser.user.id === (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('user') || '{}')?.id) && (
              <button
                onClick={() => deleteStory(viewingUser.stories[currentStoryIndex]?.id)}
                className="absolute top-4 left-4 z-20 p-2 bg-red-500/20 rounded-full"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            )}

            {/* Prev/Next buttons */}
            {currentStoryIndex > 0 && (
              <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 rounded-full">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}
            {currentStoryIndex < viewingUser.stories.length - 1 && (
              <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 rounded-full">
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Story Media */}
            <div className="relative w-full h-full max-w-md mx-auto flex items-center justify-center" onClick={() => setIsPaused(!isPaused)}>
              {viewingUser.stories[currentStoryIndex]?.type === 'video' ? (
                <video
                  src={viewingUser.stories[currentStoryIndex].media_url}
                  className="w-full max-h-[80vh] object-contain"
                  controls
                  autoPlay
                  onEnded={goNext}
                />
              ) : (
                <img
                  src={viewingUser.stories[currentStoryIndex]?.media_url}
                  alt="Story"
                  className="w-full max-h-[80vh] object-contain"
                />
              )}
              {isPaused && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-12 h-12 rounded-full bg-purple-500/80 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
