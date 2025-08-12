import { supabase } from './supabase.ts';

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

// Enhanced authentication middleware
export const authenticate = async (req: Request): Promise<AuthResult> => {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return { user: null, error: 'Authorization header missing' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Invalid authorization format. Use Bearer token.' };
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token.length === 0) {
      return { user: null, error: 'Empty bearer token' };
    }

    // Verify token with Supabase
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      return { 
        user: null, 
        error: authError.message.includes('expired') ? 'Token expired' : 'Invalid token'
      };
    }

    if (!authData.user) {
      return { user: null, error: 'No user found for token' };
    }

    // Get user profile for tier information
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tier, preferences')
      .eq('id', authData.user.id)
      .single();

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email || '',
      tier: profile?.tier || 'free',
      metadata: {
        ...authData.user.user_metadata,
        preferences: profile?.preferences || {}
      }
    };

    return { user };

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