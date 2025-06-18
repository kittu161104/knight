import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { supabase } from '../lib/supabase';

const AuthLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setUser(null);
          navigate('/login', { replace: true });
          return;
        }
        
        if (!session?.user) {
          setUser(null);
          navigate('/login', { replace: true });
          return;
        }

        setUser(session.user);
      } catch (error) {
        console.error('Auth error:', error);
        setUser(null);
        navigate('/login', { replace: true });
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (!session?.user) {
          setUser(null);
          navigate('/profile', { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, setUser]);

  if (!user) {
    return null;
  }

  return <Outlet />;
};

export default AuthLayout;