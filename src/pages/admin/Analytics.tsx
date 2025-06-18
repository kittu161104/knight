import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Clock, Trophy, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PlatformAnalytics {
  total_users: number;
  active_users: number;
  total_watch_time: number;
  average_completion: number;
}

interface UserAnalytics {
  id: string;
  username: string;
  email: string;
  registration_date: string;
  last_login: string;
  tutorials_watched: number;
  completion_rate: number;
  total_time: number;
}

const AdminAnalytics = () => {
  const [platformStats, setPlatformStats] = useState<PlatformAnalytics | null>(null);
  const [userStats, setUserStats] = useState<UserAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get platform analytics
        const { data: platformData, error: platformError } = await supabase
          .rpc('get_platform_analytics');

        if (platformError) throw platformError;
        setPlatformStats(platformData);

        // Get user analytics
        const { data: userData, error: userError } = await supabase
          .rpc('get_user_analytics');

        if (userError) throw userError;
        setUserStats(userData || []);

      } catch (err) {
        console.error('Error loading analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Analytics</h2>
        <p className="text-gray-400 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Platform Analytics</h1>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-3xl font-bold mt-1">{platformStats?.total_users || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <Users size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-3xl font-bold mt-1">{platformStats?.active_users || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <Users size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Watch Time</p>
              <p className="text-3xl font-bold mt-1">
                {Math.round(platformStats?.total_watch_time / 3600)}h
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <Clock size={24} className="text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg. Completion</p>
              <p className="text-3xl font-bold mt-1">
                {Math.round(platformStats?.average_completion || 0)}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500">
              <Trophy size={24} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* User Analytics Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4">User</th>
                <th className="text-left p-4">Tutorials Watched</th>
                <th className="text-left p-4">Completion Rate</th>
                <th className="text-left p-4">Total Time</th>
                <th className="text-left p-4">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {userStats.map((user) => (
                <tr key={user.id} className="border-b border-gray-700">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </div>
                  </td>
                  <td className="p-4">{user.tutorials_watched}</td>
                  <td className="p-4">{Math.round(user.completion_rate)}%</td>
                  <td className="p-4">{Math.round(user.total_time / 3600)}h</td>
                  <td className="p-4">
                    {new Date(user.last_login).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;