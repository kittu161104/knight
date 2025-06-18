import React, { useState, useEffect } from 'react';
import { Check, X, DollarSign, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import type { Database } from '../lib/database.types';

type Request = Database['public']['Tables']['collaboration_requests']['Row'];
type Agreement = Database['public']['Tables']['collaboration_agreements']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ExtendedRequest extends Request {
  sender: Profile;
  receiver: Profile;
  agreement?: Agreement;
}

interface CollaborationRequestsProps {
  onBack?: () => void;
}

const CollaborationRequests: React.FC<CollaborationRequestsProps> = ({ onBack }) => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ExtendedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    const loadRequests = async () => {
      if (!user) return;
      setIsLoading(true);

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
      } catch (error) {
        console.error('Error loading requests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRequests();
  }, [user]);

  const handleAction = async (requestId: string, action: 'accepted' | 'declined') => {
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

  const handleAgreementAction = async (requestId: string, action: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase
        .from('collaboration_agreements')
        .update({ status: action })
        .eq('request_id', requestId);

      if (error) throw error;

      setRequests(requests.map(req => 
        req.id === requestId && req.agreement
          ? { 
              ...req, 
              agreement: { 
                ...req.agreement, 
                status: action 
              } 
            }
          : req
      ));
    } catch (error) {
      console.error('Error updating agreement:', error);
    }
  };

  const filteredRequests = requests.filter(request => 
    activeTab === 'received' 
      ? request.receiver_id === user?.id
      : request.sender_id === user?.id
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-4 border-b border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'received'
                ? 'bg-blue-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Received
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'sent'
                ? 'bg-blue-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Sent
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            No {activeTab} requests
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const otherUser = activeTab === 'received' ? request.sender : request.receiver;

              return (
                <div
                  key={request.id}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center gap-3 mb-3">
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
                        <span className="font-medium">{otherUser.username}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {request.message && (
                        <p className="text-sm text-gray-400 mt-1">
                          {request.message}
                        </p>
                      )}
                    </div>
                    <div>
                      {request.status === 'pending' ? (
                        <span className="px-2 py-1 text-sm bg-yellow-500/10 text-yellow-500 rounded">
                          Pending
                        </span>
                      ) : request.status === 'accepted' ? (
                        <span className="px-2 py-1 text-sm bg-green-500/10 text-green-500 rounded">
                          Accepted
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-sm bg-red-500/10 text-red-500 rounded">
                          Declined
                        </span>
                      )}
                    </div>
                  </div>

                  {request.agreement && (
                    <div className="flex items-center gap-2 mb-4 text-sm">
                      <DollarSign size={16} className="text-gray-400" />
                      <span>
                        {request.agreement.payment_amount} {request.agreement.currency}
                      </span>
                      {request.agreement.status !== 'pending' && (
                        <span className={`ml-2 ${
                          request.agreement.status === 'accepted' 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }`}>
                          • {request.agreement.status}
                        </span>
                      )}
                    </div>
                  )}

                  {request.status === 'pending' && activeTab === 'received' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(request.id, 'accepted')}
                        className="flex-1 bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 flex items-center justify-center gap-2"
                      >
                        <Check size={18} />
                        Accept
                      </button>
                      <button
                        onClick={() => handleAction(request.id, 'declined')}
                        className="flex-1 bg-red-600 hover:bg-red-700 rounded-lg px-4 py-2 flex items-center justify-center gap-2"
                      >
                        <X size={18} />
                        Decline
                      </button>
                    </div>
                  )}

                  {request.status === 'accepted' && 
                   request.agreement?.status === 'pending' && 
                   activeTab === 'sent' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAgreementAction(request.id, 'accepted')}
                        className="flex-1 bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 flex items-center justify-center gap-2"
                      >
                        <Check size={18} />
                        Accept Terms
                      </button>
                      <button
                        onClick={() => handleAgreementAction(request.id, 'declined')}
                        className="flex-1 bg-red-600 hover:bg-red-700 rounded-lg px-4 py-2 flex items-center justify-center gap-2"
                      >
                        <X size={18} />
                        Decline Terms
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {onBack && (
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onBack}
            className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg py-2 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      )}
    </div>
  );
};

export default CollaborationRequests;