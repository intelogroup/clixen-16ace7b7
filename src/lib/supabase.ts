import { createClient } from '@supabase/supabase-js';

// Universal environment variable access (works in both browser and Node.js)
const getEnvVar = (name: string): string | undefined => {
  // In browser/Vite environment
  if (typeof window !== 'undefined' && import.meta?.env) {
    return import.meta.env[name];
  }
  // In Node.js environment (Netlify functions)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  return undefined;
};

// Production Supabase configuration with validation
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL') || 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

// Development validation - warn about placeholder URLs
const isDev = getEnvVar('NODE_ENV') !== 'production' || (typeof import.meta !== 'undefined' && import.meta?.env?.DEV);
if (isDev && supabaseUrl.includes('your-project')) {
  console.warn('⚠️ Using placeholder Supabase URL. Set VITE_SUPABASE_URL in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enhanced error handling for authentication
export const getErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred';
  
  // Common Supabase auth errors
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'Email not confirmed':
      return 'Please check your email and click the confirmation link before signing in.';
    case 'User already registered':
      return 'An account with this email already exists. Try signing in instead.';
    case 'Password is too weak':
      return 'Password must be at least 8 characters long with a mix of letters and numbers.';
    case 'Signup disabled':
      return 'New registrations are currently disabled. Please contact support.';
    default:
      // Network/DNS errors
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        return 'Connection error. Please check your internet connection and try again.';
      }
      return error.message || 'Authentication failed. Please try again.';
  }
};