import React, { useState, useEffect } from 'react';
import { Shield, Send } from 'lucide-react';

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "Hello! I'm your filmmaking assistant. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      type: 'user',
      content: input
    }]);

    // Simulate assistant response
    const userInput = input.toLowerCase();
    let response = "I'm sorry, I can't help with that specific request.";

    if (userInput.includes('hi') || userInput.includes('hello')) {
      response = "Hello! How can I assist you with your filmmaking project today?";
    } else if (userInput.includes('help')) {
      response = "I can help you with various aspects of filmmaking. What specific area would you like to know more about?";
    } else if (userInput.includes('camera')) {
      response = "I can help you with camera settings, movement techniques, and shot composition. What would you like to know?";
    } else if (userInput.includes('lighting')) {
      response = "Lighting is crucial for filmmaking. I can help you with three-point lighting, natural lighting techniques, and more.";
    } else if (userInput.includes('editing')) {
      response = "For editing, I can guide you through pacing, transitions, color grading, and sound design. What aspect interests you?";
    } else if (userInput.includes('script') || userInput.includes('story')) {
      response = "I can help you with story structure, character development, dialogue writing, and scene formatting.";
    }

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 2,
        type: 'assistant',
        content: response
      }]);
    }, 1000);

    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Assistant</h2>
      <div className="bg-gray-900/75 backdrop-blur-sm rounded-lg p-4 h-[calc(100vh-300px)] mb-4 overflow-y-auto border border-gray-700">
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
                    ? 'bg-gray-600'
                    : 'bg-gray-600'
                }`}
              >
                {message.type === 'assistant' ? (
                  <Shield size={16} />
                ) : (
                  <div className="w-4 h-4 bg-white rounded-full" />
                )}
              </div>
              <div
                className={`rounded-lg p-3 max-w-[80%] ${
                  message.type === 'assistant'
                    ? 'bg-gray-700'
                    : 'bg-gray-600'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700 focus:border-gray-500 outline-none"
          placeholder="Ask about filmmaking..."
        />
        <button
          onClick={handleSend}
          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 px-6 py-2 rounded-lg flex items-center gap-2"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default Chat;