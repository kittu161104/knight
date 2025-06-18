import React, { useState, useRef, useEffect } from 'react';
import { Camera, LogOut, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { useFollowerCount } from '../hooks/useFollowerCount';
import { formatCount } from '../lib/utils';
import { supabase } from '../lib/supabase';
import WorkUploadModal from '../components/WorkUploadModal';
import WorkCard from '../components/WorkCard';
import FollowersModal from '../components/FollowersModal';
import type { Database } from '../lib/database.types';

type Work = Database['public']['Tables']['user_works']['Row'];
type Specialty = 'directing' | 'cinematography' | 'editing' | 'sound' | 'vfx';

interface EditProfileFormData {
  name: string;
  bio: string;
  specialty: Specialty;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingWork, setIsAddingWork] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [works, setWorks] = useState<Work[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [profileData, setProfileData] = useState<EditProfileFormData>({
    name: user?.email?.split('@')[0] || '',
    bio: 'Filmmaker • Director • Editor',
    specialty: 'editing'
  });

  const { 
    followerCount, 
    followingCount, 
    isLoading: isLoadingCounts,
    error: countError,
    refresh: refreshCounts 
  } = useFollowerCount({ 
    profileId: user?.id || '',
    refreshInterval: 10000
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    
    if (!file) return;
    
    if (file.size > 500 * 2160 * 2160) {
      setUploadError('Image size must be less than 500MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

    } catch (error: any) {
      console.error('Error uploading image:', error);
      setUploadError('Failed to upload image. Please try again.');
      setProfileImage(null);
    }
  };

  useEffect(() => {
    const loadProfileAndWorks = async () => {
      if (!user?.id) return;
      setIsLoading(true);

      try {
        // Load profile
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('avatar_url, username, bio, specialty')
          .eq('id', user.id)
          .single();

        if (fetchError && fetchError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const defaultProfile = {
            id: user.id,
            username: user.email?.split('@')[0] || '',
            specialty: 'editing',
            bio: 'Filmmaker • Director • Editor',
            created_at: new Date().toISOString(),
          };

          const { error: createError } = await supabase
            .from('profiles')
            .insert([defaultProfile]);

          if (createError) throw createError;

          setProfileData({
            name: defaultProfile.username,
            bio: defaultProfile.bio,
            specialty: defaultProfile.specialty as Specialty
          });
        } else if (existingProfile) {
          setProfileImage(existingProfile.avatar_url);
          setProfileData({
            name: existingProfile.username || user.email?.split('@')[0] || '',
            bio: existingProfile.bio || 'Filmmaker • Director • Editor',
            specialty: existingProfile.specialty || 'editing' as Specialty
          });
        }

        // Load works
        const { data: works, error: worksError } = await supabase
          .from('user_works')
          .select('*')
          .eq('user_id', user.id)
          .order('upload_date', { ascending: false });

        if (worksError) throw worksError;
        setWorks(works || []);

      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileAndWorks();
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profileData.name,
          bio: profileData.bio,
          specialty: profileData.specialty
        })
        .eq('id', user?.id);

      if (error) throw error;
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleWorkSuccess = async () => {
    if (!user?.id) return;
    
    // Reload works
    const { data, error } = await supabase
      .from('user_works')
      .select('*')
      .eq('user_id', user.id)
      .order('upload_date', { ascending: false });

    if (error) {
      console.error('Error loading works:', error);
      return;
    }

    setWorks(data || []);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6 border border-gray-700">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Profile Image Section */}
          <div className="space-y-2 w-full sm:w-auto flex flex-col items-center">
            <div 
              className="relative w-24 h-24 sm:w-32 sm:h-32 group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 rounded-full" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-50 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                className="hidden"
              />
            </div>
            {uploadError && (
              <p className="text-red-500 text-sm text-center">{uploadError}</p>
            )}
          </div>

          {/* Profile Info Section */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold">{profileData.name}</h2>
            <p className="text-gray-400">{profileData.bio}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-2">
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

          {/* Action Buttons */}
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <button
              onClick={() => setIsEditingProfile(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 px-4 py-2 rounded-lg"
            >
              Edit Profile
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Add Work Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsAddingWork(true)}
          className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Add Work
        </button>
      </div>

      {/* Works Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {works.map((work) => (
          <WorkCard
            key={work.id}
            work={work}
            isOwner={user?.id === work.user_id}
            onDelete={handleWorkSuccess}
            onUpdate={handleWorkSuccess}
          />
        ))}
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Edit Profile</h3>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Specialty</label>
                <select
                  value={profileData.specialty}
                  onChange={(e) => setProfileData({...profileData, specialty: e.target.value as Specialty})}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
                >
                  <option value="directing">Directing</option>
                  <option value="cinematography">Cinematography</option>
                  <option value="editing">Editing</option>
                  <option value="sound">Sound</option>
                  <option value="vfx">VFX</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-gray-600 hover:bg-gray-700 rounded-lg py-2"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Work Upload Modal */}
      {isAddingWork && user && (
        <WorkUploadModal
          userId={user.id}
          onClose={() => setIsAddingWork(false)}
          onSuccess={handleWorkSuccess}
        />
      )}

      {/* Followers/Following Modals */}
      {showFollowersModal && user && (
        <FollowersModal
          profileId={user.id}
          type="followers"
          onClose={() => setShowFollowersModal(false)}
        />
      )}

      {showFollowingModal && user && (
        <FollowersModal
          profileId={user.id}
          type="following"
          onClose={() => setShowFollowingModal(false)}
        />
      )}
    </div>
  );
};

export default Profile;