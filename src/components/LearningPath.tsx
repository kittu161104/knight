import React, { useState } from 'react';
import { Book, Video, Camera, Music, Film, Wand2, Play, Clock, Award } from 'lucide-react';

type Specialty = 'screenwriting' | 'sound' | 'directing' | 'vfx' | 'editing' | 'cinematography';

interface Resource {
  title: string;
  type: 'video' | 'article' | 'exercise' | 'quiz';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: string;
  url?: string;
  description: string;
  skills?: string[];
}

interface Path {
  specialty: Specialty;
  icon: typeof Book;
  title: string;
  description: string;
  resources: Resource[];
  skills: string[];
}

const LEARNING_PATHS: Path[] = [
  {
    specialty: 'screenwriting',
    icon: Book,
    title: 'Screenwriting & Story Development',
    description: 'Master the art of crafting compelling narratives for film',
    skills: ['Story Structure', 'Character Development', 'Dialogue Writing', 'Scene Construction', 'Genre Conventions'],
    resources: [
      {
        title: 'Story Structure Fundamentals',
        type: 'video',
        difficulty: 'beginner',
        duration: '45 min',
        description: 'Learn the three-act structure, plot points, and narrative arcs',
        skills: ['Story Structure', 'Plot Development']
      },
      {
        title: 'Character Development Workshop',
        type: 'exercise',
        difficulty: 'intermediate',
        duration: '2 hours',
        description: 'Create compelling character arcs, backstories, and motivations',
        skills: ['Character Development', 'Psychology']
      },
      {
        title: 'Dialogue Writing Masterclass',
        type: 'video',
        difficulty: 'advanced',
        duration: '1.5 hours',
        description: 'Advanced techniques for writing natural, impactful dialogue',
        skills: ['Dialogue Writing', 'Subtext']
      }
    ]
  },
  {
    specialty: 'sound',
    icon: Music,
    title: 'Music & Sound Design',
    description: 'Create immersive soundscapes and emotional scores',
    skills: ['Sound Mixing', 'Music Composition', 'Foley Art', 'Sound Effects', 'Audio Post-production'],
    resources: [
      {
        title: 'Film Scoring Fundamentals',
        type: 'video',
        difficulty: 'beginner',
        duration: '1 hour',
        description: 'Introduction to composing music for film and emotional storytelling',
        skills: ['Music Composition', 'Emotional Storytelling']
      },
      {
        title: 'Sound Design Workshop',
        type: 'exercise',
        difficulty: 'intermediate',
        duration: '3 hours',
        description: 'Create and mix sound effects, ambiance, and Foley',
        skills: ['Sound Design', 'Foley Art']
      },
      {
        title: 'Advanced Audio Post-production',
        type: 'video',
        difficulty: 'advanced',
        duration: '2 hours',
        description: 'Professional techniques for final audio mixing and mastering',
        skills: ['Audio Post-production', 'Sound Mixing']
      }
    ]
  },
  {
    specialty: 'directing',
    icon: Film,
    title: 'Film Direction',
    description: 'Lead creative teams and bring stories to life',
    skills: ['Shot Composition', 'Actor Direction', 'Production Planning', 'Visual Storytelling', 'Team Leadership'],
    resources: [
      {
        title: 'Director\'s Vision & Pre-production',
        type: 'video',
        difficulty: 'beginner',
        duration: '1.5 hours',
        description: 'Developing and communicating your creative vision',
        skills: ['Vision Development', 'Pre-production']
      },
      {
        title: 'Working with Actors',
        type: 'video',
        difficulty: 'intermediate',
        duration: '2 hours',
        description: 'Techniques for directing actors and getting great performances',
        skills: ['Actor Direction', 'Performance']
      },
      {
        title: 'Advanced Scene Direction',
        type: 'exercise',
        difficulty: 'advanced',
        duration: '4 hours',
        description: 'Complex scene blocking and camera choreography',
        skills: ['Scene Blocking', 'Camera Movement']
      }
    ]
  },
  {
    specialty: 'vfx',
    icon: Wand2,
    title: 'Visual Effects & CGI',
    description: 'Create stunning visual effects and seamless CGI integration',
    skills: ['Compositing', 'CGI Integration', '3D Modeling', 'Motion Tracking', 'Color Grading'],
    resources: [
      {
        title: 'VFX Pipeline Overview',
        type: 'video',
        difficulty: 'beginner',
        duration: '1 hour',
        description: 'Understanding the visual effects workflow and planning',
        skills: ['VFX Pipeline', 'Pre-visualization']
      },
      {
        title: 'Green Screen & Compositing',
        type: 'exercise',
        difficulty: 'intermediate',
        duration: '2.5 hours',
        description: 'Professional techniques for seamless compositing',
        skills: ['Compositing', 'Keying']
      },
      {
        title: 'CGI Integration Masterclass',
        type: 'video',
        difficulty: 'advanced',
        duration: '3 hours',
        description: 'Advanced 3D integration and realistic rendering',
        skills: ['CGI Integration', 'Lighting']
      }
    ]
  },
  {
    specialty: 'editing',
    icon: Video,
    title: 'Film Editing',
    description: 'Shape narratives through the art of editing',
    skills: ['Pacing', 'Transitions', 'Color Grading', 'Sound Design', 'Storytelling'],
    resources: [
      {
        title: 'Editing Fundamentals',
        type: 'video',
        difficulty: 'beginner',
        duration: '1.5 hours',
        description: 'Essential cuts, transitions, and editing principles',
        skills: ['Basic Cuts', 'Transitions']
      },
      {
        title: 'Narrative Editing Workshop',
        type: 'exercise',
        difficulty: 'intermediate',
        duration: '3 hours',
        description: 'Editing techniques for emotional impact and story flow',
        skills: ['Pacing', 'Storytelling']
      },
      {
        title: 'Advanced Post-production',
        type: 'video',
        difficulty: 'advanced',
        duration: '2.5 hours',
        description: 'Color grading, effects, and finishing techniques',
        skills: ['Color Grading', 'Finishing']
      }
    ]
  },
  {
    specialty: 'cinematography',
    icon: Camera,
    title: 'Cinematography',
    description: 'Master the art of visual storytelling through camera work',
    skills: ['Camera Operation', 'Lighting', 'Composition', 'Color Theory', 'Camera Movement'],
    resources: [
      {
        title: 'Camera & Lens Basics',
        type: 'video',
        difficulty: 'beginner',
        duration: '2 hours',
        description: 'Understanding camera settings, lenses, and movement',
        skills: ['Camera Operation', 'Lens Selection']
      },
      {
        title: 'Lighting Workshop',
        type: 'exercise',
        difficulty: 'intermediate',
        duration: '4 hours',
        description: 'Professional lighting techniques and setups',
        skills: ['Lighting', 'Color Theory']
      },
      {
        title: 'Advanced Visual Storytelling',
        type: 'video',
        difficulty: 'advanced',
        duration: '3 hours',
        description: 'Complex camera movements and artistic composition',
        skills: ['Visual Storytelling', 'Camera Movement']
      }
    ]
  }
];

const LearningPath: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Resource['difficulty']>('beginner');

  return (
    <div className="space-y-6">
      {!selectedPath ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LEARNING_PATHS.map((path) => (
            <button
              key={path.specialty}
              onClick={() => setSelectedPath(path)}
              className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors text-left"
            >
              <path.icon className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">{path.title}</h3>
              <p className="text-gray-400 mb-4">{path.description}</p>
              <div className="flex flex-wrap gap-2">
                {path.skills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs"
                  >
                    {skill}
                  </span>
                ))}
                {path.skills.length > 3 && (
                  <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                    +{path.skills.length - 3} more
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSelectedPath(null)}
              className="text-blue-400 hover:text-blue-300"
            >
              ← Back to Paths
            </button>
            <div className="flex gap-2">
              {['beginner', 'intermediate', 'advanced'].map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => setSelectedDifficulty(difficulty as Resource['difficulty'])}
                  className={`px-4 py-2 rounded-lg ${
                    selectedDifficulty === difficulty
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <selectedPath.icon className="w-12 h-12 text-blue-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">{selectedPath.title}</h2>
            <p className="text-gray-400 mb-6">{selectedPath.description}</p>

            <div className="flex flex-wrap gap-2 mb-6">
              {selectedPath.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>

            <div className="space-y-4">
              {selectedPath.resources
                .filter(resource => resource.difficulty === selectedDifficulty)
                .map((resource, index) => (
                  <div
                    key={index}
                    className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{resource.title}</h4>
                          {resource.duration && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock size={12} />
                              {resource.duration}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{resource.description}</p>
                        {resource.skills && (
                          <div className="flex flex-wrap gap-2">
                            {resource.skills.map(skill => (
                              <span
                                key={skill}
                                className="px-2 py-0.5 bg-gray-600/50 rounded-full text-xs text-gray-300"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          resource.type === 'video'
                            ? 'bg-blue-500/10 text-blue-400'
                            : resource.type === 'exercise'
                            ? 'bg-green-500/10 text-green-400'
                            : resource.type === 'quiz'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-orange-500/10 text-orange-400'
                        }`}>
                          {resource.type}
                        </span>
                        {resource.type === 'video' && (
                          <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                            <Play size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPath;