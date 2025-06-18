import React, { useState, useEffect } from 'react';
import { Eye, Star, Download, Loader2, AlertTriangle, Search, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Submission = Database['public']['Tables']['contest_submissions']['Row'] & {
  contest: {
    title: string;
  } | null;
  profile: {
    username: string;
    avatar_url: string | null;
  } | null;
  user_profile: {
    username: string;
    specialty: string;
    avatar_url: string | null;
  } | null;
};

const AdminSubmissions = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('contest_submissions')
          .select(`
            *,
            contest:contest_id(title),
            profile:user_id(username, avatar_url)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSubmissions(data || []);
      } catch (err: any) {
        console.error('Error loading submissions:', err);
        setError('Failed to load submissions');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmissions();

    // Subscribe to changes
    const subscription = supabase
      .channel('contest_submissions')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'contest_submissions'
      }, () => {
        loadSubmissions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
    if (!selectedSubmission) return;

    if (!selectedSubmission.user_id) {
      alert('Cannot review submission: user not found');
      return;
    }

    if (status === 'approved' && !rating) {
      alert('Please provide a rating');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Use the stored function to safely update submission
      const { error } = await supabase.rpc('update_submission_status', {
        p_submission_id: submissionId,
        p_status: status,
        p_score: rating,
        p_feedback: feedback
      });

      if (error) throw error;

      // Update local state
      setSubmissions(prev =>
        prev.map(sub =>
          sub.id === submissionId
            ? { ...sub, status, score: rating, feedback }
            : sub
        )
      );

      setShowReviewModal(false);
      setSelectedSubmission(null);
      setRating(0);
      setFeedback('');
    } catch (error: any) {
      console.error('Error updating submission:', error);
      setError(error.message || 'Failed to update submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (submission: Submission) => {
    try {
      // Extract filename from URL
      const filename = submission.file_url.split('/').pop() || 'download';
      
      // Create a temporary anchor element
      const link = document.createElement('a');
      link.href = submission.file_url;
      link.download = filename;
      link.target = '_blank';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    // Status filter
    if (statusFilter !== 'all' && submission.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery && submission.profile && submission.contest) {
      const query = searchQuery.toLowerCase();
      return (
        submission.profile.username.toLowerCase().includes(query) ||
        submission.contest.title.toLowerCase().includes(query) ||
        submission.title.toLowerCase().includes(query)
      );
    }

    return true;
  });

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
        <h2 className="text-xl font-bold mb-2">Error Loading Submissions</h2>
        <p className="text-gray-400 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Review Submissions</h1>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 mb-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search submissions..."
                className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4">Submission</th>
                <th className="text-left p-4">Contest</th>
                <th className="text-left p-4">Submitted</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Score</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="border-b border-gray-700">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
                        {(submission.user_profile?.avatar_url || submission.profile?.avatar_url) && (
                          <img
                            src={submission.user_profile?.avatar_url || submission.profile?.avatar_url}
                            alt={submission.user_profile?.username || submission.profile?.username}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{submission.title}</div>
                        <div className="text-sm text-gray-400">
                          by {submission.user_profile?.username || submission.profile?.username || 'Unknown User'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">{submission.contest?.title || 'Unknown Contest'}</td>
                  <td className="p-4">
                    {new Date(submission.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      submission.status === 'approved' 
                        ? 'bg-green-500/10 text-green-500'
                        : submission.status === 'rejected'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {submission.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {submission.score ? `${submission.score}/100` : '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setShowReviewModal(true);
                        }}
                        className="p-2 hover:bg-gray-700 rounded-lg"
                        title="Review submission"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownload(submission)}
                        className="p-2 hover:bg-gray-700 rounded-lg"
                        title="Download submission"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Review Submission</h3>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedSubmission(null);
                  setRating(0);
                  setFeedback('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <Eye size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Submission Details</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="font-medium">{selectedSubmission.title}</p>
                  <p className="text-sm text-gray-400">
                    by {selectedSubmission.profile?.username || 'Unknown User'}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Submitted on {new Date(selectedSubmission.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Rating</h4>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star * 20)}
                      className={`p-1 rounded-lg transition-colors ${
                        rating >= star * 20
                          ? 'text-yellow-500'
                          : 'text-gray-400 hover:text-yellow-500'
                      }`}
                    >
                      <Star size={24} className="fill-current" />
                    </button>
                  ))}
                  <span className="ml-2 text-gray-400">
                    {rating} points
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Feedback</h4>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Provide feedback for the submission..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(selectedSubmission.id, 'approved')}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 rounded-lg py-2 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(selectedSubmission.id, 'rejected')}
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 rounded-lg py-2 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubmissions;