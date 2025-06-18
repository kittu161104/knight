import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Edit2, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import CreateContestModal from '../../components/admin/CreateContestModal';
import EditContestModal from '../../components/admin/EditContestModal';
import type { Contest } from '../../types/contest';

const AdminContests = () => {
  const { user } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContests = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: contestsData, error: contestsError } = await supabase
        .from('contests')
        .select(`
          *,
          participant_count:contest_submissions(count)
        `)
        .order('created_at', { ascending: false });

      if (contestsError) throw contestsError;

      setContests(contestsData?.map(contest => ({
        ...contest,
        participant_count: contest.participant_count?.[0]?.count || 0
      })) || []);
    } catch (err: any) {
      console.error('Error loading contests:', err);
      setError(err.message || 'Failed to load contests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContests();

    // Subscribe to changes
    const subscription = supabase
      .channel('contests')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'contests' 
      }, () => {
        loadContests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCreateContest = async (contestData: any) => {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('contests')
        .insert({
          title: contestData.title,
          description: contestData.description,
          prize: `$${contestData.prizeAmount}`,
          entry_fee: contestData.entryFee === 0 ? 'Free' : `$${contestData.entryFee}`,
          deadline: new Date(contestData.deadline).toISOString(),
          status: contestData.status,
          guidelines: contestData.guidelines
        })
        .select()
        .single();

      if (error) throw error;

      setShowCreateModal(false);
      loadContests();
    } catch (err: any) {
      console.error('Error creating contest:', err);
      setError(err.message || 'Failed to create contest');
    }
  };

  const handleUpdateContest = async (contestData: any) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('contests')
        .update({
          title: contestData.title,
          description: contestData.description,
          prize: `$${contestData.prizeAmount}`,
          entry_fee: contestData.entryFee === 0 ? 'Free' : `$${contestData.entryFee}`,
          deadline: new Date(contestData.deadline).toISOString(),
          status: contestData.status,
          guidelines: contestData.guidelines,
          updated_at: new Date().toISOString()
        })
        .eq('id', contestData.id);

      if (error) throw error;

      setEditingContest(null);
      loadContests();
    } catch (err: any) {
      console.error('Error updating contest:', err);
      setError(err.message || 'Failed to update contest');
    }
  };

  const handleDeleteContest = async (contestId: string) => {
    if (!confirm('Are you sure you want to delete this contest? This action cannot be undone.')) return;

    try {
      setError(null);

      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', contestId);

      if (error) throw error;
      loadContests();
    } catch (err: any) {
      console.error('Error deleting contest:', err);
      setError(err.message || 'Failed to delete contest');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Contests</h2>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={loadContests}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg flex items-center gap-2"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Contests</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Create Contest
        </button>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4">Title</th>
                <th className="text-left p-4">Prize</th>
                <th className="text-left p-4">Entries</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Deadline</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contests.map((contest) => (
                <tr key={contest.id} className="border-b border-gray-700">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="text-yellow-500" size={18} />
                      <div>
                        <div className="font-medium">{contest.title}</div>
                        <div className="text-sm text-gray-400">{contest.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">{contest.prize}</td>
                  <td className="p-4">{contest.participant_count}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      contest.status === 'active' 
                        ? 'bg-green-500/10 text-green-500'
                        : contest.status === 'draft'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : contest.status === 'paused'
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {contest.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {new Date(contest.deadline).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button 
                        className="p-2 hover:bg-gray-700 rounded-lg"
                        onClick={() => setEditingContest(contest)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="p-2 hover:bg-gray-700 rounded-lg text-red-500"
                        onClick={() => handleDeleteContest(contest.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateContestModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateContest}
        />
      )}

      {editingContest && (
        <EditContestModal
          contest={editingContest}
          onClose={() => setEditingContest(null)}
          onSave={handleUpdateContest}
        />
      )}
    </div>
  );
};

export default AdminContests;