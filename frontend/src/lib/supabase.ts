import { createClient } from '@supabase/supabase-js';
import { supabaseConfig, env } from './config/environment';

// Use centralized environment configuration
const supabaseUrl = supabaseConfig.url;
const supabaseAnonKey = supabaseConfig.anonKey;

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

const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && /^https?:\/\//.test(supabaseUrl)
);

const createStubClient = () => {
  console.warn('⚠️ [SUPABASE] Running in preview without Supabase configuration. Using stub client.');
  const auth = {
    async getSession() { return { data: { session: null }, error: { message: 'Supabase not configured' } } as any; },
    async getUser() { return { data: { user: null }, error: { message: 'Supabase not configured' } } as any; },
    async signUp() { return { data: null, error: { message: 'Supabase not configured' } } as any; },
    async signInWithPassword() { return { data: null, error: { message: 'Supabase not configured' } } as any; },
    async signOut() { return { error: null } as any; },
    onAuthStateChange(callback: any) {
      const sub = { unsubscribe() {} };
      // Immediately emit a signed out state in preview
      try { callback('SIGNED_OUT', null); } catch {}
      return { data: { subscription: sub } } as any;
    }
  } as any;

  const from = (_table: string) => {
    const builder: any = {
      eq() { return builder; },
      order() { return builder; },
      select: async () => ({ data: [], error: null }),
      insert: (_payload: any) => ({
        select: () => ({
          single: async () => ({ data: { id: 'demo-' + Math.random().toString(36).slice(2) }, error: null })
        })
      })
    };
    return builder;
  };

  const functions = {
    async invoke(name: string) {
      return {
        data: { response: `Demo mode: function ${name} not available in preview.`, workflow_generated: false },
        error: null
      } as any;
    }
  } as any;

  return { auth, from, functions } as any;
};

export const supabase: any = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'clixen-auth-token',
      },
    })
  : createStubClient();

// Initialize auth monitoring in development (non-blocking)
if (env.get().isDevelopment && typeof window !== 'undefined') {
  console.log('🔧 [SUPABASE] Development mode - enabling auth monitoring');
  setTimeout(() => {
    try {
      if (isSupabaseConfigured) {
        monitorAuthState();
        checkSupabaseConnection().then((connected) => {
          if (!connected) {
            console.warn('⚠️ [SUPABASE] Initial connection test failed - authentication may not work properly');
          }
        }).catch((error) => {
          console.warn('⚠️ [SUPABASE] Connection test error:', error);
        });
      } else {
        console.log('ℹ️ [SUPABASE] Using stub client in preview - set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real auth.');
      }
    } catch (error) {
      console.warn('⚠️ [SUPABASE] Failed to initialize development monitoring:', error);
    }
  }, 1500);
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
