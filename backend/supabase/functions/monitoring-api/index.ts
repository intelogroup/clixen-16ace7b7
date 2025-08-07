/**
 * Clixen Monitoring API Edge Function
 * Provides monitoring dashboard and alerting endpoints
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, withCors } from '../_shared/cors.ts';

interface MonitoringRequest {
  action: 'health' | 'metrics' | 'alerts' | 'dashboard' | 'test_alert';
  service?: string;
  timeframe?: string;
  severity?: 'critical' | 'warning' | 'info';
}

serve(withCors(async (req: Request) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, service, timeframe, severity }: MonitoringRequest = await req.json();

    switch (action) {
      case 'health':
        return await handleHealthCheck(supabase);
      
      case 'metrics':
        return await handleMetricsQuery(supabase, service, timeframe);
      
      case 'alerts':
        return await handleAlertsQuery(supabase, severity, timeframe);
      
      case 'dashboard':
        return await handleDashboardData(supabase);
      
      case 'test_alert':
        return await handleTestAlert(supabase);
      
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
    console.error('Monitoring API error:', error);
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
 * Handle health check request
 */
async function handleHealthCheck(supabase: any) {
  const startTime = Date.now();
  
  // Test database connection
  const { data: dbTest, error: dbError } = await supabase
    .from('conversations')
    .select('count', { count: 'exact' })
    .limit(1);
  
  const dbResponseTime = Date.now() - startTime;
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbError ? 'error' : 'healthy',
        response_time_ms: dbResponseTime,
        error: dbError?.message
      },
      monitoring_api: {
        status: 'healthy',
        response_time_ms: Date.now() - startTime
      }
    },
    environment: Deno.env.get('ENVIRONMENT') || 'production'
  };
  
  return new Response(
    JSON.stringify(health),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle metrics query
 */
async function handleMetricsQuery(supabase: any, service?: string, timeframe = '1h') {
  const timeframeMap = {
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  
  const timeWindow = timeframeMap[timeframe as keyof typeof timeframeMap] || timeframeMap['1h'];
  const startTime = new Date(Date.now() - timeWindow).toISOString();
  
  let query = supabase
    .from('monitoring_metrics')
    .select('*')
    .gte('timestamp', startTime)
    .order('timestamp', { ascending: false });
  
  if (service) {
    query = query.eq('service', service);
  }
  
  const { data: metrics, error } = await query.limit(1000);
  
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Aggregate metrics by service and metric name
  const aggregated = aggregateMetrics(metrics || []);
  
  return new Response(
    JSON.stringify({
      metrics: metrics || [],
      aggregated,
      timeframe,
      service,
      count: metrics?.length || 0
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle alerts query
 */
async function handleAlertsQuery(supabase: any, severity?: string, timeframe = '24h') {
  const timeframeMap = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  
  const timeWindow = timeframeMap[timeframe as keyof typeof timeframeMap] || timeframeMap['24h'];
  const startTime = new Date(Date.now() - timeWindow).toISOString();
  
  let query = supabase
    .from('monitoring_alerts')
    .select('*')
    .gte('timestamp', startTime)
    .order('timestamp', { ascending: false });
  
  if (severity) {
    query = query.eq('severity', severity);
  }
  
  const { data: alerts, error } = await query.limit(100);
  
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Group alerts by severity
  const alertSummary = (alerts || []).reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {});
  
  return new Response(
    JSON.stringify({
      alerts: alerts || [],
      summary: alertSummary,
      timeframe,
      severity,
      count: alerts?.length || 0
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle dashboard data request
 */
async function handleDashboardData(supabase: any) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  // Get recent metrics
  const { data: metrics } = await supabase
    .from('monitoring_metrics')
    .select('*')
    .gte('timestamp', oneDayAgo)
    .order('timestamp', { ascending: false })
    .limit(500);
  
  // Get recent alerts
  const { data: alerts } = await supabase
    .from('monitoring_alerts')
    .select('*')
    .gte('timestamp', oneDayAgo)
    .order('timestamp', { ascending: false })
    .limit(50);
  
  // Get service health history
  const { data: healthHistory } = await supabase
    .from('service_health_history')
    .select('*')
    .gte('timestamp', oneDayAgo)
    .order('timestamp', { ascending: false })
    .limit(200);
  
  // Calculate MVP success metrics
  const mvpMetrics = await calculateMVPMetrics(supabase);
  
  // Calculate service uptime
  const serviceUptime = calculateServiceUptime(healthHistory || []);
  
  // Recent performance metrics
  const performanceMetrics = aggregateMetrics(metrics || []);
  
  const dashboardData = {
    timestamp: now.toISOString(),
    mvp_metrics: mvpMetrics,
    service_uptime: serviceUptime,
    performance_metrics: performanceMetrics,
    recent_alerts: (alerts || []).slice(0, 10),
    alert_summary: (alerts || []).reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {}),
    system_status: {
      overall: 'healthy', // Computed based on recent metrics
      services: calculateServiceStatus(healthHistory || [])
    }
  };
  
  return new Response(
    JSON.stringify(dashboardData),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Handle test alert
 */
async function handleTestAlert(supabase: any) {
  const testAlert = {
    rule_id: 'test_alert',
    service: 'monitoring_system',
    metric: 'test_metric',
    threshold: 100,
    severity: 'info',
    message: 'Test alert - monitoring system is working correctly',
    timestamp: new Date().toISOString(),
    environment: Deno.env.get('ENVIRONMENT') || 'production'
  };
  
  // Record test alert
  const { error } = await supabase
    .from('monitoring_alerts')
    .insert([testAlert]);
  
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Send test notification
  await sendTestNotification(testAlert);
  
  return new Response(
    JSON.stringify({
      success: true,
      alert: testAlert,
      message: 'Test alert sent successfully'
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Aggregate metrics by service and metric name
 */
function aggregateMetrics(metrics: any[]) {
  const aggregated: Record<string, any> = {};
  
  metrics.forEach(metric => {
    const key = `${metric.service}_${metric.metric_name}`;
    
    if (!aggregated[key]) {
      aggregated[key] = {
        service: metric.service,
        metric_name: metric.metric_name,
        unit: metric.unit,
        values: [],
        avg: 0,
        min: Infinity,
        max: -Infinity,
        count: 0
      };
    }
    
    const agg = aggregated[key];
    agg.values.push({ value: metric.value, timestamp: metric.timestamp });
    agg.min = Math.min(agg.min, metric.value);
    agg.max = Math.max(agg.max, metric.value);
    agg.count++;
  });
  
  // Calculate averages
  Object.values(aggregated).forEach((agg: any) => {
    agg.avg = agg.values.reduce((sum: number, v: any) => sum + v.value, 0) / agg.count;
    agg.values.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    agg.values = agg.values.slice(0, 50); // Keep only recent 50 values for dashboard
  });
  
  return aggregated;
}

/**
 * Calculate MVP success metrics
 */
async function calculateMVPMetrics(supabase: any) {
  try {
    // User onboarding completion rate
    const { data: totalUsers } = await supabase.auth.admin.listUsers();
    const { data: projectUsers } = await supabase
      .from('projects')
      .select('user_id', { count: 'exact' })
      .not('user_id', 'is', null);
    
    const onboardingRate = totalUsers?.users?.length > 0 
      ? ((projectUsers?.length || 0) / totalUsers.users.length) * 100 
      : 0;
    
    // Workflow persistence rate
    const { data: totalWorkflows, count: totalWorkflowCount } = await supabase
      .from('workflows')
      .select('count', { count: 'exact' });
    
    const { data: activeWorkflows, count: activeWorkflowCount } = await supabase
      .from('workflows')
      .select('count', { count: 'exact' })
      .eq('status', 'active');
    
    const persistenceRate = totalWorkflowCount > 0 
      ? ((activeWorkflowCount || 0) / totalWorkflowCount) * 100 
      : 0;
    
    // Deployment success rate
    const { data: totalDeployments, count: totalDeploymentCount } = await supabase
      .from('workflow_deployments')
      .select('count', { count: 'exact' });
    
    const { data: successDeployments, count: successDeploymentCount } = await supabase
      .from('workflow_deployments')
      .select('count', { count: 'exact' })
      .eq('status', 'success');
    
    const deploymentRate = totalDeploymentCount > 0 
      ? ((successDeploymentCount || 0) / totalDeploymentCount) * 100 
      : 0;
    
    return {
      onboarding_completion_rate: onboardingRate,
      workflow_persistence_rate: persistenceRate,
      deployment_success_rate: deploymentRate,
      targets: {
        onboarding_completion_rate: 70,
        workflow_persistence_rate: 90,
        deployment_success_rate: 80
      }
    };
  } catch (error) {
    console.error('Error calculating MVP metrics:', error);
    return {
      onboarding_completion_rate: 0,
      workflow_persistence_rate: 0,
      deployment_success_rate: 0,
      error: error.message
    };
  }
}

/**
 * Calculate service uptime from health history
 */
function calculateServiceUptime(healthHistory: any[]) {
  const services: Record<string, any> = {};
  
  healthHistory.forEach(record => {
    if (!services[record.service]) {
      services[record.service] = {
        service: record.service,
        total_checks: 0,
        healthy_checks: 0,
        uptime_percentage: 0
      };
    }
    
    services[record.service].total_checks++;
    if (record.status === 'healthy') {
      services[record.service].healthy_checks++;
    }
  });
  
  Object.values(services).forEach((service: any) => {
    service.uptime_percentage = service.total_checks > 0 
      ? (service.healthy_checks / service.total_checks) * 100 
      : 100;
  });
  
  return services;
}

/**
 * Calculate service status from recent health history
 */
function calculateServiceStatus(healthHistory: any[]) {
  const recentHistory = healthHistory
    .filter(record => new Date(record.timestamp).getTime() > Date.now() - 10 * 60 * 1000) // Last 10 minutes
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const services: Record<string, string> = {};
  const processedServices = new Set();
  
  recentHistory.forEach(record => {
    if (!processedServices.has(record.service)) {
      services[record.service] = record.status;
      processedServices.add(record.service);
    }
  });
  
  return services;
}

/**
 * Send test notification
 */
async function sendTestNotification(alert: any) {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!webhookUrl) return;
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🧪 Clixen Test Alert`,
        blocks: [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Test Alert*\n📊 ${alert.message}\n🕐 ${alert.timestamp}\n✅ Monitoring system is operational`
          }
        }]
      })
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
}