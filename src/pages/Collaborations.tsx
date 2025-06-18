import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Check, X, AlertTriangle, UserPlus, Users, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Request = Database['public']['Tables']['collaboration_requests']['Row'];
type Agreement = Database['public']['Tables']['collaboration_agreements']['Row'];

interface ExtendedRequest extends Request {
  sender: Profile;
  receiver: Profile;
  agreement?: Agreement;
}

const Collaborations: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [requests, setRequests] = useState<ExtendedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRequests = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('collaboration_requests')
          .select(`
            *,
            sender:sender_id(*),
            receiver:receiver_id(*),
            agreement:collaboration_agreements(*)
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRequests(data as ExtendedRequest[]);
      } catch (err: any) {
        console.error('Error loading requests:', err);
        setError('Failed to load collaboration requests');
      } finally {
        setIsLoading(false);
      }
    };

    loadRequests();

    // Subscribe to changes
    const subscription = supabase
      .channel('collaboration_requests')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'collaboration_requests',
        filter: `or(sender_id.eq.${user?.id},receiver_id.eq.${user?.id})`
      }, () => {
        loadRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, navigate]);

  const handleAction = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      const { error } = await supabase
        .from('collaboration_requests')
        .update({ status: action })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, status: action }
          : req
      ));
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('collaboration_requests')
        .delete()
        .eq('id', requestId)
        .eq('sender_id', user?.id);

      if (error) throw error;

      setRequests(requests.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error canceling request:', error);
    }
  };

  const filteredRequests = requests.filter(request => 
    activeTab === 'received' 
      ? request.receiver_id === user?.id
      : request.sender_id === user?.id
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] text-center">
        <AlertTriangle size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Unable to Load Collaborations</h2>
        <p className="text-gray-400 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            aria-label="Back to Home"
          >
            <Home size={18} />
            Back to Home
          </button>
          <h2 className="text-2xl font-bold">Collaborations</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'received'
                ? 'bg-blue-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <Users size={18} />
            Received
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'sent'
                ? 'bg-blue-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <UserPlus size={18} />
            Sent
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 text-center border border-gray-700">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">
              No {activeTab} collaboration requests
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const otherUser = activeTab === 'received' ? request.sender : request.receiver;
            
            return (
              <div
                key={request.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
                    {otherUser.avatar_url && (
                      <img
                        src={otherUser.avatar_url}
                        alt={otherUser.username}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {otherUser.username}
                        </h3>
                        <p className="text-gray-400">
                          {otherUser.specialty}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock size={16} />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {request.message && (
                      <p className="mt-2 text-gray-300">
                        {request.message}
                      </p>
                    )}
                  </div>
                </div>

                {request.status === 'pending' ? (
                  <div className="mt-4 flex gap-2">
                    {activeTab === 'received' ? (
                      <>
                        <button
                          onClick={() => handleAction(request.id, 'accept')}
                          className="flex-1 bg-green-600 hover:bg-green-700 rounded-lg py-2 flex items-center justify-center gap-2"
                        >
                          <Check size={18} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleAction(request.id, 'decline')}
                          className="flex-1 bg-red-600 hover:bg-red-700 rounded-lg py-2 flex items-center justify-center gap-2"
                        >
                          <X size={18} />
                          Decline
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleCancel(request.id)}
                        className="w-full bg-red-600 hover:bg-red-700 rounded-lg py-2 flex items-center justify-center gap-2"
                      >
                        <X size={18} />
                        Cancel Request
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      request.status === 'accepted'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {request.status === 'accepted' ? (
                        <>
                          <Check size={14} />
                          Accepted
                        </>
                      ) : (
                        <>
                          <X size={14} />
                          Declined
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Collaborations;