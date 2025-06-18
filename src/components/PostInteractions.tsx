import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Edit2, Trash2, X, Search, Clock } from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface Like {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  profile: Profile;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  post_id: string;
  created_at: string;
  profile: Profile;
}

interface PostInteractionsProps {
  postId: string;
  authorId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner?: boolean;
}

const PostInteractions: React.FC<PostInteractionsProps> = ({
  postId,
  authorId,
  onEdit,
  onDelete,
  isOwner
}) => {
  const { user } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showLikes, setShowLikes] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [likes, setLikes] = useState<Like[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // Check if user liked the post
        const { data: likes } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id);

        setIsLiked(likes && likes.length > 0);

        // Get like count
        const { count: likeCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);

        setLikeCount(likeCount || 0);

        // Get comment count
        const { count: commentCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);

        setCommentCount(commentCount || 0);

        // Load comments
        const { data: commentsData } = await supabase
          .from('comments')
          .select(`
            *,
            profile:user_id(*)
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        setComments(commentsData || []);
      } catch (error) {
        console.error('Error loading interactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();

    // Subscribe to changes
    const subscription = supabase
      .channel('post_interactions')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'likes',
        filter: `post_id=eq.${postId}`
      }, () => {
        loadInitialData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'comments',
        filter: `post_id=eq.${postId}`
      }, () => {
        loadInitialData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, postId]);

  const handleLike = async () => {
    if (!user) return;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
      console.error('Error updating like:', error);
    }
  };

  const handleComment = async () => {
    if (!user || !newComment.trim()) return;

    const tempId = `temp_${Date.now()}`; // Use underscore instead of hyphen
    const tempComment = {
      id: tempId,
      post_id: postId,
      user_id: user.id,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      profile: {
        id: user.id,
        username: user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url
      }
    };

    // Optimistically update UI
    setComments(prev => [...prev, tempComment]);
    setCommentCount(prev => prev + 1);
    setNewComment('');

    try {
      // Send to server
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`
          *,
          profile:user_id(*)
        `)
        .single();

      if (error) throw error;

      // Replace temp comment with real one
      setComments(prev =>
        prev.map(comment =>
          comment.id === tempId ? data : comment
        )
      );
    } catch (error) {
      console.error('Error adding comment:', error);
      // Remove the temporary comment on error
      setComments(prev => prev.filter(comment => comment.id !== tempId));
      setCommentCount(prev => prev - 1);
      setNewComment(newComment); // Restore the comment text
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    // Don't try to delete temp comments from the server
    if (commentId.startsWith('temp_')) {
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      setCommentCount(prev => prev - 1);
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Update local state
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      setCommentCount(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div>
      {/* Interaction Buttons */}
      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={handleLike}
          className={`p-2 rounded-lg transition-colors ${
            isLiked ? 'text-pink-500' : 'hover:bg-gray-700'
          }`}
          aria-label={isLiked ? 'Unlike post' : 'Like post'}
        >
          <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
        </button>
        <div className="relative">
          <button
            onClick={() => {
              setShowComments(true);
              setTimeout(() => {
                commentInputRef.current?.focus();
              }, 100);
            }}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Show comments"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
          {commentCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {commentCount}
            </span>
          )}
        </div>
        {isOwner && (
          <>
            <button
              onClick={onEdit}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Edit post"
            >
              <Edit2 className="w-6 h-6" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-red-500"
              aria-label="Delete post"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Like Count */}
      <button
        onClick={() => setShowLikes(true)}
        className="mt-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        {likeCount} {likeCount === 1 ? 'like' : 'likes'}
      </button>

      {/* Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-xl flex flex-col h-[80vh]">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Comments ({commentCount})
              </h3>
              <button
                onClick={() => setShowComments(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0">
                    {comment.profile.avatar_url && (
                      <img
                        src={comment.profile.avatar_url}
                        alt={comment.profile.username}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium">
                          {comment.profile.username}
                        </span>
                        <p className="text-gray-300 mt-1">
                          {comment.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock className="w-4 h-4" />
                        {new Date(comment.created_at).toLocaleTimeString()}
                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setNewComment(e.target.value);
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-700 rounded-lg px-4 py-2 resize-none focus:ring-2 focus:ring-blue-500"
                  rows={1}
                />
                <button
                  onClick={handleComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-400 flex justify-between">
                <span>{newComment.length}/500</span>
                <span>Press Enter to post</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostInteractions;