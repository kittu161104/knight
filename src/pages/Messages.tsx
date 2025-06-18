import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Image, Paperclip, Search, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import SearchBar from '../components/SearchBar';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  media_url?: string;
  created_at: string;
  read: boolean;
};

type Chat = {
  profile: Profile;
  lastMessage?: Message;
  unreadCount: number;
};

const ChatList = ({ onSelectChat }: { onSelectChat: (profile: Profile) => void }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadChats = async () => {
      if (!user) return;

      try {
        // Get all conversations where user is involved
        const { data: messages, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id(id, username, avatar_url),
            receiver:receiver_id(id, username, avatar_url)
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Process messages into chats
        const chatMap = new Map<string, Chat>();
        
        messages?.forEach(message => {
          const otherUser = message.sender_id === user.id ? message.receiver : message.sender;
          if (!otherUser) return;

          const chatId = otherUser.id;
          if (!chatMap.has(chatId)) {
            chatMap.set(chatId, {
              profile: otherUser,
              lastMessage: message,
              unreadCount: message.sender_id !== user.id && !message.read ? 1 : 0
            });
          } else if (message.sender_id !== user.id && !message.read) {
            const chat = chatMap.get(chatId)!;
            chat.unreadCount++;
          }
        });

        setChats(Array.from(chatMap.values()));
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    };

    loadChats();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${user?.id}`
      }, () => {
        loadChats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleSelectProfile = (profile: Profile) => {
    onSelectChat(profile);
    setShowSearch(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-2 hover:bg-gray-700/50"
        >
          <Search size={20} />
        </button>
        {showSearch && (
          <div className="flex-1">
            <SearchBar onSelect={handleSelectProfile} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {chats.map(chat => (
          <button
            key={chat.profile.id}
            onClick={() => onSelectChat(chat.profile)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
              {chat.profile.avatar_url && (
                <img
                  src={chat.profile.avatar_url}
                  alt={chat.profile.username}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <span className="font-medium truncate">{chat.profile.username}</span>
                {chat.lastMessage && (
                  <span className="text-xs text-gray-400">
                    {new Date(chat.lastMessage.created_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {chat.lastMessage && (
                <p className="text-sm text-gray-400 truncate">
                  {chat.lastMessage.content}
                </p>
              )}
            </div>
            {chat.unreadCount > 0 && (
              <span className="bg-blue-600 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {chat.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const ChatWindow = ({ profile, onBack }: { profile: Profile; onBack: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadMessages = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);

        // Mark messages as read
        const { error: updateError } = await supabase
          .from('messages')
          .update({ read: true })
          .eq('sender_id', profile.id)
          .eq('receiver_id', user.id)
          .eq('read', false);

        if (updateError) throw updateError;
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `or(and(sender_id.eq.${user?.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user?.id}))`
      }, () => {
        loadMessages();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      // Create new message object
      const newMessageObj: Omit<Message, 'id'> = {
        sender_id: user.id,
        receiver_id: profile.id,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        read: false
      };

      // Optimistically update UI
      setMessages(prev => [...prev, { ...newMessageObj, id: 'temp-' + Date.now() }]);
      setNewMessage('');

      // Send to server
      const { data, error } = await supabase
        .from('messages')
        .insert(newMessageObj)
        .select()
        .single();

      if (error) throw error;

      // Update the temporary message with the real one
      setMessages(prev => 
        prev.map(msg => 
          msg.id === 'temp-' + Date.now() ? data : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      setNewMessage(newMessage); // Restore the message text
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-700/50 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
          {profile.avatar_url && (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <span className="font-medium">{profile.username}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender_id === user?.id
                    ? 'bg-blue-600'
                    : 'bg-gray-700'
                }`}
              >
                <p className="break-words">{message.content}</p>
                <span className="text-xs text-gray-400 mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-700/50 rounded-lg">
            <Image size={20} />
          </button>
          <button className="p-2 hover:bg-gray-700/50 rounded-lg">
            <Paperclip size={20} />
          </button>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800/50 backdrop-blur-sm rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Messages: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Messages</h2>
      {selectedProfile ? (
        <ChatWindow
          profile={selectedProfile}
          onBack={() => setSelectedProfile(null)}
        />
      ) : (
        <ChatList onSelectChat={setSelectedProfile} />
      )}
    </div>
  );
};

export default Messages;