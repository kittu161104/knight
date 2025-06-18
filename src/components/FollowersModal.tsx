import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface FollowersModalProps {
  profileId: string;
  type: 'followers' | 'following';
  onClose: () => void;
}

const FollowersModal: React.FC<FollowersModalProps> = ({ profileId, type, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setIsLoading(true);

        // Get followers or following based on type
        const { data, error } = await supabase
          .from('follows')
          .select(`
            ${type === 'followers' ? 'follower:follower_id(*)' : 'following:following_id(*)'}
          `)
          .eq(type === 'followers' ? 'following_id' : 'follower_id', profileId);

        if (error) throw error;

        // Extract profiles from the response
        const profiles = data.map(item => type === 'followers' ? item.follower : item.following);
        setProfiles(profiles.filter(Boolean)); // Remove null values

        // If user is logged in, get their following status for each profile
        if (user) {
          const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          if (followingData) {
            const followingMap = followingData.reduce((acc, item) => {
              acc[item.following_id] = true;
              return acc;
            }, {} as Record<string, boolean>);
            setFollowingMap(followingMap);
          }
        }
      } catch (error) {
        console.error('Error loading profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, [profileId, type, user]);

  const handleFollow = async (targetId: string) => {
    if (!user) return;

    try {
      if (followingMap[targetId]) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetId);

        setFollowingMap(prev => ({ ...prev, [targetId]: false }));
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetId
          });

        setFollowingMap(prev => ({ ...prev, [targetId]: true }));
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (profile.bio && profile.bio.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No {type} found
              </div>
            ) : (
              filteredProfiles.map((profile) => (
                <div key={profile.id} className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/profile/${profile.id}`)}
                    className="flex-1 flex items-center gap-3 hover:opacity-80"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
                      {profile.avatar_url && (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {profile.username}
                      </div>
                      {profile.bio && (
                        <div className="text-sm text-gray-400 truncate">
                          {profile.bio}
                        </div>
                      )}
                    </div>
                  </button>

                  {user && user.id !== profile.id && (
                    <button
                      onClick={() => handleFollow(profile.id)}
                      className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
                        followingMap[profile.id]
                          ? 'bg-gray-700 hover:bg-gray-600'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {followingMap[profile.id] ? (
                        <>
                          <UserMinus size={14} />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowersModal;