'use client';
import ReferralBox from '@/components/organisms/ReferralBox';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Users, Package, Heart, ShoppingBag,
  Share2, UserPlus, UserCheck, Edit3, ArrowLeft, Link2,
  Globe, Clock, Star, Sparkles,
  Image as ImageIcon, Grid3x3, Loader2, MessageCircle
} from 'lucide-react';
import { Facebook, Instagram, Twitter } from '@/components/ui/BrandIcons';
import { toast } from 'sonner';

// ---------- Utilities ----------
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch(e) { return null; } }
function getToken() { return localStorage.getItem('token'); }

// ---------- Tab Content Components ----------
function ProfilePosts({ uid }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (pageNum) => {
    setLoading(true);
    const res = await fetch(`/api/user/uid/${uid}/posts?page=${pageNum}&limit=12`);
    const data = await res.json();
    if (data.posts) {
      if (pageNum === 1) setPosts(data.posts);
      else setPosts(prev => [...prev, ...data.posts]);
      setHasMore(data.hasMore);
    }
    setLoading(false);
  }, [uid]);

  useEffect(() => { fetchPosts(1); }, [fetchPosts]);

  if (loading && posts.length === 0) return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;
  if (posts.length === 0) return <p className="text-center text-zinc-500 py-10">No posts yet.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map(post => (
          <motion.div
            key={post.id}
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl overflow-hidden"
          >
            {post.media_urls?.[0] && (
              <img src={post.media_urls[0]} alt="" className="w-full h-48 object-cover" />
            )}
            <div className="p-4">
              {post.content && <p className="text-sm text-zinc-300 line-clamp-3">{post.content}</p>}
              <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.like_count || 0}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.comment_count || 0}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {hasMore && (
        <div className="text-center mt-4">
          <button onClick={() => fetchPosts(page + 1)} className="px-4 py-2 bg-zinc-800 rounded-full text-sm hover:bg-zinc-700 transition">
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileProducts({ uid }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/uid/${uid}/products`)
      .then(r => r.json())
      .then(data => setProducts(data.products || []))
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;
  if (products.length === 0) return <p className="text-center text-zinc-500 py-10">No products listed.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map(product => (
        <Link key={product.id} href={`/products/${product.slug || product.id}`} className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-purple-500/30 transition">
          <div className="h-40 bg-zinc-800">
            {product.media?.[0]?.url && <img src={product.media[0].url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="p-3">
            <p className="font-medium text-sm truncate">{product.title}</p>
            <p className="text-purple-400 font-bold text-sm mt-1">${parseFloat(product.price).toFixed(2)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ---------- Main Profile Content ----------
export default function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uidParam = searchParams.get('uid');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const currentUser = getUser();

  useEffect(() => {
    const targetUid = uidParam || currentUser?.uid;
    if (!targetUid) { router.replace('/auth/login'); return; }

    const fetchProfile = async () => {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/user/uid/${targetUid}/profile`, { headers });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setProfile(data.user);
      setIsFollowing(data.is_following || false);
      setFollowersCount(data.followers_count || 0);
      setFollowingCount(data.following_count || 0);
      setLoading(false);
    };

    fetchProfile();
  }, [uidParam, currentUser, router]);

  const handleFollow = async () => {
    const token = getToken();
    if (!token) { toast.error('Please login'); return; }
    const res = await fetch(`/api/user/uid/${profile.uid}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      setIsFollowing(data.following);
      setFollowersCount(prev => data.following ? prev + 1 : prev - 1);
      toast.success(data.following ? 'Following' : 'Unfollowed');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: profile.full_name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Profile link copied!');
    }
  };

  if (loading) return null;
  if (!profile) return <div className="min-h-screen bg-black text-white flex items-center justify-center">User not found.</div>;

  const isOwnProfile = currentUser?.uid === profile.uid;
  const completionPercentage = Math.min(
    100,
    (profile.full_name ? 25 : 0) +
    (profile.email ? 25 : 0) +
    (profile.phone ? 25 : 0) +
    (profile.bio ? 25 : 0)
  );

  const tabs = [
    { id: 'posts', label: 'Posts', icon: Grid3x3 },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'likes', label: 'Likes', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cover Image */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-purple-900/50 via-black to-cyan-900/50 relative overflow-hidden">
        {profile.cover_url && <img src={profile.cover_url} alt="" className="w-full h-full object-cover opacity-50" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 ring-4 ring-black overflow-hidden shadow-xl flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                {profile.full_name?.[0] || 'U'}
              </div>
            )}
          </div>

          {/* Name & Actions */}
          <div className="flex-1 pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{profile.full_name}</h1>
                {profile.membership_tier === 'premium' && <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full ml-2">PREMIUM</span>}
                {profile.membership_tier === 'vip' && <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full ml-2">VIP</span>}
                <p className="text-zinc-400 flex items-center gap-1 text-sm">
                  @{profile.uid}
                  {profile.is_verified && <Star className="w-4 h-4 text-purple-400 fill-purple-400" />}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {isOwnProfile ? (
                  <Link href="/profile/settings" className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition">
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={handleFollow}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                        isFollowing ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300' : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
                    </button>
                  </>
                )}
                <button onClick={handleShare} className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && <p className="text-zinc-300 mt-3">{profile.bio}</p>}

            {/* Social Links */}
            <div className="flex flex-wrap gap-3 mt-3">
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-400 hover:underline">
                  <Globe className="w-4 h-4" /> Website
                </a>
              )}
              {profile.social_links?.facebook && (
                <a href={profile.social_links.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-400 hover:underline">
                  <Facebook className="w-4 h-4" /> Facebook
                </a>
              )}
              {profile.social_links?.instagram && (
                <a href={profile.social_links.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-pink-400 hover:underline">
                  <Instagram className="w-4 h-4" /> Instagram
                </a>
              )}
              {profile.social_links?.twitter && (
                <a href={profile.social_links.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-300 hover:underline">
                  <Twitter className="w-4 h-4" /> Twitter
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-6">
              {[
                { label: 'Posts', value: profile.post_count || 0, icon: Grid3x3 },
                { label: 'Followers', value: followersCount, icon: Users },
                { label: 'Following', value: followingCount, icon: UserCheck },
                { label: 'Products', value: profile.product_count || 0, icon: Package },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="font-bold text-lg">{stat.value}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 justify-center">
                    <stat.icon className="w-3 h-3" /> {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Profile Completion (only own) */}
            {isOwnProfile && completionPercentage < 100 && (
              <div className="mt-4 bg-zinc-900/50 rounded-xl p-3 border border-zinc-800">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Profile Completion</span>
                  <span className="text-purple-400">{completionPercentage}%</span>
                </div>
                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${completionPercentage}%` }} />
                </div>
                <Link href="/profile/settings" className="text-xs text-purple-400 hover:underline mt-2 inline-block">Complete your profile</Link>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-8 border-b border-zinc-800 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="py-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}>
              {activeTab === 'posts' && <ProfilePosts uid={profile.uid} />}
              {activeTab === 'products' && <ProfileProducts uid={profile.uid} />}
              {activeTab === 'media' && (
                <div className="text-center py-10 text-zinc-500">Media gallery coming soon.</div>
              )}
              {activeTab === 'likes' && (
                <div className="text-center py-10 text-zinc-500">Liked posts coming soon.</div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
