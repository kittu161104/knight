import React, { useState } from 'react';
import { X, DollarSign, Plus, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Currency = 'USD' | 'EUR' | 'GBP';

interface CollaborationModalProps {
  profile: Profile;
  onClose: () => void;
}

const MIN_AMOUNT = 50;
const MAX_AMOUNT = 10000;
const STEP = 50;

const CollaborationModal: React.FC<CollaborationModalProps> = ({ profile, onClose }) => {
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState(MIN_AMOUNT);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAmountChange = (delta: number) => {
    const newAmount = amount + delta;
    if (newAmount >= MIN_AMOUNT && newAmount <= MAX_AMOUNT) {
      setAmount(newAmount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to send collaboration requests');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      // Create collaboration request
      const { data: request, error: requestError } = await supabase
        .from('collaboration_requests')
        .insert({
          sender_id: user.id,
          receiver_id: profile.id,
          message,
          status: 'pending'
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create initial agreement
      const { error: agreementError } = await supabase
        .from('collaboration_agreements')
        .insert({
          request_id: request.id,
          payment_amount: amount,
          currency,
          status: 'pending'
        });

      if (agreementError) throw agreementError;

      onClose();
    } catch (err) {
      console.error('Error creating collaboration request:', err);
      setError('Failed to send collaboration request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Collaborate with {profile.username}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your collaboration proposal..."
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
              rows={4}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payment Amount</label>
            <div className="flex items-center gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="bg-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500"
                disabled={isSubmitting}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="GBP">INR</option>
              </select>
              
              <div className="flex-1 flex items-center">
                <button
                  type="button"
                  onClick={() => handleAmountChange(-STEP)}
                  className="bg-gray-700 hover:bg-gray-600 p-2 rounded-l-lg"
                  disabled={amount <= MIN_AMOUNT || isSubmitting}
                >
                  <Minus size={18} />
                </button>
                <div className="flex items-center bg-gray-700 px-4 py-2">
                  <DollarSign size={18} className="text-gray-400" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= MIN_AMOUNT && val <= MAX_AMOUNT) {
                        setAmount(val);
                      }
                    }}
                    className="w-20 bg-transparent text-center focus:outline-none"
                    min={MIN_AMOUNT}
                    max={MAX_AMOUNT}
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAmountChange(STEP)}
                  className="bg-gray-700 hover:bg-gray-600 p-2 rounded-r-lg"
                  disabled={amount >= MAX_AMOUNT || isSubmitting}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Min: ${MIN_AMOUNT} • Max: ${MAX_AMOUNT}
            </p>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gray-600 hover:bg-gray-700 rounded-lg py-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Sending Request...' : 'Send Collaboration Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CollaborationModal;