import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Trophy,
  Users,
  GavelIcon,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface DashboardStats {
  totalContests: number;
  activeContests: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  totalJudges: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalContests: 0,
    activeContests: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0,
    totalJudges: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Try to get contest stats - if it fails, tables don't exist
        const { count: totalContests, error: contestsError } = await supabase
          .from('contests')
          .select('*', { count: 'exact', head: true });

        if (contestsError) {
          setError('Admin tables are not set up yet. Please run the database migrations.');
          setIsLoading(false);
          return;
        }

        // Get active contests
        const { count: activeContests } = await supabase
          .from('contests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Get submission stats
        const { count: totalSubmissions } = await supabase
          .from('contest_submissions')
          .select('*', { count: 'exact', head: true });

        const { count: pendingSubmissions } = await supabase
          .from('contest_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Get judge stats
        const { count: totalJudges } = await supabase
          .from('contest_judges')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalContests: totalContests || 0,
          activeContests: activeContests || 0,
          totalSubmissions: totalSubmissions || 0,
          pendingSubmissions: pendingSubmissions || 0,
          totalJudges: totalJudges || 0
        });
        setError(null);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        setError('Failed to load dashboard statistics. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Total Contests',
      value: stats.totalContests,
      icon: Trophy,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Contests',
      value: stats.activeContests,
      icon: Clock,
      color: 'bg-green-500'
    },
    {
      title: 'Total Submissions',
      value: stats.totalSubmissions,
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingSubmissions,
      icon: TrendingUp,
      color: 'bg-yellow-500'
    },
    {
      title: 'Active Judges',
      value: stats.totalJudges,
      icon: GavelIcon,
      color: 'bg-red-500'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle size={48} className="text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Setup Required</h1>
        <p className="text-gray-400 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{card.title}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4">
            <p className="text-gray-400 text-center">
              Activity feed coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;