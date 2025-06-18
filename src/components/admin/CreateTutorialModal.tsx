import React, { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, Loader2, Video, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

interface CreateTutorialModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const ALLOWED_DOC_TYPES = ['application/pdf'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

const CreateTutorialModal: React.FC<CreateTutorialModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('screenwriting');
  const [difficulty, setDifficulty] = useState('beginner');
  const [type, setType] = useState<'video' | 'notes'>('video');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File, allowedTypes: string[], maxSize: number, fileType: string) => {
    if (file.size > maxSize) {
      throw new Error(`${fileType} size must be less than ${Math.floor(maxSize / (1024 * 1024))}MB`);
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`);
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);

    if (!selectedFile) return;

    try {
      const allowedTypes = type === 'video' ? ALLOWED_VIDEO_TYPES : ALLOWED_DOC_TYPES;
      validateFile(selectedFile, allowedTypes, MAX_FILE_SIZE, type === 'video' ? 'Video' : 'PDF');
      setFile(selectedFile);
    } catch (err: any) {
      setError(err.message);
      e.target.value = ''; // Reset input
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);

    if (!selectedFile) return;

    try {
      validateFile(selectedFile, ALLOWED_IMAGE_TYPES, 2 * 1024 * 1024, 'Thumbnail');
      setThumbnail(selectedFile);
    } catch (err: any) {
      setError(err.message);
      e.target.value = ''; // Reset input
    }
  };

  const uploadFile = async (file: File, path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('tutorials')
        .upload(path, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false
        });

      if (error) {
        if (error.message.includes('size')) {
          throw new Error('File size exceeds the maximum limit');
        }
        if (error.message.includes('type')) {
          throw new Error('File type not supported');
        }
        throw error;
      }

      return data.path;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Upload main file
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}s/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = await uploadFile(file, fileName);

      // Get file URL
      const { data: { publicUrl: fileUrl } } = supabase.storage
        .from('tutorials')
        .getPublicUrl(filePath);

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnail) {
        const thumbExt = thumbnail.name.split('.').pop();
        const thumbName = `thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.${thumbExt}`;
        const thumbPath = await uploadFile(thumbnail, thumbName);

        const { data: { publicUrl } } = supabase.storage
          .from('tutorials')
          .getPublicUrl(thumbPath);

        thumbnailUrl = publicUrl;
      }

      // Create tutorial record
      const { error: dbError } = await supabase
        .from('tutorials')
        .insert({
          title: title.trim(),
          description: description.trim(),
          type,
          category,
          difficulty,
          file_url: fileUrl,
          thumbnail_url: thumbnailUrl,
          created_by: user.id
        });

      if (dbError) {
        // If database insert fails, clean up uploaded files
        if (filePath) {
          await supabase.storage.from('tutorials').remove([filePath]);
        }
        if (thumbnailUrl) {
          await supabase.storage.from('tutorials').remove([thumbnailUrl]);
        }
        throw dbError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating tutorial:', err);
      setError('Failed to create tutorial. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-8 z-50">
      <div className="bg-gradient-to-b bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-xl font-bold">Create Tutorial</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={isUploading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
              className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
              required
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
              rows={3}
              required
              disabled={isUploading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
                disabled={isUploading}
              >
                <option value="screenwriting">Screenwriting</option>
                <option value="music">Music & Sound</option>
                <option value="vfx">VFX</option>
                <option value="editing">Editing</option>
                <option value="dop">Cinematography</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-gray-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
                disabled={isUploading}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setType('video')}
                className={`p-4 rounded-lg border ${
                  type === 'video'
                    ? 'border-gray-500 bg-gray-500/10'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
                disabled={isUploading}
              >
                <Video className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm">Video Tutorial</span>
              </button>
              <button
                type="button"
                onClick={() => setType('notes')}
                className={`p-4 rounded-lg border ${
                  type === 'notes'
                    ? 'border-gray-500 bg-gray-500/10'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
                disabled={isUploading}
              >
                <FileText className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm">PDF Notes</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Upload {type === 'video' ? 'Video' : 'PDF'}
            </label>
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                file ? 'border-gray-500 bg-gray-500/10' : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              {file ? (
                <div className="text-sm text-gray-400">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-1 text-sm text-gray-400">
                    Click to upload or drag and drop<br />
                    {type === 'video' ? 'MP4 or MOV up to 500MB' : 'PDF up to 500MB'}
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept={type === 'video' ? 'video/mp4,video/quicktime' : 'application/pdf'}
                className="hidden"
                disabled={isUploading}
              />
            </div>
          </div>

          {type === 'video' && (
            <div>
              <label className="block text-sm font-medium mb-1">Thumbnail (Optional)</label>
              <div 
                onClick={() => !isUploading && thumbnailInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  thumbnail ? 'border-gray-500 bg-gray-500/10' : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                {thumbnail ? (
                  <img
                    src={URL.createObjectURL(thumbnail)}
                    alt="Thumbnail preview"
                    className="max-h-32 mx-auto rounded"
                  />
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-1 text-sm text-gray-400">
                      Upload thumbnail image (JPG/PNG)<br />
                      Recommended: 16:9 ratio, max 2MB
                    </p>
                  </>
                )}
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  onChange={handleThumbnailChange}
                  accept="image/jpeg,image/png"
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            </div>
          )}

          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-500 transition-all duration-300"
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
                Creating Tutorial...
              </>
            ) : (
              'Create Tutorial'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTutorialModal;