import React, { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import type { Contest } from '../../types/contest';

interface EditContestModalProps {
  contest: Contest;
  onClose: () => void;
  onSave: (contestData: any) => void;
}

const EditContestModal: React.FC<EditContestModalProps> = ({ contest, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: contest.title,
    description: contest.description,
    prizeAmount: parseInt(contest.prize.replace(/[^0-9]/g, '')),
    entryFee: parseInt(contest.entry_fee.replace(/[^0-9]/g, '')) || 0,
    deadline: new Date(contest.deadline).toISOString().split('T')[0],
    status: contest.status,
    guidelines: contest.guidelines || {}
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate form data
      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }

      if (!formData.description.trim()) {
        setError('Description is required');
        return;
      }

      if (new Date(formData.deadline) <= new Date()) {
        setError('Deadline must be in the future');
        return;
      }

      onSave({
        id: contest.id,
        ...formData
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update contest');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Edit Contest</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prize Amount ($)</label>
              <input
                type="number"
                value={formData.prizeAmount}
                onChange={(e) => handleChange('prizeAmount', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Entry Fee ($)</label>
              <input
                type="number"
                value={formData.entryFee}
                onChange={(e) => handleChange('entryFee', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Deadline</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => handleChange('deadline', e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditContestModal;