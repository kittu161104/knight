import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import logo from '../logo.png';
import {
  LayoutDashboard,
  Trophy,
  Users,
  Settings,
  LogOut,
  Loader2,
  BookOpen,
  BarChart3,
  Menu,
  X
} from 'lucide-react';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, isAdmin, setIsAdmin, reset } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAdminStatus = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session?.user) {
          if (mounted) {
            reset();
            setIsLoading(false);
            navigate('/profile');
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;

        if (!profile?.is_admin) {
          if (mounted) {
            reset();
            setIsLoading(false);
            navigate('/profile', { replace: true });
          }
          return;
        }

        if (mounted) {
          setUser(session.user);
          setIsAdmin(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        if (mounted) {
          reset();
          setIsLoading(false);
          navigate('/profile', { replace: true });
        }
      }
    };

    if (!isAdmin) {
      checkAdminStatus();
    } else {
      setIsLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        reset();
        navigate('/profile', { replace: true });
      } else if (event === 'SIGNED_IN' && session) {
        checkAdminStatus();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, setUser, setIsAdmin, reset, isAdmin]);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      reset();
      navigate('/profile', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Trophy, label: 'Contests', path: '/admin/contests' },
    { icon: Users, label: 'Submissions', path: '/admin/submissions' },
    { icon: BookOpen, label: 'Tutorials', path: '/admin/tutorials' },
    { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-grey-600 mx-auto mb-4" />
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900/75">
      {/* Top Navigation */}
      <nav className="bg-black border-b border-gray-700 fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-white focus:outline-none"
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <img 
                src={logo} 
                alt="Knight's Vision Logo" 
                className="h-12 ml-2 cursor-pointer" 
                onClick={() => setIsSidebarOpen(true)}
              />
              <span className="ml-2 text-xl font-bold text-white hidden md:block">
                Sentinel's Tower
              </span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => navigate('/profile')}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-white disabled:opacity-500"
              >
                <LogOut size={28} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16 h-[calc(100vh-4rem)]">
        {/* Sidebar - Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 w-64 bg-gradient-to-b bg-black border-r border-gray-700/75 transform transition-transform duration-300 ease-in-out z-50 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <nav className="mt-5 px-2">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-grey-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto p-4 lg:p-8 ${isSidebarOpen ? 'lg:ml-64' : ''}`}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;