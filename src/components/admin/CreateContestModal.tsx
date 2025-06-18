import React, { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';

interface BatchSize {
  name: string;
  size: number;
}

const BATCH_SIZES: BatchSize[] = [
  { name: 'Small', size: 5 },
  { name: 'Medium', size: 20 },
  { name: 'Large', size: 100 }
];

const GENRES = [
  'Drama',
  'Comedy',
  'Thriller',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Fantasy'
];

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];

const FILE_TYPES = {
  'Documents': ['pdf', 'doc', 'docx'],
  'Audio': ['mp3', 'wav'],
  'Video': ['mp4', 'mov'],
  'Images': ['jpg', 'png', 'gif']
};

interface CreateContestModalProps {
  onClose: () => void;
  onSave: (contestData: any) => void;
}

const CreateContestModal: React.FC<CreateContestModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prizeAmount: 1000,
    entryFee: 0,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft' as const,
    genre: GENRES[0],
    wordLimitMin: 1000,
    wordLimitMax: 5000,
    timeLimit: 7,
    timeLimitUnit: 'days',
    languages: [LANGUAGES[0]],
    batchSize: BATCH_SIZES[0],
    numberOfBatches: 1,
    submissionType: 'Documents',
    maxFileSize: 100,
    submissionFormat: FILE_TYPES['Documents']
  });

  const totalParticipants = formData.batchSize.size * formData.numberOfBatches;

  const handleChange = (key: string, value: any) => {
    if (key === 'submissionType') {
      setFormData(prev => ({
        ...prev,
        [key]: value,
        submissionFormat: FILE_TYPES[value as keyof typeof FILE_TYPES]
      }));
    } else {
      setFormData(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      guidelines: {
        genre: formData.genre,
        wordLimit: {
          min: formData.wordLimitMin,
          max: formData.wordLimitMax
        },
        timeLimit: {
          value: formData.timeLimit,
          unit: formData.timeLimitUnit
        },
        languages: formData.languages,
        batchSize: formData.batchSize,
        numberOfBatches: formData.numberOfBatches,
        submissionFormat: formData.submissionFormat,
        maxFileSize: formData.maxFileSize
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-b bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">Create Contest</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
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
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
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
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
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
                className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          {/* Submission Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Submission Settings</h3>

            <div>
              <label className="block text-sm font-medium mb-1">Submission Type</label>
              <select
                value={formData.submissionType}
                onChange={(e) => handleChange('submissionType', e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
              >
                {Object.keys(FILE_TYPES).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-400">
                Allowed formats: {formData.submissionFormat.join(', ')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Maximum File Size (MB)</label>
              <input
                type="number"
                value={formData.maxFileSize}
                onChange={(e) => handleChange('maxFileSize', Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
                min="1"
                max="500"
                required
              />
              <p className="mt-1 text-sm text-gray-400">Maximum allowed: 500MB</p>
            </div>
          </div>

          {/* Contest Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contest Settings</h3>
            
            <div>
              <label className="block text-sm font-medium mb-1">Genre</label>
              <select
                value={formData.genre}
                onChange={(e) => handleChange('genre', e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
              >
                {GENRES.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Time Limit</label>
                <input
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) => handleChange('timeLimit', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select
                  value={formData.timeLimitUnit}
                  onChange={(e) => handleChange('timeLimitUnit', e.target.value)}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Allowed Languages</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <label key={lang} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.languages.includes(lang)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleChange('languages', [...formData.languages, lang]);
                        } else {
                          handleChange('languages', formData.languages.filter(l => l !== lang));
                        }
                      }}
                      className="rounded border-gray-600 text-gray-600 focus:ring-gray-500"
                    />
                    {lang}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Batch Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Batch Configuration</h3>
            
            <div>
              <label className="block text-sm font-medium mb-1">Batch Size</label>
              <div className="grid grid-cols-3 gap-4">
                {BATCH_SIZES.map(batch => (
                  <button
                    key={batch.name}
                    type="button"
                    onClick={() => handleChange('batchSize', batch)}
                    className={`p-3 rounded-lg border ${
                      formData.batchSize.name === batch.name
                        ? 'border-gray-500 bg-gray-500/10'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium">{batch.name}</div>
                    <div className="text-sm text-gray-400">{batch.size} participants</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Number of Batches</label>
              <input
                type="number"
                value={formData.numberOfBatches}
                onChange={(e) => handleChange('numberOfBatches', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
                min="1"
                required
              />
              <p className="mt-1 text-sm text-gray-400">
                Total participants: {totalParticipants}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2"
            >
              <Save size={18} />
              Create Contest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateContestModal;