/**
 * Clixen Comprehensive Health Check API
 * Provides detailed system health monitoring endpoints
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders, withCors } from '../_shared/cors.ts';

interface HealthCheckRequest {
  action: 'basic' | 'detailed' | 'dependencies' | 'performance' | 'all';
  timeout?: number;
}

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  last_check: string;
  details?: Record<string, any>;
  error?: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  environment: string;
  uptime_seconds: number;
  services: ServiceHealth[];
  database: {
    status: 'healthy' | 'degraded' | 'down';
    connection_count: number;
    query_performance: number;
    migrations_current: boolean;
  };
  external_dependencies: ServiceHealth[];
  performance_metrics: {
    memory_usage: number;
    cpu_usage: number;
    response_time_p95: number;
    error_rate: number;
  };
  alerts: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }>;
}

const startTime = Date.now();

serve(withCors(async (req: Request) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'basic';
    const timeout = parseInt(url.searchParams.get('timeout') || '10000');

    switch (action) {
      case 'basic':
        return await handleBasicHealthCheck();
      
      case 'detailed':
        return await handleDetailedHealthCheck(supabase);
      
      case 'dependencies':
        return await handleDependencyCheck();
      
      case 'performance':
        return await handlePerformanceCheck(supabase);
      
      case 'all':
        return await handleComprehensiveHealthCheck(supabase, timeout);
      
      default:
        return await handleBasicHealthCheck();
    }
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'down',
        error: 'Health check failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}));

/**
 * Basic health check - minimal response for load balancers
 */
async function handleBasicHealthCheck(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000)
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Detailed health check with internal services
 */
async function handleDetailedHealthCheck(supabase: any): Promise<Response> {
  const health: SystemHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: Deno.env.get('ENVIRONMENT') || 'production',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    services: [],
    database: {
      status: 'healthy',
      connection_count: 0,
      query_performance: 0,
      migrations_current: true
    },
    external_dependencies: [],
    performance_metrics: {
      memory_usage: 0,
      cpu_usage: 0,
      response_time_p95: 0,
      error_rate: 0
    },
    alerts: []
  };

  // Check database health
  const dbHealth = await checkDatabaseHealth(supabase);
  health.database = dbHealth;
  
  if (dbHealth.status !== 'healthy') {
    health.status = 'degraded';
    health.alerts.push({
      severity: 'critical',
      message: 'Database health check failed',
      timestamp: new Date().toISOString()
    });
  }

  // Check internal services
  const internalServices = await checkInternalServices(supabase);
  health.services = internalServices;
  
  // Update overall status based on services
  const downServices = internalServices.filter(s => s.status === 'down');
  const degradedServices = internalServices.filter(s => s.status === 'degraded');
  
  if (downServices.length > 0) {
    health.status = 'down';
    health.alerts.push({
      severity: 'critical',
      message: `${downServices.length} service(s) are down`,
      timestamp: new Date().toISOString()
    });
  } else if (degradedServices.length > 0) {
    health.status = 'degraded';
    health.alerts.push({
      severity: 'warning',
      message: `${degradedServices.length} service(s) are degraded`,
      timestamp: new Date().toISOString()
    });
  }

  const statusCode = health.status === 'healthy' ? 200 : (health.status === 'degraded' ? 200 : 503);

  return new Response(
    JSON.stringify(health),
    { 
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * External dependency health check
 */
async function handleDependencyCheck(): Promise<Response> {
  const dependencies = await checkExternalDependencies();
  
  const status = dependencies.every(d => d.status === 'healthy') ? 'healthy' : 
                 dependencies.some(d => d.status === 'down') ? 'degraded' : 'degraded';

  return new Response(
    JSON.stringify({
      status,
      timestamp: new Date().toISOString(),
      dependencies
    }),
    { 
      status: status === 'healthy' ? 200 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Performance metrics health check
 */
async function handlePerformanceCheck(supabase: any): Promise<Response> {
  const performanceMetrics = await getPerformanceMetrics(supabase);
  
  const alerts = [];
  
  // Check performance thresholds
  if (performanceMetrics.response_time_p95 > 2000) {
    alerts.push({
      severity: 'warning',
      message: 'High response times detected',
      timestamp: new Date().toISOString()
    });
  }
  
  if (performanceMetrics.error_rate > 0.05) {
    alerts.push({
      severity: 'critical',
      message: 'High error rate detected',
      timestamp: new Date().toISOString()
    });
  }

  return new Response(
    JSON.stringify({
      status: alerts.length === 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      performance: performanceMetrics,
      alerts
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Comprehensive health check with all components
 */
async function handleComprehensiveHealthCheck(supabase: any, timeout: number): Promise<Response> {
  const startCheck = Date.now();
  
  // Run all health checks in parallel with timeout
  const healthChecks = await Promise.allSettled([
    Promise.race([
      checkDatabaseHealth(supabase),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Database check timeout')), timeout))
    ]),
    Promise.race([
      checkInternalServices(supabase),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Services check timeout')), timeout))
    ]),
    Promise.race([
      checkExternalDependencies(),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Dependencies check timeout')), timeout))
    ]),
    Promise.race([
      getPerformanceMetrics(supabase),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Performance check timeout')), timeout))
    ])
  ]);

  const dbResult = healthChecks[0];
  const servicesResult = healthChecks[1];
  const depsResult = healthChecks[2];
  const perfResult = healthChecks[3];

  const health: SystemHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: Deno.env.get('ENVIRONMENT') || 'production',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    services: servicesResult.status === 'fulfilled' ? servicesResult.value : [],
    database: dbResult.status === 'fulfilled' ? dbResult.value : {
      status: 'down',
      connection_count: 0,
      query_performance: 0,
      migrations_current: false
    },
    external_dependencies: depsResult.status === 'fulfilled' ? depsResult.value : [],
    performance_metrics: perfResult.status === 'fulfilled' ? perfResult.value : {
      memory_usage: 0,
      cpu_usage: 0,
      response_time_p95: 0,
      error_rate: 0
    },
    alerts: []
  };

  // Generate alerts based on failed checks
  healthChecks.forEach((result, index) => {
    if (result.status === 'rejected') {
      const checkNames = ['Database', 'Services', 'Dependencies', 'Performance'];
      health.alerts.push({
        severity: 'critical',
        message: `${checkNames[index]} health check failed: ${result.reason.message}`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Determine overall status
  if (health.database.status === 'down') {
    health.status = 'down';
  } else if (
    health.services.some(s => s.status === 'down') ||
    health.external_dependencies.some(d => d.status === 'down') ||
    health.performance_metrics.error_rate > 0.1
  ) {
    health.status = 'down';
  } else if (
    health.database.status === 'degraded' ||
    health.services.some(s => s.status === 'degraded') ||
    health.external_dependencies.some(d => d.status === 'degraded') ||
    health.performance_metrics.error_rate > 0.05
  ) {
    health.status = 'degraded';
  }

  const checkDuration = Date.now() - startCheck;
  
  return new Response(
    JSON.stringify({
      ...health,
      check_duration_ms: checkDuration
    }),
    { 
      status: health.status === 'healthy' ? 200 : (health.status === 'degraded' ? 200 : 503),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Check database health and performance
 */
async function checkDatabaseHealth(supabase: any) {
  const startTime = Date.now();
  
  try {
    // Test basic connectivity
    const { data: testQuery, error: testError } = await supabase
      .from('conversations')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (testError) throw testError;
    
    const queryTime = Date.now() - startTime;
    
    // Check active connections (if available)
    const { data: connectionData } = await supabase.rpc('get_connection_count').catch(() => null);
    const connectionCount = connectionData || 0;
    
    // Check migrations status
    const { data: migrations } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .catch(() => null);
    
    return {
      status: queryTime > 1000 ? 'degraded' : 'healthy',
      connection_count: connectionCount,
      query_performance: queryTime,
      migrations_current: !!migrations
    };
  } catch (error) {
    return {
      status: 'down',
      connection_count: 0,
      query_performance: Date.now() - startTime,
      migrations_current: false,
      error: error.message
    };
  }
}

/**
 * Check internal Edge Functions health
 */
async function checkInternalServices(supabase: any): Promise<ServiceHealth[]> {
  const services = [
    { name: 'ai-chat-system', endpoint: 'ai-chat-system' },
    { name: 'api-operations', endpoint: 'api-operations' },
    { name: 'monitoring-api', endpoint: 'monitoring-api' },
    { name: 'workflow-deployment-service', endpoint: 'workflow-deployment-service' }
  ];

  const serviceChecks = await Promise.allSettled(
    services.map(async service => {
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${service.endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'health_check' })
        });
        
        const responseTime = Date.now() - startTime;
        
        return {
          service: service.name,
          status: response.ok ? 'healthy' : 'degraded',
          response_time_ms: responseTime,
          last_check: new Date().toISOString(),
          details: {
            http_status: response.status,
            endpoint: service.endpoint
          }
        } as ServiceHealth;
      } catch (error) {
        return {
          service: service.name,
          status: 'down',
          response_time_ms: Date.now() - startTime,
          last_check: new Date().toISOString(),
          error: error.message
        } as ServiceHealth;
      }
    })
  );

  return serviceChecks.map(result => 
    result.status === 'fulfilled' ? result.value : {
      service: 'unknown',
      status: 'down',
      response_time_ms: 0,
      last_check: new Date().toISOString(),
      error: 'Service check failed'
    }
  );
}

/**
 * Check external dependencies
 */
async function checkExternalDependencies(): Promise<ServiceHealth[]> {
  const dependencies = [
    {
      name: 'n8n-api',
      url: Deno.env.get('N8N_API_URL')?.replace('/api/v1', '') + '/healthz'
    },
    {
      name: 'openai-api',
      url: 'https://api.openai.com/v1/models'
    }
  ];

  const depChecks = await Promise.allSettled(
    dependencies.map(async dep => {
      const startTime = Date.now();
      
      try {
        if (!dep.url) throw new Error('URL not configured');
        
        const headers: Record<string, string> = {};
        if (dep.name === 'openai-api') {
          const apiKey = Deno.env.get('OPENAI_API_KEY');
          if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const response = await fetch(dep.url, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(5000)
        });
        
        const responseTime = Date.now() - startTime;
        
        return {
          service: dep.name,
          status: response.ok ? 'healthy' : 'degraded',
          response_time_ms: responseTime,
          last_check: new Date().toISOString(),
          details: {
            http_status: response.status,
            url: dep.url
          }
        } as ServiceHealth;
      } catch (error) {
        return {
          service: dep.name,
          status: 'down',
          response_time_ms: Date.now() - startTime,
          last_check: new Date().toISOString(),
          error: error.message
        } as ServiceHealth;
      }
    })
  );

  return depChecks.map(result => 
    result.status === 'fulfilled' ? result.value : {
      service: 'unknown',
      status: 'down',
      response_time_ms: 0,
      last_check: new Date().toISOString(),
      error: 'Dependency check failed'
    }
  );
}

/**
 * Get performance metrics from recent logs
 */
async function getPerformanceMetrics(supabase: any) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  try {
    // Get recent logs for performance analysis
    const { data: logs } = await supabase
      .from('application_logs')
      .select('level, performance_metrics, context')
      .gte('timestamp', oneHourAgo)
      .limit(1000);
    
    if (!logs || logs.length === 0) {
      return {
        memory_usage: 0,
        cpu_usage: 0,
        response_time_p95: 0,
        error_rate: 0
      };
    }
    
    // Calculate error rate
    const errorCount = logs.filter(log => log.level === 'error').length;
    const errorRate = logs.length > 0 ? errorCount / logs.length : 0;
    
    // Calculate response time metrics
    const responseTimes = logs
      .filter(log => log.performance_metrics?.duration_ms)
      .map(log => log.performance_metrics.duration_ms)
      .sort((a, b) => a - b);
    
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const responseTimeP95 = responseTimes[p95Index] || 0;
    
    return {
      memory_usage: 0, // Would need system metrics
      cpu_usage: 0,    // Would need system metrics
      response_time_p95: responseTimeP95,
      error_rate: errorRate
    };
  } catch (error) {
    return {
      memory_usage: 0,
      cpu_usage: 0,
      response_time_p95: 0,
      error_rate: 0
    };
  }
}