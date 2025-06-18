import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UseFollowerCountProps {
  profileId: string;
  refreshInterval?: number;
}

export const useFollowerCount = ({ profileId, refreshInterval = 30000 }: UseFollowerCountProps) => {
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = async () => {
    try {
      // Get follower count
      const { count: followers, error: followerError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId);

      if (followerError) throw followerError;

      // Get following count
      const { count: following, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileId);

      if (followingError) throw followingError;

      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching follower counts:', err);
      setError('Failed to load follower counts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!profileId) return;
    
    fetchCounts();

    // Set up real-time subscription
    const subscription = supabase
      .channel('follows')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'follows',
        filter: `or(follower_id.eq.${profileId},following_id.eq.${profileId})`
      }, () => {
        fetchCounts();
      })
      .subscribe();

    // Set up refresh interval
    const interval = setInterval(fetchCounts, refreshInterval);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [profileId, refreshInterval]);

  return {
    followerCount,
    followingCount,
    isLoading,
    error,
    refresh: fetchCounts
  };
};