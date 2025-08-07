/**
 * Clixen Log Aggregator Edge Function
 * Processes and analyzes application logs for insights and alerting
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, withCors } from '../_shared/cors.ts';

interface LogAnalysisRequest {
  action: 'analyze' | 'search' | 'export' | 'aggregate' | 'alerts';
  timeframe?: string;
  service?: string;
  level?: string;
  query?: string;
  format?: 'json' | 'csv';
  filters?: Record<string, any>;
}

interface LogAnalysis {
  timeframe: string;
  total_logs: number;
  error_rate: number;
  services: Record<string, number>;
  levels: Record<string, number>;
  top_errors: Array<{
    message: string;
    count: number;
    last_occurrence: string;
  }>;
  performance_summary: {
    avg_response_time: number;
    p95_response_time: number;
    slowest_endpoints: Array<{
      endpoint: string;
      avg_time: number;
    }>;
  };
  user_activity: {
    active_users: number;
    top_actions: Array<{
      action: string;
      count: number;
    }>;
  };
}

serve(withCors(async (req: Request) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: LogAnalysisRequest = await req.json();
    const { action, timeframe, service, level, query, format, filters } = requestData;

    switch (action) {
      case 'analyze':
        return await handleLogAnalysis(supabase, timeframe, service, level);
      
      case 'search':
        return await handleLogSearch(supabase, query, filters, timeframe);
      
      case 'export':
        return await handleLogExport(supabase, format, filters, timeframe);
      
      case 'aggregate':
        return await handleLogAggregation(supabase, timeframe, service);
      
      case 'alerts':
        return await handleAlertGeneration(supabase, timeframe);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }
  } catch (error) {
    console.error('Log aggregator error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}));

/**
 * Handle comprehensive log analysis
 */
async function handleLogAnalysis(
  supabase: any, 
  timeframe = '24h', 
  service?: string, 
  level?: string
): Promise<Response> {
  const timeWindows = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  
  const timeWindow = timeWindows[timeframe as keyof typeof timeWindows] || timeWindows['24h'];
  const startTime = new Date(Date.now() - timeWindow).toISOString();
  
  // Build base query
  let query = supabase
    .from('application_logs')
    .select('*')
    .gte('timestamp', startTime);
  
  if (service) query = query.eq('service', service);
  if (level) query = query.eq('level', level);
  
  const { data: logs, error } = await query.order('timestamp', { ascending: false });
  
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Analyze logs
  const analysis = await analyzeLogs(logs || [], supabase);
  
  return new Response(
    JSON.stringify({
      analysis,
      timeframe,
      service,
      level,
      timestamp: new Date().toISOString()
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle log search with advanced filtering
 */
async function handleLogSearch(
  supabase: any,
  searchQuery?: string,
  filters?: Record<string, any>,
  timeframe = '24h'
): Promise<Response> {
  const timeWindows = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  
  const timeWindow = timeWindows[timeframe as keyof typeof timeWindows] || timeWindows['24h'];
  const startTime = new Date(Date.now() - timeWindow).toISOString();
  
  let query = supabase
    .from('application_logs')
    .select('*')
    .gte('timestamp', startTime);
  
  // Apply filters
  if (filters?.service) query = query.eq('service', filters.service);
  if (filters?.level) query = query.eq('level', filters.level);
  if (filters?.user_id) query = query.eq('user_id', filters.user_id);
  
  // Text search in message
  if (searchQuery) {
    query = query.ilike('message', `%${searchQuery}%`);
  }
  
  const { data: results, error } = await query
    .order('timestamp', { ascending: false })
    .limit(500);
  
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  return new Response(
    JSON.stringify({
      results: results || [],
      count: results?.length || 0,
      query: searchQuery,
      filters,
      timeframe
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle log export in various formats
 */
async function handleLogExport(
  supabase: any,
  format = 'json',
  filters?: Record<string, any>,
  timeframe = '24h'
): Promise<Response> {
  const timeWindows = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  
  const timeWindow = timeWindows[timeframe as keyof typeof timeWindows] || timeWindows['24h'];
  const startTime = new Date(Date.now() - timeWindow).toISOString();
  
  let query = supabase
    .from('application_logs')
    .select('*')
    .gte('timestamp', startTime);
  
  // Apply filters
  if (filters?.service) query = query.eq('service', filters.service);
  if (filters?.level) query = query.eq('level', filters.level);
  
  const { data: logs, error } = await query
    .order('timestamp', { ascending: false })
    .limit(10000); // Limit for export
  
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  if (format === 'csv') {
    const csv = convertToCSV(logs || []);
    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="clixen-logs-${timeframe}.csv"`
      }
    });
  }
  
  return new Response(
    JSON.stringify({
      logs: logs || [],
      count: logs?.length || 0,
      exported_at: new Date().toISOString(),
      timeframe
    }),
    { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="clixen-logs-${timeframe}.json"`
      }
    }
  );
}

/**
 * Handle log aggregation for dashboards
 */
async function handleLogAggregation(
  supabase: any,
  timeframe = '24h',
  service?: string
): Promise<Response> {
  const timeWindows = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  
  const timeWindow = timeWindows[timeframe as keyof typeof timeWindows] || timeWindows['24h'];
  const startTime = new Date(Date.now() - timeWindow).toISOString();
  
  // Get aggregated data using SQL functions
  const { data: hourlyAgg, error: hourlyError } = await supabase.rpc('get_hourly_log_aggregation', {
    start_time: startTime,
    target_service: service || null
  });
  
  const { data: errorAgg, error: errorError } = await supabase.rpc('get_error_aggregation', {
    start_time: startTime,
    target_service: service || null
  });
  
  if (hourlyError || errorError) {
    return new Response(
      JSON.stringify({ 
        error: 'Aggregation query failed',
        details: { hourlyError, errorError }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  return new Response(
    JSON.stringify({
      hourly_aggregation: hourlyAgg || [],
      error_aggregation: errorAgg || [],
      timeframe,
      service,
      timestamp: new Date().toISOString()
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle alert generation based on log patterns
 */
async function handleAlertGeneration(supabase: any, timeframe = '1h'): Promise<Response> {
  const timeWindows = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000
  };
  
  const timeWindow = timeWindows[timeframe as keyof typeof timeWindows] || timeWindows['1h'];
  const startTime = new Date(Date.now() - timeWindow).toISOString();
  
  // Check for alert conditions
  const alerts = [];
  
  // High error rate alert
  const { data: errorLogs } = await supabase
    .from('application_logs')
    .select('count', { count: 'exact' })
    .eq('level', 'error')
    .gte('timestamp', startTime);
  
  const { data: totalLogs } = await supabase
    .from('application_logs')
    .select('count', { count: 'exact' })
    .gte('timestamp', startTime);
  
  const errorCount = errorLogs?.[0]?.count || 0;
  const totalCount = totalLogs?.[0]?.count || 0;
  const errorRate = totalCount > 0 ? errorCount / totalCount : 0;
  
  if (errorRate > 0.05) { // 5% error rate threshold
    alerts.push({
      type: 'high_error_rate',
      severity: 'critical',
      message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
      value: errorRate,
      threshold: 0.05,
      timeframe
    });
  }
  
  // High volume alert
  if (totalCount > 10000) { // High volume threshold
    alerts.push({
      type: 'high_log_volume',
      severity: 'warning',
      message: `High log volume: ${totalCount} logs in ${timeframe}`,
      value: totalCount,
      threshold: 10000,
      timeframe
    });
  }
  
  // Repeated errors alert
  const { data: repeatedErrors } = await supabase
    .from('application_logs')
    .select('message')
    .eq('level', 'error')
    .gte('timestamp', startTime);
  
  const errorCounts: Record<string, number> = {};
  (repeatedErrors || []).forEach(log => {
    errorCounts[log.message] = (errorCounts[log.message] || 0) + 1;
  });
  
  Object.entries(errorCounts).forEach(([message, count]) => {
    if (count > 10) { // Repeated error threshold
      alerts.push({
        type: 'repeated_error',
        severity: 'warning',
        message: `Repeated error: "${message.substring(0, 100)}..." (${count} times)`,
        value: count,
        threshold: 10,
        timeframe,
        error_message: message
      });
    }
  });
  
  // Store alerts in database
  if (alerts.length > 0) {
    const alertRecords = alerts.map(alert => ({
      alert_type: alert.type,
      severity: alert.severity,
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold,
      timeframe: alert.timeframe,
      timestamp: new Date().toISOString(),
      environment: Deno.env.get('ENVIRONMENT') || 'production',
      metadata: alert
    }));
    
    await supabase
      .from('log_alerts')
      .insert(alertRecords);
  }
  
  return new Response(
    JSON.stringify({
      alerts,
      timeframe,
      timestamp: new Date().toISOString(),
      summary: {
        total_alerts: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length
      }
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Analyze logs and generate insights
 */
async function analyzeLogs(logs: any[], supabase: any): Promise<LogAnalysis> {
  const analysis: LogAnalysis = {
    timeframe: '',
    total_logs: logs.length,
    error_rate: 0,
    services: {},
    levels: {},
    top_errors: [],
    performance_summary: {
      avg_response_time: 0,
      p95_response_time: 0,
      slowest_endpoints: []
    },
    user_activity: {
      active_users: 0,
      top_actions: []
    }
  };
  
  // Count by service and level
  const errorMessages: Record<string, number> = {};
  const responseTimes: number[] = [];
  const endpointTimes: Record<string, number[]> = {};
  const userActions: Record<string, number> = {};
  const uniqueUsers = new Set<string>();
  
  logs.forEach(log => {
    // Service counts
    analysis.services[log.service] = (analysis.services[log.service] || 0) + 1;
    
    // Level counts
    analysis.levels[log.level] = (analysis.levels[log.level] || 0) + 1;
    
    // Error messages
    if (log.level === 'error') {
      errorMessages[log.message] = (errorMessages[log.message] || 0) + 1;
    }
    
    // Performance metrics
    if (log.performance_metrics?.duration_ms) {
      responseTimes.push(log.performance_metrics.duration_ms);
    }
    
    // API endpoint performance
    if (log.context?.api?.endpoint && log.context?.api?.duration_ms) {
      const endpoint = log.context.api.endpoint;
      if (!endpointTimes[endpoint]) endpointTimes[endpoint] = [];
      endpointTimes[endpoint].push(log.context.api.duration_ms);
    }
    
    // User activity
    if (log.user_id) {
      uniqueUsers.add(log.user_id);
    }
    
    if (log.context?.action_name) {
      userActions[log.context.action_name] = (userActions[log.context.action_name] || 0) + 1;
    }
  });
  
  // Calculate error rate
  analysis.error_rate = analysis.total_logs > 0 
    ? (analysis.levels.error || 0) / analysis.total_logs 
    : 0;
  
  // Top errors
  analysis.top_errors = Object.entries(errorMessages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([message, count]) => ({
      message,
      count,
      last_occurrence: logs.find(l => l.message === message && l.level === 'error')?.timestamp || ''
    }));
  
  // Performance summary
  if (responseTimes.length > 0) {
    analysis.performance_summary.avg_response_time = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    analysis.performance_summary.p95_response_time = responseTimes[p95Index] || 0;
  }
  
  // Slowest endpoints
  analysis.performance_summary.slowest_endpoints = Object.entries(endpointTimes)
    .map(([endpoint, times]) => ({
      endpoint,
      avg_time: times.reduce((a, b) => a + b, 0) / times.length
    }))
    .sort((a, b) => b.avg_time - a.avg_time)
    .slice(0, 5);
  
  // User activity
  analysis.user_activity.active_users = uniqueUsers.size;
  analysis.user_activity.top_actions = Object.entries(userActions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([action, count]) => ({ action, count }));
  
  return analysis;
}

/**
 * Convert logs to CSV format
 */
function convertToCSV(logs: any[]): string {
  if (logs.length === 0) return 'No data';
  
  const headers = ['timestamp', 'level', 'service', 'message', 'user_id', 'environment'];
  const csvRows = [headers.join(',')];
  
  logs.forEach(log => {
    const row = [
      log.timestamp,
      log.level,
      log.service,
      `"${log.message.replace(/"/g, '""')}"`, // Escape quotes
      log.user_id || '',
      log.environment
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}