import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Shield, Upload, Calendar, Users, Filter, Search, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import AdminLoginModal from '../components/admin/AdminLoginModal';
import SubmitContestModal from '../components/SubmitContestModal';
import type { Contest } from '../types/contest';

interface Filters {
  prizeMin: number;
  prizeMax: number;
  entryFee: 'all' | 'free' | 'paid';
  deadline: 'all' | 'week' | 'month' | 'quarter';
}

const Contests = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contests, setContests] = useState<Contest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [filters, setFilters] = useState<Filters>({
    prizeMin: 0,
    prizeMax: 100000,
    entryFee: 'all',
    deadline: 'all'
  });

  useEffect(() => {
    const loadContests = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: contestsError } = await supabase
          .from('contests')
          .select(`
            *,
            participant_count:contest_submissions(count)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (contestsError) throw contestsError;

        setContests(data?.map(contest => ({
          ...contest,
          participant_count: contest.participant_count?.[0]?.count || 0
        })) || []);
      } catch (err) {
        console.error('Error loading contests:', err);
        setError('Failed to load contests');
      } finally {
        setIsLoading(false);
      }
    };

    loadContests();

    // Subscribe to changes
    const subscription = supabase
      .channel('contests')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'contests',
        filter: 'status=eq.active'
      }, () => {
        loadContests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = (contest: Contest) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedContest(contest);
  };

  const handleSubmissionSuccess = () => {
    // Refresh contests to update participant count
    const updatedContests = contests.map(c => {
      if (c.id === selectedContest?.id) {
        return {
          ...c,
          participant_count: c.participant_count + 1
        };
      }
      return c;
    });
    setContests(updatedContests);
    setSelectedContest(null);
  };

  const resetFilters = () => {
    setFilters({
      prizeMin: 0,
      prizeMax: 100000,
      entryFee: 'all',
      deadline: 'all'
    });
  };

  // Filter contests based on search and filters
  const filteredContests = contests.filter(contest => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!contest.title.toLowerCase().includes(query) &&
          !contest.description.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Prize range filter
    const prizeAmount = parseInt(contest.prize.replace(/[^0-9]/g, ''));
    if (prizeAmount < filters.prizeMin || prizeAmount > filters.prizeMax) {
      return false;
    }

    // Entry fee filter
    if (filters.entryFee !== 'all') {
      const entryFeeAmount = parseInt(contest.entry_fee.replace(/[^0-9]/g, '')) || 0;
      if (filters.entryFee === 'free' && entryFeeAmount > 0) return false;
      if (filters.entryFee === 'paid' && entryFeeAmount === 0) return false;
    }

    // Deadline filter
    if (filters.deadline !== 'all') {
      const deadline = new Date(contest.deadline);
      const now = new Date();
      const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (filters.deadline === 'week' && diffDays > 7) return false;
      if (filters.deadline === 'month' && diffDays > 30) return false;
      if (filters.deadline === 'quarter' && diffDays > 90) return false;
    }

    return true;
  });

 if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle size={48} className="text-gray-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Contests</h2>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg flex items-center gap-2"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Contests</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Filter size={18} />
            Filters
          </button>
          
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contests..."
                  className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-gray-600"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Prize Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.prizeMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, prizeMin: parseInt(e.target.value) || 0 }))}
                  placeholder="Min"
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={filters.prizeMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, prizeMax: parseInt(e.target.value) || 0 }))}
                  placeholder="Max"
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Entry Fee</label>
              <select
                value={filters.entryFee}
                onChange={(e) => setFilters(prev => ({ ...prev, entryFee: e.target.value as 'all' | 'free' | 'paid' }))}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Deadline</label>
              <select
                value={filters.deadline}
                onChange={(e) => setFilters(prev => ({ ...prev, deadline: e.target.value as 'all' | 'week' | 'month' | 'quarter' }))}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="week">Within a week</option>
                <option value="month">Within a month</option>
                <option value="quarter">Within 3 months</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {filteredContests.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No contests found</p>
          {(searchQuery || filters.prizeMin > 0 || filters.prizeMax < 100000 || filters.entryFee !== 'all' || filters.deadline !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                resetFilters();
              }}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredContests.map((contest) => (
            <div
              key={contest.id}
              className="bg-gray-800/25 backdrop-blur-sm rounded-lg p-6 border border-gray-700"
            >
              <Trophy className="h-8 w-8 text-yellow-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">{contest.title}</h3>
              <p className="text-gray-400 mb-4">{contest.description}</p>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-green-400">Prize: {contest.prize}</span>
                <span className="text-blue-400">Entry: {contest.entry_fee}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  {new Date(contest.deadline).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  {contest.participant_count} entries
                </div>
              </div>
              <button
                onClick={() => handleSubmit(contest)}
                className="w-full bg-gray-600 hover:bg-gray-800 rounded-lg py-2 flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                Submit Entry
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdminLogin && (
        <AdminLoginModal onClose={() => setShowAdminLogin(false)} />
      )}

      {selectedContest && (
        <SubmitContestModal
          contest={selectedContest}
          onClose={() => setSelectedContest(null)}
          onSuccess={handleSubmissionSuccess}
        />
      )}
    </div>
  );
};

export default Contests;