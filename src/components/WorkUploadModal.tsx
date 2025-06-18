import React, { useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type WorkType = Database['public']['Tables']['user_works']['Row']['work_type'];
type WorkStatus = Database['public']['Tables']['user_works']['Row']['status'];

interface WorkUploadModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const WorkUploadModal: React.FC<WorkUploadModalProps> = ({ userId, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState<WorkType>('image');
  const [status, setStatus] = useState<WorkStatus>('public');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);

    if (!selectedFile) return;

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const validTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif'],
      video: ['video/mp4', 'video/quicktime'],
      document: ['application/pdf']
    };

    const isValidType = validTypes[workType].includes(selectedFile.type);
    if (!isValidType) {
      setError(`Invalid file type. Please upload a ${workType} file.`);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${workType}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('works')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('works')
        .getPublicUrl(filePath);

      // Save work details to database
      const { error: dbError } = await supabase
        .from('user_works')
        .insert({
          user_id: userId,
          title,
          description,
          file_path: publicUrl,
          work_type: workType,
          status
        });

      if (dbError) throw dbError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error uploading work:', err);
      setError('Failed to upload work. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900/80 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Add New Work</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={isUploading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              required
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Work Type</label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value as WorkType)}
              className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              disabled={isUploading}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Privacy</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as WorkStatus)}
              className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              disabled={isUploading}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Upload File</label>
            <div 
              onClick={() => !isUploading && document.getElementById('file-upload')?.click()}
              className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer"
            >
              {file ? (
                <div className="text-sm text-gray-400">{file.name}</div>
              ) : (
                <>
                  <Camera className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-1 text-sm text-gray-400">
                    Click to upload or drag and drop<br />
                    Max size: 10MB
                  </p>
                </>
              )}
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept={workType === 'image' ? 'image/*' : workType === 'video' ? 'video/*' : '.pdf'}
                disabled={isUploading}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isUploading || !file}
            className="w-full bg-gray-600 hover:bg-gray-700 rounded-lg py-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Work'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WorkUploadModal;