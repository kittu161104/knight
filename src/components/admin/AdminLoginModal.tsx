import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, X, Loader2, AlertTriangle } from 'lucide-react';
import { supabase, checkAdminStatus } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

interface AdminLoginModalProps {
  onClose: () => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { setUser, setIsAdmin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // First verify admin code
      if (adminCode !== 'knighthunt') {
        setError('Invalid admin code');
        setIsLoading(false);
        return;
      }

      // Check if user exists first
      const { data: { user: existingUser }, error: userCheckError } = await supabase.auth.getUser();
      
      if (existingUser) {
        // User is already logged in, verify admin status
        const isAdmin = await checkAdminStatus();
        if (isAdmin) {
          setUser(existingUser);
          setIsAdmin(true);
          onClose();
          navigate('/admin');
          return;
        }
      }

      // Sign in the user
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      if (!authData.user) {
        setError('Authentication failed. Please try again.');
        return;
      }

      // Verify or grant admin status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', authData.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!profile?.is_admin) {
        // Make user an admin
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            is_admin: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', authData.user.id);

        if (updateError) throw updateError;
      }

      // Update store and navigate
      setUser(authData.user);
      setIsAdmin(true);
      onClose();
      navigate('/admin');
    } catch (error: any) {
      console.error('Admin login error:', error);
      setError('Failed to authenticate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900/75 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-blue-500" />
          <h2 className="text-2xl font-bold">Admin Access</h2>
          <button
            onClick={onClose}
            className="ml-auto text-gray-400 hover:text-white"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
              required
              disabled={isLoading}
              minLength={6}
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Admin Code</label>
            <input
              type="password"
              value={adminCode}
              onChange={(e) => {
                setAdminCode(e.target.value);
                setError(null);
              }}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-gray-500"
              required
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gray-600 hover:bg-gray-700 rounded-lg py-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Login as Admin'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg py-2 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal;