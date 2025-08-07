/**
 * Clixen MVP Metrics Collector Edge Function
 * Automated collection and calculation of MVP success metrics
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, withCors } from '../_shared/cors.ts';

interface MVPMetricsRequest {
  action: 'collect' | 'calculate' | 'history' | 'export';
  timeframe?: string;
  format?: 'json' | 'csv';
}

interface MVPSnapshot {
  timestamp: string;
  environment: string;
  metrics: {
    onboarding_completion_rate: number;
    workflow_persistence_rate: number;
    deployment_success_rate: number;
    system_uptime: number;
    avg_response_time: number;
    error_rate: number;
  };
  raw_data: {
    total_users: number;
    users_with_projects: number;
    total_workflows: number;
    active_workflows: number;
    total_deployments: number;
    successful_deployments: number;
  };
  targets: {
    onboarding_completion_rate: 70;
    workflow_persistence_rate: 90;
    deployment_success_rate: 80;
    system_uptime: 99.9;
  };
  success_criteria_met: number;
  overall_status: 'success' | 'partial' | 'needs_improvement';
}

serve(withCors(async (req: Request) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, timeframe, format }: MVPMetricsRequest = await req.json();

    switch (action) {
      case 'collect':
        return await handleMetricsCollection(supabase);
      
      case 'calculate':
        return await handleMetricsCalculation(supabase);
      
      case 'history':
        return await handleMetricsHistory(supabase, timeframe);
      
      case 'export':
        return await handleMetricsExport(supabase, format, timeframe);
      
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
    console.error('MVP metrics collector error:', error);
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
 * Handle metrics collection and storage
 */
async function handleMetricsCollection(supabase: any): Promise<Response> {
  const snapshot = await collectMVPSnapshot(supabase);
  
  // Store snapshot in database
  const { error: insertError } = await supabase
    .from('mvp_metrics_snapshots')
    .insert([snapshot]);
  
  if (insertError) {
    console.error('Error storing MVP snapshot:', insertError);
    return new Response(
      JSON.stringify({ error: 'Failed to store metrics snapshot' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Create alerts if needed
  const alerts = await checkMVPAlerts(snapshot);
  if (alerts.length > 0) {
    await supabase
      .from('mvp_alerts')
      .insert(alerts);
  }
  
  return new Response(
    JSON.stringify({
      success: true,
      snapshot,
      alerts: alerts.length,
      message: 'MVP metrics collected successfully'
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle real-time metrics calculation
 */
async function handleMetricsCalculation(supabase: any): Promise<Response> {
  const snapshot = await collectMVPSnapshot(supabase);
  
  return new Response(
    JSON.stringify(snapshot),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle metrics history retrieval
 */
async function handleMetricsHistory(supabase: any, timeframe = '7d'): Promise<Response> {
  const timeWindows = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  
  const timeWindow = timeWindows[timeframe as keyof typeof timeWindows] || timeWindows['7d'];
  const startTime = new Date(Date.now() - timeWindow).toISOString();
  
  const { data: history, error } = await supabase
    .from('mvp_metrics_snapshots')
    .select('*')
    .gte('timestamp', startTime)
    .order('timestamp', { ascending: false });
  
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Calculate trends
  const trends = calculateTrends(history || []);
  
  return new Response(
    JSON.stringify({
      history: history || [],
      trends,
      timeframe,
      count: history?.length || 0
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle metrics export
 */
async function handleMetricsExport(supabase: any, format = 'json', timeframe = '30d'): Promise<Response> {
  const timeWindows = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
  };
  
  const timeWindow = timeWindows[timeframe as keyof typeof timeWindows] || timeWindows['30d'];
  const startTime = new Date(Date.now() - timeWindow).toISOString();
  
  const { data: metrics, error } = await supabase
    .from('mvp_metrics_snapshots')
    .select('*')
    .gte('timestamp', startTime)
    .order('timestamp', { ascending: true });
  
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
    const csv = convertMetricsToCSV(metrics || []);
    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="clixen-mvp-metrics-${timeframe}.csv"`
      }
    });
  }
  
  return new Response(
    JSON.stringify({
      metrics: metrics || [],
      exported_at: new Date().toISOString(),
      timeframe,
      count: metrics?.length || 0
    }),
    { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="clixen-mvp-metrics-${timeframe}.json"`
      }
    }
  );
}

/**
 * Collect comprehensive MVP metrics snapshot
 */
async function collectMVPSnapshot(supabase: any): Promise<MVPSnapshot> {
  const timestamp = new Date().toISOString();
  const environment = Deno.env.get('ENVIRONMENT') || 'production';
  
  // Collect raw data
  const rawData = await collectRawMVPData(supabase);
  
  // Calculate metrics
  const metrics = calculateMVPMetrics(rawData);
  
  // Define targets
  const targets = {
    onboarding_completion_rate: 70,
    workflow_persistence_rate: 90,
    deployment_success_rate: 80,
    system_uptime: 99.9
  };
  
  // Count success criteria met
  const criteriaResults = [
    metrics.onboarding_completion_rate >= targets.onboarding_completion_rate,
    metrics.workflow_persistence_rate >= targets.workflow_persistence_rate,
    metrics.deployment_success_rate >= targets.deployment_success_rate,
    metrics.system_uptime >= targets.system_uptime
  ];
  
  const successCriteriaMet = criteriaResults.filter(Boolean).length;
  
  // Determine overall status
  let overallStatus: 'success' | 'partial' | 'needs_improvement';
  if (successCriteriaMet === 4) {
    overallStatus = 'success';
  } else if (successCriteriaMet >= 2) {
    overallStatus = 'partial';
  } else {
    overallStatus = 'needs_improvement';
  }
  
  return {
    timestamp,
    environment,
    metrics,
    raw_data: rawData,
    targets,
    success_criteria_met: successCriteriaMet,
    overall_status: overallStatus
  };
}

/**
 * Collect raw data for MVP calculations
 */
async function collectRawMVPData(supabase: any) {
  try {
    // Get total users
    const { data: userStats } = await supabase.auth.admin.listUsers();
    const totalUsers = userStats?.users?.length || 0;
    
    // Get users with projects (completed onboarding)
    const { data: projectUsers, count: usersWithProjects } = await supabase
      .from('projects')
      .select('user_id', { count: 'exact' })
      .not('user_id', 'is', null);
    
    // Get workflow statistics
    const { data: workflowStats, count: totalWorkflows } = await supabase
      .from('workflows')
      .select('status', { count: 'exact' });
    
    const { data: activeWorkflows, count: activeWorkflowCount } = await supabase
      .from('workflows')
      .select('count', { count: 'exact' })
      .eq('status', 'active');
    
    // Get deployment statistics
    const { data: deploymentStats, count: totalDeployments } = await supabase
      .from('workflow_deployments')
      .select('status', { count: 'exact' });
    
    const { data: successfulDeployments, count: successfulDeploymentCount } = await supabase
      .from('workflow_deployments')
      .select('count', { count: 'exact' })
      .eq('status', 'success');
    
    return {
      total_users: totalUsers,
      users_with_projects: usersWithProjects || 0,
      total_workflows: totalWorkflows || 0,
      active_workflows: activeWorkflowCount || 0,
      total_deployments: totalDeployments || 0,
      successful_deployments: successfulDeploymentCount || 0
    };
  } catch (error) {
    console.error('Error collecting raw MVP data:', error);
    return {
      total_users: 0,
      users_with_projects: 0,
      total_workflows: 0,
      active_workflows: 0,
      total_deployments: 0,
      successful_deployments: 0
    };
  }
}

/**
 * Calculate MVP metrics from raw data
 */
function calculateMVPMetrics(rawData: any) {
  const onboardingRate = rawData.total_users > 0 
    ? (rawData.users_with_projects / rawData.total_users) * 100 
    : 0;
  
  const persistenceRate = rawData.total_workflows > 0 
    ? (rawData.active_workflows / rawData.total_workflows) * 100 
    : 0;
  
  const deploymentRate = rawData.total_deployments > 0 
    ? (rawData.successful_deployments / rawData.total_deployments) * 100 
    : 0;
  
  return {
    onboarding_completion_rate: onboardingRate,
    workflow_persistence_rate: persistenceRate,
    deployment_success_rate: deploymentRate,
    system_uptime: 99.8, // This would come from monitoring data
    avg_response_time: 850, // This would come from performance metrics
    error_rate: 0.02 // This would come from error logs
  };
}

/**
 * Check for MVP alerts that need to be generated
 */
async function checkMVPAlerts(snapshot: MVPSnapshot) {
  const alerts = [];
  const now = new Date().toISOString();
  
  // Check each metric against thresholds
  if (snapshot.metrics.onboarding_completion_rate < snapshot.targets.onboarding_completion_rate) {
    alerts.push({
      alert_type: 'mvp_onboarding_below_target',
      severity: 'warning',
      message: `User onboarding rate (${snapshot.metrics.onboarding_completion_rate.toFixed(1)}%) below target (${snapshot.targets.onboarding_completion_rate}%)`,
      value: snapshot.metrics.onboarding_completion_rate,
      threshold: snapshot.targets.onboarding_completion_rate,
      timestamp: now,
      environment: snapshot.environment,
      metadata: { metric: 'onboarding_completion_rate', snapshot_id: snapshot.timestamp }
    });
  }
  
  if (snapshot.metrics.workflow_persistence_rate < snapshot.targets.workflow_persistence_rate) {
    alerts.push({
      alert_type: 'mvp_persistence_below_target',
      severity: 'critical',
      message: `Workflow persistence rate (${snapshot.metrics.workflow_persistence_rate.toFixed(1)}%) below target (${snapshot.targets.workflow_persistence_rate}%)`,
      value: snapshot.metrics.workflow_persistence_rate,
      threshold: snapshot.targets.workflow_persistence_rate,
      timestamp: now,
      environment: snapshot.environment,
      metadata: { metric: 'workflow_persistence_rate', snapshot_id: snapshot.timestamp }
    });
  }
  
  if (snapshot.metrics.deployment_success_rate < snapshot.targets.deployment_success_rate) {
    alerts.push({
      alert_type: 'mvp_deployment_below_target',
      severity: 'critical',
      message: `Deployment success rate (${snapshot.metrics.deployment_success_rate.toFixed(1)}%) below target (${snapshot.targets.deployment_success_rate}%)`,
      value: snapshot.metrics.deployment_success_rate,
      threshold: snapshot.targets.deployment_success_rate,
      timestamp: now,
      environment: snapshot.environment,
      metadata: { metric: 'deployment_success_rate', snapshot_id: snapshot.timestamp }
    });
  }
  
  if (snapshot.metrics.system_uptime < snapshot.targets.system_uptime) {
    alerts.push({
      alert_type: 'mvp_uptime_below_target',
      severity: 'critical',
      message: `System uptime (${snapshot.metrics.system_uptime.toFixed(2)}%) below target (${snapshot.targets.system_uptime}%)`,
      value: snapshot.metrics.system_uptime,
      threshold: snapshot.targets.system_uptime,
      timestamp: now,
      environment: snapshot.environment,
      metadata: { metric: 'system_uptime', snapshot_id: snapshot.timestamp }
    });
  }
  
  // Overall MVP health alert
  if (snapshot.overall_status === 'needs_improvement') {
    alerts.push({
      alert_type: 'mvp_overall_health_poor',
      severity: 'critical',
      message: `MVP overall health is poor (${snapshot.success_criteria_met}/4 criteria met)`,
      value: snapshot.success_criteria_met,
      threshold: 4,
      timestamp: now,
      environment: snapshot.environment,
      metadata: { overall_status: snapshot.overall_status, snapshot_id: snapshot.timestamp }
    });
  }
  
  return alerts;
}

/**
 * Calculate trends from historical data
 */
function calculateTrends(history: any[]) {
  if (history.length < 2) return {};
  
  const latest = history[0];
  const previous = history[1];
  
  const trends = {
    onboarding_completion_rate: latest.metrics.onboarding_completion_rate - previous.metrics.onboarding_completion_rate,
    workflow_persistence_rate: latest.metrics.workflow_persistence_rate - previous.metrics.workflow_persistence_rate,
    deployment_success_rate: latest.metrics.deployment_success_rate - previous.metrics.deployment_success_rate,
    system_uptime: latest.metrics.system_uptime - previous.metrics.system_uptime
  };
  
  return trends;
}

/**
 * Convert metrics to CSV format
 */
function convertMetricsToCSV(metrics: any[]): string {
  if (metrics.length === 0) return 'No data';
  
  const headers = [
    'timestamp',
    'environment',
    'onboarding_completion_rate',
    'workflow_persistence_rate', 
    'deployment_success_rate',
    'system_uptime',
    'avg_response_time',
    'error_rate',
    'success_criteria_met',
    'overall_status'
  ];
  
  const csvRows = [headers.join(',')];
  
  metrics.forEach(metric => {
    const row = [
      metric.timestamp,
      metric.environment,
      metric.metrics.onboarding_completion_rate.toFixed(2),
      metric.metrics.workflow_persistence_rate.toFixed(2),
      metric.metrics.deployment_success_rate.toFixed(2),
      metric.metrics.system_uptime.toFixed(2),
      metric.metrics.avg_response_time.toFixed(0),
      (metric.metrics.error_rate * 100).toFixed(2),
      metric.success_criteria_met,
      metric.overall_status
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}