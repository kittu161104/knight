import React from 'react';
import { X } from 'lucide-react';
import PostInteractions from './PostInteractions';
import type { Database } from '../lib/database.types';

type Work = Database['public']['Tables']['user_works']['Row'];

interface PostModalProps {
  post: Work;
  onClose: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
  isOwner: boolean;
}

const PostModal: React.FC<PostModalProps> = ({ post, onClose, onDelete, onUpdate, isOwner }) => {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-xl font-bold">{post.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4">
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
            {work.work_type === 'image'? (
  <img src={work.file_path} alt={work.title} />
): work.work_type === 'video'? (
  <video src={work.file_path} controls />
): (
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

          {post.description && (
            <p className="text-gray-300 mb-4">{post.description}</p>
          )}

          <PostInteractions
            postId={post.id}
            authorId={post.user_id}
            onEdit={onUpdate}
            onDelete={onDelete}
            isOwner={isOwner}
          />
        </div>
      </div>
    </div>
  );
};

export default PostModal;