import React, { useState } from 'react';
import { Edit2, Trash2, Eye, EyeOff, Heart, MessageCircle, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import type { Database } from '../lib/database.types';

type Work = Database['public']['Tables']['user_works']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile: Profile;
  pending?: boolean;
}

interface WorkCardProps {
  work: Work;
  onDelete: () => void;
  onUpdate: () => void;
  isOwner: boolean;
}

const WorkCard: React.FC<WorkCardProps> = ({ work, onDelete, onUpdate, isOwner }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthStore();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this work?')) return;
    
    setIsDeleting(true);
    try {
      // Delete file from storage
      const filePath = work.file_path.split('/').pop();
      if (filePath) {
        await supabase.storage
          .from('works')
          .remove([`${work.work_type}s/${filePath}`]);
      }

      // Delete database entry
      const { error } = await supabase
        .from('user_works')
        .delete()
        .eq('id', work.id);

      if (error) throw error;
      onDelete();
    } catch (error) {
      console.error('Error deleting work:', error);
      alert('Failed to delete work. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative group">
      <div className="aspect-video bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 hover:border-gray-500 transition-colors overflow-hidden">
        {work.work_type === 'image' ? (
          <img 
            src={work.file_path} 
            alt={work.title}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setShowPopup(true)}
          />
        ) : work.work_type === 'video' ? (
          <video 
            src={work.file_path}
            className="w-full h-full object-cover"
            controls
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <a 
              href={work.file_path}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-300"
            >
              View Document
            </a>
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
        <div className="text-center p-4">
          <h3 className="text-lg font-semibold mb-1">{work.title}</h3>
          {work.description && (
            <p className="text-sm text-gray-300 mb-4 line-clamp-2">{work.description}</p>
          )}
          
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowPopup(true)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            >
              <Eye size={16} />
            </button>
            {isOwner && (
              <>
                <button
                  onClick={onUpdate}
                  className="p-2 bg-gray-600 rounded-full hover:bg-gray-700 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-2 bg-red-600 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            {work.status === 'private' && (
              <div className="p-2 bg-gray-700 rounded-full">
                <EyeOff size={16} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold">{work.title}</h3>
              <button
                onClick={() => setShowPopup(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
                {work.work_type === 'image' ? (
                  <img 
                    src={work.file_path} 
                    alt={work.title}
                    className="w-full h-full object-contain"
                  />
                ) : work.work_type === 'video' ? (
                  <video 
                    src={work.file_path}
                    className="w-full h-full"
                    controls
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <a 
                      href={work.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-300"
                    >
                      View Document
                    </a>
                  </div>
                )}
              </div>
              {work.description && (
                <p className="text-gray-300 mb-4">{work.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCard;