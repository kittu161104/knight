import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sword, 
  Camera, 
  Film, 
  Video, 
  Music, 
  Wand2, 
  Book, 
  Info,
  Brain,
  Sparkles,
  Theater,
  Globe,
  Lightbulb,
  Loader2,
  Upload,
  X
} from 'lucide-react';
import { generateResponse, analyzeFile } from '../lib/gemini';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  category?: 'script' | 'visual' | 'sound' | 'directing' | 'vfx' | 'editing' | 'creative' | 'technical';
  timestamp: Date;
  file?: {
    url: string;
    type: string;
    name: string;
  };
}

interface QuickPrompt {
  icon: typeof Camera;
  label: string;
  prompt: string;
  category: Message['category'];
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    icon: Book,
    label: 'Script Analysis',
    prompt: 'Can you analyze my script for potential plot holes and pacing issues?',
    category: 'script'
  },
  {
    icon: Camera,
    label: 'Shot Planning',
    prompt: 'Help me plan the camera angles and composition for a dramatic scene.',
    category: 'visual'
  },
  {
    icon: Music,
    label: 'Sound Design',
    prompt: 'Suggest a sound design approach for an intense action sequence.',
    category: 'sound'
  },
  {
    icon: Film,
    label: 'Directing',
    prompt: 'Give me tips for directing actors in an emotional scene.',
    category: 'directing'
  },
  {
    icon: Wand2,
    label: 'VFX Planning',
    prompt: 'How should I plan the VFX pipeline for my project?',
    category: 'vfx'
  },
  {
    icon: Video,
    label: 'Editing',
    prompt: 'Suggest editing techniques for building tension.',
    category: 'editing'
  },
  {
    icon: Brain,
    label: 'Creative Ideas',
    prompt: 'Help me brainstorm unique story concepts.',
    category: 'creative'
  },
  {
    icon: Globe,
    label: 'Technical Setup',
    prompt: 'What technical requirements do I need for my shoot?',
    category: 'technical'
  }
];

const CategoryIcon: React.FC<{ category?: Message['category']; size?: number }> = ({ category, size = 16 }) => {
  switch (category) {
    case 'script':
      return <Book size={size} />;
    case 'visual':
      return <Camera size={size} />;
    case 'sound':
      return <Music size={size} />;
    case 'directing':
      return <Film size={size} />;
    case 'vfx':
      return <Wand2 size={size} />;
    case 'editing':
      return <Video size={size} />;
    case 'creative':
      return <Sparkles size={size} />;
    case 'technical':
      return <Theater size={size} />;
    default:
      return <Sword size={size} />;
  }
};

const DragonAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "I am Dragon AI, your advanced filmmaking assistant. I can help with script analysis, visual planning, sound design, directing, VFX, editing, and more. How can I enhance your creative vision today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Message['category']>();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Focus the textarea after file upload
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && !uploadedFile) return;

    const messageText = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: messageText,
        category: selectedCategory,
        timestamp: new Date(),
        file: uploadedFile ? {
          url: URL.createObjectURL(uploadedFile),
          type: uploadedFile.type,
          name: uploadedFile.name
        } : undefined
      };
      setMessages(prev => [...prev, userMessage]);

      // Generate AI response
      let response: string;
      if (uploadedFile) {
        // Generate response considering both file and text
        response = await generateResponse(messageText, selectedCategory, uploadedFile);
      } else {
        // Generate text-only response
        response = await generateResponse(messageText, selectedCategory);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        category: selectedCategory,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
      clearUploadedFile();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Sword className="w-8 h-8 text-blue-500" />
        <h2 className="text-2xl font-bold">Dragon AI Assistant</h2>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
        {/* Quick Prompts */}
        <div className="p-4 border-b border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                onClick={() => {
                  setInput(prompt.prompt);
                  setSelectedCategory(prompt.category);
                }}
                className={`p-3 rounded-lg border ${
                  selectedCategory === prompt.category
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-blue-500'
                }`}
              >
                <prompt.icon className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm">{prompt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="h-[calc(100vh-24rem)] overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'assistant'
                      ? 'bg-blue-600'
                      : 'bg-green-600'
                  }`}
                >
                  {message.type === 'assistant' ? (
                    <CategoryIcon category={message.category} />
                  ) : (
                    <div className="w-4 h-4 bg-white rounded-full" />
                  )}
                </div>
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.type === 'assistant'
                      ? 'bg-gray-700'
                      : 'bg-blue-600'
                  }`}
                >
                  {message.file && (
                    <div className="mb-2">
                      {message.file.type.startsWith('image/') ? (
                        <img
                          src={message.file.url}
                          alt="Uploaded content"
                          className="max-h-48 rounded-lg"
                        />
                      ) : message.file.type.startsWith('video/') ? (
                        <video
                          src={message.file.url}
                          controls
                          className="max-h-48 rounded-lg"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <Book size={16} />
                          {message.file.name}
                        </div>
                      )}
                    </div>
                  )}
                  {message.content.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>
                      {line}
                    </p>
                  ))}
                  <div className="text-xs text-gray-400 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <CategoryIcon category={selectedCategory} />
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-2">
            <div className="flex-shrink-0 flex items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-lg transition-colors ${
                  uploadedFile 
                    ? 'bg-blue-500/10 text-blue-400' 
                    : 'hover:bg-gray-700'
                }`}
                title="Upload file"
              >
                <Upload size={20} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept="image/*,video/*,.pdf,.doc,.docx"
                className="hidden"
              />
            </div>
            
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={uploadedFile ? `Add message about ${uploadedFile.name}...` : "Type a message..."}
                className="w-full bg-gray-700 rounded-lg pl-4 pr-10 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={1}
              />
              {uploadedFile && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <span className="text-xs text-gray-400">{uploadedFile.name}</span>
                  <button
                    onClick={clearUploadedFile}
                    className="p-1 hover:bg-gray-600 rounded-full"
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={(!input.trim() && !uploadedFile) || isTyping}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTyping ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragonAI;