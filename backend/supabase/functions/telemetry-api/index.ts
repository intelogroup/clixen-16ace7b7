import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Types for Telemetry API
interface TelemetryEvent {
  id?: string;
  user_id?: string;
  event_type: string;
  event_category: 'auth' | 'workflow' | 'deployment' | 'engagement' | 'error' | 'performance';
  project_id?: string;
  workflow_id?: string;
  session_id?: string;
  event_data?: Record<string, any>;
  duration_ms?: number;
  success?: boolean;
  error_message?: string;
  user_agent?: string;
  ip_address?: string;
  referer?: string;
  created_at?: string;
}

interface LogEventRequest {
  event_type: string;
  event_category: 'auth' | 'workflow' | 'deployment' | 'engagement' | 'error' | 'performance';
  project_id?: string;
  workflow_id?: string;
  session_id?: string;
  event_data?: Record<string, any>;
  duration_ms?: number;
  success?: boolean;
  error_message?: string;
}

interface DashboardStats {
  overview: {
    total_users: number;
    total_projects: number;
    total_workflows: number;
    total_deployments: number;
    active_sessions: number;
  };
  recent_activity: {
    signups_last_7_days: number;
    workflows_created_last_7_days: number;
    deployments_last_7_days: number;
    chat_sessions_last_7_days: number;
  };
  user_engagement: {
    avg_workflows_per_user: number;
    avg_deployments_per_user: number;
    workflow_success_rate: number;
    deployment_success_rate: number;
  };
  performance_metrics: {
    avg_workflow_generation_time: number;
    avg_deployment_time: number;
    avg_chat_response_time: number;
    top_error_types: { error_type: string; count: number }[];
  };
  usage_patterns: {
    popular_workflow_types: { workflow_type: string; count: number }[];
    peak_usage_hours: { hour: number; request_count: number }[];
    user_tier_distribution: { tier: string; count: number }[];
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Authentication middleware
const authenticate = async (req: Request): Promise<{ user: any; error?: string }> => {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Authentication required - Bearer token missing' };
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error: 'Invalid authentication token' };
    }

    return { user };
  } catch (error) {
    return { user: null, error: 'Authentication failed' };
  }
};

// Input validation
const validateEventRequest = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.event_type || typeof data.event_type !== 'string' || data.event_type.length === 0) {
    errors.push('Event type is required and must be a non-empty string');
  }
  
  if (data.event_type && data.event_type.length > 100) {
    errors.push('Event type must be 100 characters or less');
  }
  
  const validCategories = ['auth', 'workflow', 'deployment', 'engagement', 'error', 'performance'];
  if (!data.event_category || !validCategories.includes(data.event_category)) {
    errors.push(`Event category must be one of: ${validCategories.join(', ')}`);
  }
  
  if (data.project_id && typeof data.project_id !== 'string') {
    errors.push('Project ID must be a string if provided');
  }
  
  if (data.workflow_id && typeof data.workflow_id !== 'string') {
    errors.push('Workflow ID must be a string if provided');
  }
  
  if (data.session_id && typeof data.session_id !== 'string') {
    errors.push('Session ID must be a string if provided');
  }
  
  if (data.duration_ms && (typeof data.duration_ms !== 'number' || data.duration_ms < 0)) {
    errors.push('Duration must be a non-negative number if provided');
  }
  
  if (data.success !== undefined && typeof data.success !== 'boolean') {
    errors.push('Success must be a boolean if provided');
  }
  
  if (data.error_message && typeof data.error_message !== 'string') {
    errors.push('Error message must be a string if provided');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Extract client information from request
const extractClientInfo = (req: Request): { user_agent?: string; ip_address?: string; referer?: string } => {
  return {
    user_agent: req.headers.get('user-agent') || undefined,
    ip_address: req.headers.get('cf-connecting-ip') || 
                req.headers.get('x-forwarded-for') || 
                req.headers.get('x-real-ip') || undefined,
    referer: req.headers.get('referer') || undefined
  };
};

// Log telemetry event
const logTelemetryEvent = async (userId: string, eventData: LogEventRequest, clientInfo: any): Promise<TelemetryEvent> => {
  try {
    const { data: event, error } = await supabase
      .from('telemetry_events')
      .insert({
        user_id: userId,
        event_type: eventData.event_type,
        event_category: eventData.event_category,
        project_id: eventData.project_id || null,
        workflow_id: eventData.workflow_id || null,
        session_id: eventData.session_id || null,
        event_data: eventData.event_data || {},
        duration_ms: eventData.duration_ms || null,
        success: eventData.success !== undefined ? eventData.success : true,
        error_message: eventData.error_message || null,
        user_agent: clientInfo.user_agent || null,
        ip_address: clientInfo.ip_address || null,
        referer: clientInfo.referer || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging telemetry event:', error);
      throw new Error(`Failed to log event: ${error.message}`);
    }

    return event;
  } catch (error) {
    console.error('Error in logTelemetryEvent:', error);
    throw error;
  }
};

// Get dashboard analytics
const getDashboardStats = async (userId?: string): Promise<DashboardStats> => {
  try {
    // Check if user is admin/enterprise tier for full analytics
    let isAdmin = false;
    if (userId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tier')
        .eq('id', userId)
        .single();
      
      isAdmin = profile?.tier === 'enterprise';
    }

    // Overview stats
    const [usersResult, projectsResult, workflowsResult, deploymentsResult, sessionsResult] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('projects').select('id', { count: 'exact', head: true }),
      supabase.from('mvp_workflows').select('id', { count: 'exact', head: true }),
      supabase.from('deployments').select('id', { count: 'exact', head: true }),
      supabase.from('mvp_chat_sessions').select('id', { count: 'exact', head: true }).eq('status', 'active')
    ]);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const [signupsResult, recentWorkflowsResult, recentDeploymentsResult, recentSessionsResult] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabase.from('mvp_workflows').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabase.from('deployments').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabase.from('mvp_chat_sessions').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo)
    ]);

    // User engagement metrics
    const { data: userStats } = await supabase
      .from('mvp_user_dashboard_stats')
      .select('total_workflows_created, total_deployments');

    const avgWorkflows = userStats?.length ? 
      userStats.reduce((sum, user) => sum + (user.total_workflows_created || 0), 0) / userStats.length : 0;
    
    const avgDeployments = userStats?.length ?
      userStats.reduce((sum, user) => sum + (user.total_deployments || 0), 0) / userStats.length : 0;

    // Success rates
    const { data: workflowStats } = await supabase
      .from('mvp_workflows')
      .select('status');
    
    const workflowSuccessRate = workflowStats?.length ?
      (workflowStats.filter(w => w.status === 'deployed').length / workflowStats.length) * 100 : 0;

    const { data: deploymentStats } = await supabase
      .from('deployments')
      .select('status');
    
    const deploymentSuccessRate = deploymentStats?.length ?
      (deploymentStats.filter(d => d.status === 'deployed').length / deploymentStats.length) * 100 : 0;

    // Performance metrics (only for admin users)
    let performanceMetrics = {
      avg_workflow_generation_time: 0,
      avg_deployment_time: 0,
      avg_chat_response_time: 0,
      top_error_types: [] as { error_type: string; count: number }[]
    };

    if (isAdmin) {
      // Get performance data from telemetry
      const { data: perfData } = await supabase
        .from('telemetry_events')
        .select('event_type, duration_ms')
        .in('event_type', ['workflow_generated', 'workflow_deployed', 'chat_message_sent'])
        .not('duration_ms', 'is', null)
        .gte('created_at', sevenDaysAgo);

      if (perfData) {
        const workflowGenTimes = perfData.filter(e => e.event_type === 'workflow_generated').map(e => e.duration_ms);
        const deploymentTimes = perfData.filter(e => e.event_type === 'workflow_deployed').map(e => e.duration_ms);
        const chatTimes = perfData.filter(e => e.event_type === 'chat_message_sent').map(e => e.duration_ms);

        performanceMetrics.avg_workflow_generation_time = workflowGenTimes.length ?
          workflowGenTimes.reduce((sum, time) => sum + time, 0) / workflowGenTimes.length : 0;
        
        performanceMetrics.avg_deployment_time = deploymentTimes.length ?
          deploymentTimes.reduce((sum, time) => sum + time, 0) / deploymentTimes.length : 0;
        
        performanceMetrics.avg_chat_response_time = chatTimes.length ?
          chatTimes.reduce((sum, time) => sum + time, 0) / chatTimes.length : 0;
      }

      // Get top error types
      const { data: errorData } = await supabase
        .from('telemetry_events')
        .select('event_type')
        .eq('event_category', 'error')
        .eq('success', false)
        .gte('created_at', sevenDaysAgo);

      if (errorData) {
        const errorCounts = errorData.reduce((acc, e) => {
          acc[e.event_type] = (acc[e.event_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        performanceMetrics.top_error_types = Object.entries(errorCounts)
          .map(([error_type, count]) => ({ error_type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      }
    }

    // Usage patterns (limited for non-admin users)
    let usagePatterns = {
      popular_workflow_types: [] as { workflow_type: string; count: number }[],
      peak_usage_hours: [] as { hour: number; request_count: number }[],
      user_tier_distribution: [] as { tier: string; count: number }[]
    };

    if (isAdmin) {
      // Get user tier distribution
      const { data: tierData } = await supabase
        .from('user_profiles')
        .select('tier');

      if (tierData) {
        const tierCounts = tierData.reduce((acc, user) => {
          acc[user.tier || 'free'] = (acc[user.tier || 'free'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        usagePatterns.user_tier_distribution = Object.entries(tierCounts)
          .map(([tier, count]) => ({ tier, count }));
      }

      // Get peak usage hours from telemetry
      const { data: usageData } = await supabase
        .from('telemetry_events')
        .select('created_at')
        .gte('created_at', sevenDaysAgo);

      if (usageData) {
        const hourCounts = usageData.reduce((acc, event) => {
          const hour = new Date(event.created_at).getHours();
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        usagePatterns.peak_usage_hours = Object.entries(hourCounts)
          .map(([hour, request_count]) => ({ hour: parseInt(hour), request_count }))
          .sort((a, b) => b.request_count - a.request_count)
          .slice(0, 24);
      }
    }

    const stats: DashboardStats = {
      overview: {
        total_users: usersResult.count || 0,
        total_projects: projectsResult.count || 0,
        total_workflows: workflowsResult.count || 0,
        total_deployments: deploymentsResult.count || 0,
        active_sessions: sessionsResult.count || 0
      },
      recent_activity: {
        signups_last_7_days: signupsResult.count || 0,
        workflows_created_last_7_days: recentWorkflowsResult.count || 0,
        deployments_last_7_days: recentDeploymentsResult.count || 0,
        chat_sessions_last_7_days: recentSessionsResult.count || 0
      },
      user_engagement: {
        avg_workflows_per_user: Number(avgWorkflows.toFixed(2)),
        avg_deployments_per_user: Number(avgDeployments.toFixed(2)),
        workflow_success_rate: Number(workflowSuccessRate.toFixed(2)),
        deployment_success_rate: Number(deploymentSuccessRate.toFixed(2))
      },
      performance_metrics: performanceMetrics,
      usage_patterns: usagePatterns
    };

    return stats;

  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    throw new Error(`Failed to get dashboard stats: ${error.message}`);
  }
};

// Get user-specific telemetry events
const getUserTelemetryEvents = async (
  userId: string, 
  category?: string, 
  limit = 100,
  offset = 0
): Promise<{ events: TelemetryEvent[]; total_count: number }> => {
  try {
    let query = supabase
      .from('telemetry_events')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (category) {
      query = query.eq('event_category', category);
    }

    const { data: events, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user telemetry:', error);
      throw new Error(`Failed to fetch telemetry events: ${error.message}`);
    }

    return {
      events: events || [],
      total_count: count || 0
    };

  } catch (error) {
    console.error('Error in getUserTelemetryEvents:', error);
    throw error;
  }
};

// Main request handler
serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`🚀 [TELEMETRY-API-${requestId}] ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Extract client information
    const clientInfo = extractClientInfo(req);

    // Authenticate user
    const { user, error: authError } = await authenticate(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authError || 'Authentication failed',
          timestamp: new Date().toISOString()
        } as ApiResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = user.id;
    let response: ApiResponse;
    let statusCode = 200;

    // Route handling
    if (pathSegments.length >= 1 && pathSegments[0] === 'telemetry') {
      if (pathSegments.length === 2 && pathSegments[1] === 'events') {
        if (req.method === 'POST') {
          // POST /telemetry/events - Log telemetry event
          const body = await req.json();
          const validation = validateEventRequest(body);
          
          if (!validation.isValid) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Validation failed',
                message: validation.errors.join(', '),
                timestamp: new Date().toISOString()
              } as ApiResponse),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          const event = await logTelemetryEvent(userId, body, clientInfo);
          
          response = {
            success: true,
            data: event,
            message: 'Telemetry event logged successfully',
            timestamp: new Date().toISOString()
          };
          statusCode = 201;
        } else if (req.method === 'GET') {
          // GET /telemetry/events - Get user's telemetry events
          const category = url.searchParams.get('category') || undefined;
          const limit = parseInt(url.searchParams.get('limit') || '100');
          const offset = parseInt(url.searchParams.get('offset') || '0');
          
          const result = await getUserTelemetryEvents(userId, category, limit, offset);
          
          response = {
            success: true,
            data: {
              events: result.events,
              pagination: {
                total: result.total_count,
                limit,
                offset,
                has_more: result.total_count > offset + limit
              }
            },
            message: `Retrieved ${result.events.length} telemetry events`,
            timestamp: new Date().toISOString()
          };
        } else {
          throw new Error('Method not allowed');
        }
      } else {
        throw new Error('Endpoint not found');
      }
    } else if (pathSegments.length >= 1 && pathSegments[0] === 'analytics') {
      if (pathSegments.length === 2 && pathSegments[1] === 'dashboard') {
        if (req.method === 'GET') {
          // GET /analytics/dashboard - Get dashboard analytics
          const stats = await getDashboardStats(userId);
          
          response = {
            success: true,
            data: stats,
            message: 'Dashboard analytics retrieved successfully',
            timestamp: new Date().toISOString()
          };
        } else {
          throw new Error('Method not allowed');
        }
      } else {
        throw new Error('Endpoint not found');
      }
    } else {
      throw new Error('Endpoint not found');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ [TELEMETRY-API-${requestId}] Completed in ${processingTime}ms`);

    return new Response(
      JSON.stringify(response),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Processing-Time': processingTime.toString()
        }
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [TELEMETRY-API-${requestId}] Error after ${processingTime}ms:`, error);
    
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.message === 'Method not allowed') {
      statusCode = 405;
      errorMessage = error.message;
    } else if (error.message === 'Endpoint not found') {
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message.includes('Validation') || error.message.includes('required')) {
      statusCode = 400;
      errorMessage = error.message;
    }

    // Log error telemetry (self-logging)
    try {
      const { user } = await authenticate(req);
      if (user) {
        await supabase
          .from('telemetry_events')
          .insert({
            user_id: user.id,
            event_type: 'api_error',
            event_category: 'error',
            event_data: {
              endpoint: 'telemetry-api',
              method: req.method,
              error: error.message,
              status_code: statusCode
            },
            duration_ms: processingTime,
            success: false,
            error_message: error.message,
            ...extractClientInfo(req)
          })
          .catch(err => console.warn('Failed to log error telemetry:', err));
      }
    } catch (telemetryError) {
      console.warn('Failed to log error telemetry:', telemetryError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        message: statusCode >= 500 ? 'An unexpected error occurred. Please try again.' : error.message,
        timestamp: new Date().toISOString()
      } as ApiResponse),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Processing-Time': processingTime.toString()
        }
      }
    );
  }
});