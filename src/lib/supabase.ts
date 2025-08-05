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

// Auth state monitoring for debugging (moved up before usage)
export const monitorAuthState = () => {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔄 [SUPABASE] Auth state changed:', {
      event,
      hasSession: !!session,
      userId: session?.user?.id?.substring(0, 8) + '***' || null,
      email: session?.user?.email?.split('@')[0] + '***@' + session?.user?.email?.split('@')[1] || null
    });
  });
};

// Connection health check (moved up before usage)
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🌐 [SUPABASE] Testing connection...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ [SUPABASE] Connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ [SUPABASE] Connection successful');
    return true;
  } catch (error: any) {
    console.error('💥 [SUPABASE] Connection test error:', error);
    return false;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'clixen-auth-token',
  },
});

// Initialize auth monitoring in development
if (isDev && typeof window !== 'undefined') {
  console.log('🔧 [SUPABASE] Development mode - enabling auth monitoring');
  monitorAuthState();
  
  // Test connection on initialization
  checkSupabaseConnection().then(connected => {
    if (!connected) {
      console.warn('⚠️ [SUPABASE] Initial connection test failed - authentication may not work properly');
    }
  });
}

// Enhanced error handling for authentication
export const getErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred';
  
  console.log('🔍 [SUPABASE] Processing error:', {
    message: error.message,
    status: error.status,
    code: error.code,
    details: error.details
  });
  
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
    case 'Email rate limit exceeded':
      return 'Too many emails sent. Please wait a few minutes before trying again.';
    case 'Too many requests':
      return 'Too many login attempts. Please wait a few minutes before trying again.';
    case 'Invalid email':
      return 'Please enter a valid email address.';
    case 'Weak password':
      return 'Password is too weak. Please use at least 8 characters with numbers and symbols.';
    default:
      // Network/DNS errors
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        return 'Connection error. Please check your internet connection and try again.';
      }
      // Rate limiting errors
      if (error.status === 429) {
        return 'Too many requests. Please wait a few minutes before trying again.';
      }
      // Server errors
      if (error.status >= 500) {
        return 'Server error. Please try again in a few moments.';
      }
      // Client errors
      if (error.status >= 400 && error.status < 500) {
        return error.message || 'Invalid request. Please check your information and try again.';
      }
      return error.message || 'Authentication failed. Please try again.';
  }
};

