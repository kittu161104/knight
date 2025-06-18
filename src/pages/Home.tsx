import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Layout, 
  Film, 
  Crown, 
  User, 
  Star, 
  MessageCircle, 
  Search as SearchIcon, 
  Sword, 
  Shield, 
  Users,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import logo from '../logo.png';
import Feed from './Feed';
import Search from './Search';
import Tutorials from './Tutorials';
import Contests from './Contests';
import Chat from './Chat';
import Messages from './Messages';
import Profile from './Profile';
import UserProfile from './UserProfile';
import AIChat from './AIChat';
import Collaborations from './Collaborations';
import NotificationBell from '../components/NotificationBell';
import AdminLoginModal from '../components/admin/AdminLoginModal';

// Sidebar Button Component
const SidebarButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${
      active ? "bg-gradient-to-r from-gray-600 to-gray-900" : "hover:bg-gray-700"
    }`}
    onClick={onClick}
  >
    <Icon size={20} />
    <span className="text-sm">{label}</span>
  </button>
);

const Home = () => {
  const [activeTab, setActiveTab] = useState("home");
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<{ avatar_url: string | null } | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfileData(profile);
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();

    // Subscribe to profile changes
    const subscription = supabase
      .channel('profiles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles',
        filter: `id=eq.${user?.id}`
      }, () => {
        loadProfile();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleTabChange = (tab: string, path: string) => {
    setActiveTab(tab);
    navigate(path);
    setIsSidebarOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-black to-gray-900/75">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full bg-black backdrop-blur-sm border-b border-gray-700/75 z-50">
        <div className="max-w-8xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-white focus:outline-none lg:hidden"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <img 
              src={logo} 
              alt="Knight's Vision Logo" 
              className="h-12 cursor-pointer" 
              onClick={() => setIsSidebarOpen(true)}
            />
            <span className="text-base font-bold tracking-wider hidden md:block">
              KNIGHT'S VISION
            </span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Buttons */}
            <div className="flex md:hidden gap-2">
              
              <button
                onClick={() => setShowAdminLogin(true)}
                className="bg-gray-600 hover:bg-gray-700 px-2.5 py-2.5 rounded-lg flex items-center gap-1"
              >
                <Shield size={16} />
              
              </button>
            </div>

            {/* Desktop Buttons */}
            <button className="hidden md:flex bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg items-center gap-2">
              <Star size={18} />
              <span>Upgrade to Pro</span>
            </button>
            <button
              onClick={() => setShowAdminLogin(true)}
              className="hidden md:flex bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg items-center gap-2"
            >
              <Shield size={18} />
              <span>Admin Access</span>
            </button>
            <button 
              onClick={() => handleTabChange("collaborations", "/collaborations")}
              className="bg-gray-600 hover:bg-gray-700 p-2 md:px-4 md:py-2 rounded-lg flex items-center gap-2"
            >
              <Users size={18} />
             
            </button>
            {user && (
              <>
                <NotificationBell />
                <button
                  onClick={() => navigate('/profile')}
                  className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600 hover:ring-2 hover:ring-black transition-all"
                >
                  {profileData?.avatar_url ? (
                    <img
                      src={profileData.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="flex pt-20 h-[calc(100vh-4rem)]">
        {/* Sidebar - Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed lg:static inset-y-0 left-0 w-64 bg-gradient-to-b from-black to-gray-1000/25 backdrop-blur-sm border-r border-gray-700 transform transition-transform duration-300 ease-in-out z-50 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-4 space-y-2">
            <SidebarButton
              icon={Layout}
              label="Home"
              active={activeTab === "home"}
              onClick={() => handleTabChange("home", "/")}
            />
            <SidebarButton
              icon={SearchIcon}
              label="Search"
              active={activeTab === "search"}
              onClick={() => handleTabChange("search", "/search")}
            />
            <SidebarButton
              icon={Film}
              label="Tutorials"
              active={activeTab === "tutorials"}
              onClick={() => handleTabChange("tutorials", "/tutorials")}
            />
            <SidebarButton
              icon={Crown}
              label="Contests"
              active={activeTab === "contests"}
              onClick={() => handleTabChange("contests", "/contests")}
            />
            <SidebarButton
              icon={MessageCircle}
              label="Messages"
              active={activeTab === "messages"}
              onClick={() => handleTabChange("messages", "/messages")}
            />
            <SidebarButton
              icon={Sword}
              label="Assistant"
              active={activeTab === "ai-chat"}
              onClick={() => handleTabChange("ai-chat", "/ai-chat")}
            />
            <SidebarButton
              icon={User}
              label="Profile"
              active={activeTab === "profile"}
              onClick={() => handleTabChange("profile", "/profile")}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto p-4 lg:p-8 ${isSidebarOpen ? 'lg:ml-64' : ''}`}>
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/search" element={<Search />} />
              <Route path="/tutorials" element={<Tutorials />} />
              <Route path="/contests" element={<Contests />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/collaborations" element={<Collaborations />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:id" element={<UserProfile />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <AdminLoginModal onClose={() => setShowAdminLogin(false)} />
      )}
    </div>
  );
};

export default Home;