import React, { useState, useEffect } from 'react';
import { Play, Book, Filter, Search, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
}

const TutorialPlayer: React.FC<{ tutorial: Tutorial }> = ({ tutorial }) => {
  if (tutorial.type === 'video') {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          src={tutorial.file_url}
          controls
          className="w-full h-full"
          poster={tutorial.thumbnail_url}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  

  return (
    <div className="aspect-video bg-gray-900/50 rounded-lg flex items-center justify-center">
      <a
        href={tutorial.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-gray-400 hover:text-black"
      >
        <Book size={24} />
        View PDF Notes
      </a>
    </div>
  );
};

const Tutorials: React.FC = () => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);

  useEffect(() => {
    const loadTutorials = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('tutorials')
          .select('*')
          .order('order_index', { ascending: true });

        if (error) throw error;
        setTutorials(data || []);
      } catch (err) {
        console.error('Error loading tutorials:', err);
        setError('Failed to load tutorials');
      } finally {
        setIsLoading(false);
      }
    };

    loadTutorials();
  }, []);

  const filteredTutorials = tutorials.filter(tutorial => {
    const matchesSearch = tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tutorial.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tutorial.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || tutorial.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle size={48} className="text-gray-900/80 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Tutorials</h2>
        <p className="text-gray-400 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {selectedTutorial ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedTutorial(null)}
            className="text-black hover:text-gray-600 mb-4"
          >
            ← Back to Tutorials
          </button>

          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/75 p-6">
            <h2 className="text-2xl font-bold mb-2">{selectedTutorial.title}</h2>
            <p className="text-gray-400 mb-4">{selectedTutorial.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded-full text-sm">
                {selectedTutorial.category}
              </span>
              <span className="px-2 py-1 bg-gray-500/80 text-gray-400 rounded-full text-sm">
                {selectedTutorial.difficulty}
              </span>
            </div>

            <TutorialPlayer tutorial={selectedTutorial} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Tutorials</h1>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 mb-6 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tutorials..."
                    className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-gray-500"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
                >
                  <option value="all">All Categories</option>
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
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTutorials.map((tutorial) => (
              <div
                key={tutorial.id}
                onClick={() => setSelectedTutorial(tutorial)}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden cursor-pointer hover:border-gray-500 transition-colors"
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
                        <Play className="w-12 h-12 text-gray-600" />
                      ) : (
                        <Book className="w-12 h-12 text-gray-600" />
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-16 h-16 text-white" />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold mb-1">{tutorial.title}</h3>
                  <p className="text-sm text-gray-400 mb-2 line-clamp-2">{tutorial.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded-full text-xs">
                      {tutorial.category}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded-full text-xs">
                      {tutorial.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Tutorials;