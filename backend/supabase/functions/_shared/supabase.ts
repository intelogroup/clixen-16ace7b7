/**
 * Shared Supabase Client Configuration
 * Single source of truth for Supabase client initialization
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Environment validation
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

// Create and export the shared Supabase client
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Export configuration for cases where individual values are needed
export const supabaseConfig = {
  url: supabaseUrl,
  serviceRoleKey: supabaseServiceRoleKey,
} as const;

// Helper function to create a new client with custom options if needed
export function createSupabaseClient(options?: {
  auth?: {
    persistSession?: boolean;
    autoRefreshToken?: boolean;
  };
}) {
  return createClient(supabaseUrl, supabaseServiceRoleKey, options);
}

// Database connection health check utility
export async function testDatabaseConnection(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const { error } = await supabase
      .from('projects')
      .select('count', { count: 'exact' })
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        healthy: false,
        responseTime,
        error: error.message
      };
    }
    
    return {
      healthy: true,
      responseTime
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

// Common telemetry logging helper
export async function logTelemetryEvent(data: {
  user_id?: string;
  event_type: string;
  event_category: string;
  project_id?: string;
  workflow_id?: string;
  session_id?: string;
  event_data?: Record<string, any>;
  duration_ms?: number;
  success: boolean;
  error_message?: string;
}): Promise<void> {
  try {
    await supabase
      .from('telemetry_events')
      .insert({
        ...data,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.warn('Failed to log telemetry event:', error);
  }
}