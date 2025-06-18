import React, { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, Loader2, FileType, Film, Image, Music } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import type { Contest } from '../types/contest';

interface SubmitContestModalProps {
  contest: Contest;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const SubmitContestModal: React.FC<SubmitContestModalProps> = ({ contest, onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = contest.guidelines?.submissionFormat || ['pdf', 'doc', 'docx'];
  const fileTypeMap = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif'
  };

  const acceptedMimeTypes = allowedTypes
    .map(type => fileTypeMap[type as keyof typeof fileTypeMap])
    .filter(Boolean)
    .join(',');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    setPreview(null);
    const { data: { publicUrl, downloadUrl } } = await supabase.storage
    .from('contest-submissions')
    .getPublicUrl(filePath, { download: true });

    if (!selectedFile) return;

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size must be less than 500MB');
      return;
    }

    // Validate file type
    const fileType = selectedFile.type;
    const isValidType = Object.values(fileTypeMap)
      .filter((_, index) => allowedTypes.includes(Object.keys(fileTypeMap)[index]))
      .includes(fileType);

    if (!isValidType) {
      setError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
      return;
    }

    setFile(selectedFile);

    // Generate preview for images and videos
    if (fileType.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else if (fileType.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(selectedFile);
      setPreview(videoUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // First get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${contest.id}-${Date.now()}.${fileExt}`;
      const filePath = `submissions/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('contest-submissions')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100);
          }
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contest-submissions')
        .getPublicUrl(filePath);
      const downloadUrl = submission.download_url;
      <a href={downloadUrl} target="_blank" rel="noopener noreferrer">Download Submission</a>

      // Save submission details with user profile
      const { error: submissionError } = await supabase
    .from('contest_submissions')
    .insert({
        contest_id: contest.id,
        user_id: user.id,
        title,
        description,
        file_url: publicUrl,
        download_url: downloadUrl,
        status: 'pending',
        user_profile: {
            username: profile.username,
            specialty: profile.specialty,
            avatar_url: profile.avatar_url
        }
    });

      if (submissionError) throw submissionError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting contest entry:', err);
      setError('Failed to submit entry. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getFileIcon = () => {
    if (!file) return null;
    
    if (file.type.startsWith('image/')) return <Image size={48} />;
    if (file.type.startsWith('video/')) return <Film size={48} />;
    if (file.type.startsWith('audio/')) return <Music size={48} />;
    return <FileType size={48} />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Submit Entry</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={isUploading}
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              required
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Upload File ({allowedTypes.join(', ')})
            </label>
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                file ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-blue-500'
              }`}
            >
              {file ? (
                <div className="space-y-2">
                  {preview ? (
                    file.type.startsWith('image/') ? (
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="max-h-48 mx-auto rounded"
                      />
                    ) : file.type.startsWith('video/') ? (
                      <video 
                        src={preview}
                        className="max-h-48 mx-auto rounded"
                        controls
                      />
                    ) : null
                  ) : (
                    <div className="text-blue-400">{getFileIcon()}</div>
                  )}
                  <div className="text-sm">
                    <div className="font-medium">{file.name}</div>
                    <div className="text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-1 text-sm text-gray-400">
                    Click to upload or drag and drop<br />
                    Max size: 500MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept={acceptedMimeTypes}
                disabled={isUploading}
              />
            </div>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-center text-gray-400">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading || !file}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg py-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Submit Entry
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmitContestModal;