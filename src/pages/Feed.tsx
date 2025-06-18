import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase, safeQuery, retryRequest } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import PostInteractions from '../components/PostInteractions';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Work = Database['public']['Tables']['user_works']['Row'];

interface Post extends Work {
  profile: Profile;
}

const Feed = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadPosts = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const works = await safeQuery(
        () => supabase
          .from('user_works')
          .select(`
            *,
            profile:user_id(*)
          `)
          .eq('status', 'public')
          .order('upload_date', { ascending: false }),
        'Error loading posts'
      );

      setPosts(works || []);
    } catch (error: any) {
      console.error('Error loading posts:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    loadPosts();

    // Subscribe to changes
    const subscription = supabase
      .channel('public:user_works')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_works',
        filter: 'status=eq.public'
      }, () => {
        loadPosts(false); // Don't show loading state for updates
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleRetry = () => {
    setIsRetrying(true);
    loadPosts();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] text-center">
        <AlertTriangle size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Unable to Load Feed</h2>
        <p className="text-gray-400 mb-4 max-w-md">{error}</p>
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="bg-gray-600 hover:bg-gray-600 px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={18} className={isRetrying ? 'animate-spin' : ''} />
          
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </button>
      </div>
      
    );
  }
  

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold">Feed</h2>
      {posts.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No posts yet
        </div>
      ) : (
        posts.map((post) => (
          <div
            key={post.id}
            className="bg-grey/25  rounded-lg p-4 border border-gray-700/75"
          >
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => navigate(`/profile/${post.profile.id}`)}
                className="group relative flex items-center gap-3 hover:opacity-80 transition-opacity"
                aria-label={`View ${post.profile.username}'s profile`}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-900 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-black transition-all">
                  {post.profile.avatar_url && (
                    <img 
                      src={post.profile.avatar_url} 
                      alt={post.profile.username}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm group-hover:text-grey-600 transition-colors">
                    {post.profile.username}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(post.upload_date).toLocaleString()}
                  </div>
                </div>
              </button>
            </div>
            
            <img 
              src={post.file_path} 
              alt={post.title}
              className="w-full aspect-video object-cover rounded-lg mb-3"
            />
            
            <p className="text-sm mb-4">{post.description}</p>

            <PostInteractions
              postId={post.id}
              authorId={post.user_id}
              onEdit={() => {/* Implement edit functionality */}}
              onDelete={() => {/* Implement delete functionality */}}
            />
          </div>
        ))
      )}
    </div>
  );
};

export default Feed;