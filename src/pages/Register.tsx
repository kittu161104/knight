import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logo from '../logo.png';
import Battle from '../Battle.jpeg';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        if (signUpError.message === 'User already registered') {
          // If user exists, try to sign in instead
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInError) {
            setError('This email is already registered. Please log in with the correct password.');
            return;
          }

          // Successfully signed in
          navigate('/');
          return;
        } else {
          setError(signUpError.message);
          return;
        }
      }

      if (!authData.user) {
        setError('Registration failed. Please try again.');
        return;
      }

      // Successfully registered and signed in
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative"
      style={{
        backgroundImage: 'url("https://ibb.co/60pjrn0x")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
     

      {/* Content */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-black  rounded-2xl shadow-xl p-8 space-y-8 border border-gray-700/50">
          <div className="text-center">
            <img src={logo} alt="Knight's Vision Logo" className="h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Create Account
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Join Knight's Vision today
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleRegister}>
            {error && (
              <div className="rounded-lg bg-red-500/10 p-4">
                <p className="text-sm text-red-400">{error}</p>
                {error.includes('already registered') && (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Go to login
                  </button>
                )}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-colors text-white placeholder-gray-400"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-colors text-white placeholder-gray-400"
                  placeholder="Create a password"
                  minLength={6}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Must be at least 6 characters
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;