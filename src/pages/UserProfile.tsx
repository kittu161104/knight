import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserPlus, UserMinus, MessageCircle, AlertTriangle, Loader2, HandshakeIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { useFollowerCount } from '../hooks/useFollowerCount';
import { formatCount } from '../lib/utils';
import MessageModal from '../components/MessageModal';
import CollaborationModal from '../components/CollaborationModal';
import FollowersModal from '../components/FollowersModal';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showCollaborateModal, setShowCollaborateModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { 
    followerCount, 
    followingCount,
    isLoading: isLoadingCounts,
    error: countError,
    refresh: refreshCounts 
  } = useFollowerCount({ 
    profileId: id || '',
    refreshInterval: 10000
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);

      try {
        // Load profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;
        setProfile(profile);

        // Check if following
        if (user) {
          const { data: follows, error: followError } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', user.id)
            .eq('following_id', id);

          if (followError && followError.code !== 'PGRST116') {
            throw followError;
          }

          setIsFollowing(follows && follows > 0);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [id, user]);

  const handleFollow = async () => {
    if (!user || !profile) return;

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: profile.id
          });

        if (error) throw error;
        setIsFollowing(true);
      }
      refreshCounts();
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] text-center">
        <AlertTriangle size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Profile</h2>
        <p className="text-gray-400 mb-4">{error || 'Profile not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-6 border border-gray-700">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600">
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold">{profile.username}</h2>
            <p className="text-gray-400 mb-4">{profile.bio}</p>
            
            {/* Action Buttons - Mobile */}
            {user && user.id !== profile.id && (
              <div className="flex flex-col gap-2 md:hidden w-full">
                <button
                  onClick={handleFollow}
                  className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                    isFollowing
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus size={18} />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Follow
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowCollaborateModal(true)}
                  className="w-full bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <HandshakeIcon size={18} />
                  Collaborate
                </button>
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="w-full bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} />
                  Message
                </button>
              </div>
            )}

            <div className="flex justify-center md:justify-start gap-4 mt-2">
              <button
                onClick={() => setShowFollowersModal(true)}
                className="text-gray-400 hover:text-gray-300"
              >
                {formatCount(followerCount)} Followers
              </button>
              <button
                onClick={() => setShowFollowingModal(true)}
                className="text-gray-400 hover:text-gray-300"
              >
                {formatCount(followingCount)} Following
              </button>
            </div>
          </div>

          {/* Action Buttons - Desktop */}
          {user && user.id !== profile.id && (
            <div className="hidden md:flex gap-2">
              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  isFollowing
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserMinus size={18} />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Follow
                  </>
                )}
              </button>
              <button
                onClick={() => setShowCollaborateModal(true)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <HandshakeIcon size={18} />
                Collaborate
              </button>
              <button
                onClick={() => setShowMessageModal(true)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <MessageCircle size={18} />
                Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showMessageModal && (
        <MessageModal
          recipient={profile}
          onClose={() => setShowMessageModal(false)}
        />
      )}

      {showCollaborateModal && (
        <CollaborationModal
          profile={profile}
          onClose={() => setShowCollaborateModal(false)}
        />
      )}

      {showFollowersModal && (
        <FollowersModal
          profileId={profile.id}
          type="followers"
          onClose={() => setShowFollowersModal(false)}
        />
      )}

      {showFollowingModal && (
        <FollowersModal
          profileId={profile.id}
          type="following"
          onClose={() => setShowFollowingModal(false)}
        />
      )}
    </div>
  );
};

export default UserProfile;