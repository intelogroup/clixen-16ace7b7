import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface AuthUser {
  id: string;
  email: string;
  tier?: 'free' | 'pro' | 'enterprise';
  metadata?: Record<string, any>;
}

export interface AuthResult {
  user: AuthUser | null;
  error?: string;
}

// Enhanced authentication middleware - Fixed according to Supabase docs
export const authenticate = async (req: Request): Promise<AuthResult> => {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return { user: null, error: 'Authorization header missing' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Invalid authorization format. Use Bearer token.' };
  }

  try {
    // Get Supabase URL and anon key from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return { user: null, error: 'Server configuration error' };
    }

    // Create Supabase client with auth header (CRITICAL FIX - per official docs)
    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Call getUser() without token parameter - it reads from headers
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return { 
        user: null, 
        error: authError.message || 'Invalid or expired token'
      };
    }

    if (!user) {
      return { user: null, error: 'No user found for token' };
    }

    // Get user profile for tier information (optional)
    // Using service role client for this query since it's server-side
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseServiceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const authUser: AuthUser = {
        id: user.id,
        email: user.email || '',
        tier: profile?.tier || 'free',
        metadata: {
          ...user.user_metadata,
          profile: profile || {}
        }
      };

      return { user: authUser };
    }

    // Return basic user info if no service role key
    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      tier: 'free',
      metadata: user.user_metadata || {}
    };

    return { user: authUser };

  } catch (error) {
    console.error('Authentication failed:', error);
    return { 
      user: null, 
      error: 'Authentication failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
};

// Check if user has required tier
export const requireTier = (user: AuthUser, requiredTier: 'pro' | 'enterprise'): boolean => {
  const tierLevels = { free: 0, pro: 1, enterprise: 2 };
  const userLevel = tierLevels[user.tier || 'free'];
  const requiredLevel = tierLevels[requiredTier];
  
  return userLevel >= requiredLevel;
};

// Verify resource ownership
export const verifyOwnership = async (
  userId: string,
  resourceType: 'project' | 'workflow' | 'session',
  resourceId: string,
  projectId?: string
): Promise<boolean> => {
  try {
    let query;
    
    switch (resourceType) {
      case 'project':
        query = supabase
          .from('projects')
          .select('id')
          .eq('id', resourceId)
          .eq('user_id', userId);
        break;
      
      case 'workflow':
        query = supabase
          .from('mvp_workflows')
          .select('id')
          .eq('id', resourceId)
          .eq('user_id', userId);
        
        if (projectId) {
          query = query.eq('project_id', projectId);
        }
        break;
      
      case 'session':
        query = supabase
          .from('mvp_chat_sessions')
          .select('id')
          .eq('id', resourceId)
          .eq('user_id', userId);
        
        if (projectId) {
          query = query.eq('project_id', projectId);
        }
        break;
      
      default:
        return false;
    }

    const { data, error } = await query.single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Ownership verification error:', error);
      return false;
    }

    return !!data;

  } catch (error) {
    console.error('Ownership verification failed:', error);
    return false;
  }
};

// Log authentication events for security monitoring
export const logAuthEvent = async (
  eventType: 'auth_success' | 'auth_failure' | 'token_expired' | 'invalid_token',
  userId?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    await supabase
      .from('telemetry_events')
      .insert({
        user_id: userId || null,
        event_type: eventType,
        event_category: 'auth',
        event_data: {
          ...metadata,
          timestamp: new Date().toISOString()
        },
        success: eventType === 'auth_success'
      });
  } catch (error) {
    console.warn('Failed to log auth event:', error);
  }
};