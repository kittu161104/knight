import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with retries
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  
  db: {
    schema: 'public'
  },
  // Add retry configuration
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper to check if the user's session is valid
export const checkSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return !!session;
  } catch (error) {
    console.error('Session check failed:', error);
    return false;
  }
};

// Helper to check if user is admin
export const checkAdminStatus = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return profile?.is_admin || false;
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
};

// Helper to handle Supabase errors with retry logic
export const handleSupabaseError = (error: any): string => {
  console.error('Supabase error:', error);

  if (error.message?.includes('Failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (error.message?.includes('JWT')) {
    return 'Your session has expired. Please log in again.';
  }

  if (error.message?.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }

  if (error.message?.includes('Permission denied')) {
    return 'You do not have permission to perform this action.';
  }

  return error.message || 'An unexpected error occurred. Please try again.';
};

// Helper function to retry failed requests
export const retryRequest = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on network errors
      if (!error.message?.includes('Failed to fetch')) {
        throw error;
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
};

// Helper function for safe database operations
export const safeQuery = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  errorMessage = 'Operation failed'
): Promise<T> => {
  try {
    const { data, error } = await retryRequest(operation);
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error('No data returned');
    }
    
    return data;
  } catch (error: any) {
    console.error(`${errorMessage}:`, error);
    throw new Error(handleSupabaseError(error));
  }
};