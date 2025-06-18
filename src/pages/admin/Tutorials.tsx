import React, { useState, useEffect } from 'react';
import { Plus, Loader2, AlertTriangle, Search, Filter, BookOpen, Video, FileText, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CreateTutorialModal from '../../components/admin/CreateTutorialModal';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'notes';
  category: 'screenwriting' | 'music' | 'vfx' | 'editing' | 'dop';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  file_url: string;
  thumbnail_url?: string;
  duration?: number;
  created_at: string;
  views: number;
  completion_rate: number;
}

const AdminTutorials = () => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const loadTutorials = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: tutorialData, error: tutorialError } = await supabase
        .from('tutorials')
        .select('*')
        .order('created_at', { ascending: false });

      if (tutorialError) throw tutorialError;

      // Get analytics data for each tutorial
      const { data: analyticsData, error: analyticsError } = await supabase
        .rpc('get_tutorial_analytics');

      if (analyticsError) throw analyticsError;

      // Combine tutorial data with analytics
      const combinedData = tutorialData.map(tutorial => {
        const analytics = analyticsData.find(a => a.id === tutorial.id);
        return {
          ...tutorial,
          views: analytics?.views || 0,
          completion_rate: analytics?.completion_rate || 0
        };
      });

      setTutorials(combinedData);
    } catch (err) {
      console.error('Error loading tutorials:', err);
      setError('Failed to load tutorials');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTutorials();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tutorial?')) return;

    try {
      const { error } = await supabase
        .from('tutorials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTutorials(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting tutorial:', err);
      alert('Failed to delete tutorial');
    }
  };

  const filteredTutorials = tutorials.filter(tutorial => {
    const matchesSearch = tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tutorial.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tutorial.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Tutorials</h2>
        <p className="text-gray-400 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Tutorials</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-700 hover:bg-blue-500 px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Create Tutorial
        </button>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 mb-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tutorials..."
                className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-purple-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              <option value="screenwriting">Screenwriting</option>
              <option value="music">Music & Sound</option>
              <option value="vfx">VFX</option>
              <option value="editing">Editing</option>
              <option value="dop">Cinematography</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTutorials.map((tutorial) => (
          <div
            key={tutorial.id}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden"
          >
            <div className="aspect-video bg-gray-900 relative">
              {tutorial.thumbnail_url ? (
                <img
                  src={tutorial.thumbnail_url}
                  alt={tutorial.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {tutorial.type === 'video' ? (
                    <Video className="w-12 h-12 text-gray-600" />
                  ) : (
                    <FileText className="w-12 h-12 text-gray-600" />
                  )}
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={() => {/* Handle edit */}}
                  className="p-1 bg-gray-800/90 hover:bg-gray-700 rounded-lg"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(tutorial.id)}
                  className="p-1 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-semibold mb-1">{tutorial.title}</h3>
              <p className="text-sm text-gray-400 mb-2">{tutorial.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full text-xs">
                  {tutorial.category}
                </span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-xs">
                  {tutorial.difficulty}
                </span>
              </div>

              <div className="flex justify-between text-sm text-gray-400">
                <span>{tutorial.views} views</span>
                <span>{Math.round(tutorial.completion_rate)}% completion</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Tutorial Modal */}
      {showCreateModal && (
        <CreateTutorialModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTutorials();
          }}
        />
      )}
    </div>
  );
};

export default AdminTutorials;