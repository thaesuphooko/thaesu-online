import { create } from 'zustand';

/**
 * Premium Ultra Pro Max Feed Store
 * - Infinite scroll with cursor management
 * - Pull-to-refresh state
 * - Optimistic like/comment updates
 * - Tab-aware (community / wattpad)
 * - Error handling & retry
 * - Scroll position memory
 * - Cache invalidation
 */
const useFeedStore = create((set, get) => ({
  // ========== Data ==========
  items: [],                    // current loaded feed items
  page: 1,                      // next page to fetch
  hasMore: true,               // whether more pages exist
  initialLoading: true,        // first load
  loading: false,              // subsequent loads
  refreshing: false,           // pull-to-refresh
  error: null,                 // error message
  scrollPosition: 0,          // window.scrollY
  lastFetchTime: null,         // timestamp of last successful fetch
  activeTab: 'community',      // 'community' | 'wattpad'

  // ========== Actions ==========

  /** Set all items (replace) */
  setItems: (items) => set({ items, error: null }),

  /** Append items for infinite scroll */
  appendItems: (newItems) => set(state => ({
    items: [...state.items, ...newItems],
    error: null,
  })),

  /** Set page number */
  setPage: (page) => set({ page }),

  /** Set hasMore flag */
  setHasMore: (hasMore) => set({ hasMore }),

  /** Set loading states */
  setLoading: (loading) => set({ loading }),
  setInitialLoading: (val) => set({ initialLoading: val }),
  setRefreshing: (val) => set({ refreshing: val }),

  /** Set error message */
  setError: (error) => set({ error }),

  /** Set scroll position */
  setScrollPosition: (pos) => set({ scrollPosition: pos }),

  /** Set active tab */
  setActiveTab: (tab) => {
    if (tab !== get().activeTab) {
      // Reset feed when switching tabs
      set({
        activeTab: tab,
        items: [],
        page: 1,
        hasMore: true,
        initialLoading: true,
        error: null,
        scrollPosition: 0,
      });
    }
  },

  /** Mark a successful fetch */
  markFetchSuccess: () => set({ lastFetchTime: Date.now(), error: null }),

  /** Reset store to initial state */
  reset: () => set({
    items: [],
    page: 1,
    hasMore: true,
    scrollPosition: 0,
    loading: false,
    initialLoading: true,
    refreshing: false,
    error: null,
    lastFetchTime: null,
  }),

  // ========== Optimistic Updates ==========

  /** Optimistically toggle like on a post */
  optimisticLike: (postId, newLiked) =>
    set(state => ({
      items: state.items.map(item => {
        if (item.type === 'post' && item.data?.id === postId) {
          return {
            ...item,
            data: {
              ...item.data,
              liked_by_user: newLiked,
              like_count: (item.data.like_count || 0) + (newLiked ? 1 : -1),
            },
          };
        }
        return item;
      }),
    })),

  /** Optimistically add a comment count */
  optimisticCommentCount: (postId, increment = 1) =>
    set(state => ({
      items: state.items.map(item => {
        if (item.type === 'post' && item.data?.id === postId) {
          return {
            ...item,
            data: {
              ...item.data,
              comment_count: (item.data.comment_count || 0) + increment,
            },
          };
        }
        return item;
      }),
    })),

  /** Update a single post with server data (after real API call) */
  updatePost: (postId, updatedData) =>
    set(state => ({
      items: state.items.map(item => {
        if (item.type === 'post' && item.data?.id === postId) {
          return { ...item, data: { ...item.data, ...updatedData } };
        }
        return item;
      }),
    })),

  /** Remove a deleted post */
  removePost: (postId) =>
    set(state => ({
      items: state.items.filter(item => !(item.type === 'post' && item.data?.id === postId)),
    })),

  // ========== Cache Invalidation ==========

  /** Check if cache is still fresh (within 5 minutes) */
  isCacheFresh: () => {
    const { lastFetchTime } = get();
    if (!lastFetchTime) return false;
    return Date.now() - lastFetchTime < 5 * 60 * 1000;
  },

  /** Force refetch from page 1 */
  refreshFeed: () => {
    set({
      page: 1,
      hasMore: true,
      refreshing: true,
      error: null,
    });
  },

  // ========== Scroll Restoration ==========

  /** Save current scroll position (call from scroll event) */
  saveScroll: () => {
    if (typeof window !== 'undefined') {
      set({ scrollPosition: window.scrollY });
    }
  },

  /** Restore scroll position (call after items are rendered) */
  restoreScroll: () => {
    const { scrollPosition } = get();
    if (typeof window !== 'undefined' && scrollPosition > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition);
      });
    }
  },
}));

export default useFeedStore;
