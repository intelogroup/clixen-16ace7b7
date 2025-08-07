/**
 * Clixen Production Monitoring System
 * Comprehensive monitoring for all backend services and infrastructure
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface MonitoringMetric {
  service: string;
  metric_name: string;
  value: number;
  unit: string;
  timestamp: string;
  environment: string;
  tags?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  service: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration_minutes: number;
  severity: 'critical' | 'warning' | 'info';
  notification_channels: string[];
  enabled: boolean;
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  last_check: string;
  error_message?: string;
  uptime_percentage: number;
}

export class ProductionMonitor {
  private supabase: SupabaseClient;
  private environment: string;
  private checkInterval: NodeJS.Timeout | null = null;
  private alertRules: AlertRule[] = [];
  
  // Service endpoints to monitor
  private services = {
    supabase_rest: process.env.VITE_SUPABASE_URL + '/rest/v1/health',
    supabase_functions: process.env.VITE_SUPABASE_URL + '/functions/v1',
    n8n_api: process.env.VITE_N8N_API_URL?.replace('/api/v1', '') + '/healthz',
    frontend: process.env.FRONTEND_URL || 'https://clixen.netlify.app',
    database: 'direct_pg_connection'
  };

  constructor(supabaseUrl: string, supabaseKey: string, environment = 'production') {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.environment = environment;
    this.initializeAlertRules();
  }

  /**
   * Initialize default alert rules for MVP success metrics
   */
  private initializeAlertRules() {
    this.alertRules = [
      {
        id: 'api_response_time',
        service: 'supabase_rest',
        metric: 'response_time_ms',
        operator: 'gt',
        threshold: 2000, // 2 second threshold
        duration_minutes: 5,
        severity: 'warning',
        notification_channels: ['slack', 'email'],
        enabled: true
      },
      {
        id: 'workflow_generation_time',
        service: 'ai_chat_system',
        metric: 'workflow_generation_time_ms',
        operator: 'gt',
        threshold: 30000, // 30 second threshold
        duration_minutes: 3,
        severity: 'critical',
        notification_channels: ['slack', 'email', 'pagerduty'],
        enabled: true
      },
      {
        id: 'error_rate',
        service: 'all',
        metric: 'error_rate',
        operator: 'gt',
        threshold: 0.05, // 5% error rate
        duration_minutes: 10,
        severity: 'critical',
        notification_channels: ['slack', 'email'],
        enabled: true
      },
      {
        id: 'uptime_sla',
        service: 'all',
        metric: 'uptime_percentage',
        operator: 'lt',
        threshold: 0.999, // 99.9% uptime SLA
        duration_minutes: 15,
        severity: 'critical',
        notification_channels: ['slack', 'email', 'pagerduty'],
        enabled: true
      },
      {
        id: 'database_connections',
        service: 'database',
        metric: 'active_connections',
        operator: 'gt',
        threshold: 80, // 80% of max connections
        duration_minutes: 5,
        severity: 'warning',
        notification_channels: ['slack'],
        enabled: true
      }
    ];
  }

  /**
   * Start continuous monitoring
   */
  async startMonitoring(intervalMinutes = 1) {
    console.log(`🔍 Starting production monitoring (${this.environment}) - interval: ${intervalMinutes}min`);
    
    // Immediate health check
    await this.performHealthCheck();
    
    // Set up continuous monitoring
    this.checkInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
        await this.checkMVPMetrics();
        await this.evaluateAlerts();
      } catch (error) {
        console.error('Monitoring error:', error);
        await this.recordMetric({
          service: 'monitoring_system',
          metric_name: 'monitoring_error',
          value: 1,
          unit: 'count',
          timestamp: new Date().toISOString(),
          environment: this.environment,
          tags: { error: error.message }
        });
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('📴 Stopped production monitoring');
    }
  }

  /**
   * Perform comprehensive health check of all services
   */
  async performHealthCheck(): Promise<ServiceHealth[]> {
    const healthResults: ServiceHealth[] = [];
    
    for (const [serviceName, endpoint] of Object.entries(this.services)) {
      const health = await this.checkServiceHealth(serviceName, endpoint);
      healthResults.push(health);
      
      // Record metrics
      await this.recordMetric({
        service: serviceName,
        metric_name: 'response_time_ms',
        value: health.response_time_ms,
        unit: 'milliseconds',
        timestamp: new Date().toISOString(),
        environment: this.environment
      });
      
      await this.recordMetric({
        service: serviceName,
        metric_name: 'uptime_percentage',
        value: health.uptime_percentage,
        unit: 'percentage',
        timestamp: new Date().toISOString(),
        environment: this.environment
      });
      
      // Record service status
      await this.recordServiceStatus(health);
    }
    
    return healthResults;
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(serviceName: string, endpoint: string): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (serviceName === 'database') {
        return await this.checkDatabaseHealth();
      }
      
      const response = await fetch(endpoint, {
        method: 'GET',
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Clixen-Monitor/1.0'
        }
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;
      
      return {
        service: serviceName,
        status: isHealthy ? 'healthy' : 'degraded',
        response_time_ms: responseTime,
        last_check: new Date().toISOString(),
        uptime_percentage: await this.calculateUptime(serviceName)
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: serviceName,
        status: 'down',
        response_time_ms: responseTime,
        last_check: new Date().toISOString(),
        error_message: error.message,
        uptime_percentage: await this.calculateUptime(serviceName)
      };
    }
  }

  /**
   * Check database health via direct connection
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test basic query
      const { data, error } = await this.supabase
        .from('conversations')
        .select('count', { count: 'exact' })
        .limit(1);
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        return {
          service: 'database',
          status: 'degraded',
          response_time_ms: responseTime,
          last_check: new Date().toISOString(),
          error_message: error.message,
          uptime_percentage: await this.calculateUptime('database')
        };
      }
      
      return {
        service: 'database',
        status: 'healthy',
        response_time_ms: responseTime,
        last_check: new Date().toISOString(),
        uptime_percentage: await this.calculateUptime('database')
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'database',
        status: 'down',
        response_time_ms: responseTime,
        last_check: new Date().toISOString(),
        error_message: error.message,
        uptime_percentage: await this.calculateUptime('database')
      };
    }
  }

  /**
   * Check MVP-specific success metrics
   */
  async checkMVPMetrics() {
    try {
      // User onboarding completion rate
      const onboardingRate = await this.calculateOnboardingCompletionRate();
      await this.recordMetric({
        service: 'mvp_metrics',
        metric_name: 'onboarding_completion_rate',
        value: onboardingRate,
        unit: 'percentage',
        timestamp: new Date().toISOString(),
        environment: this.environment
      });
      
      // Workflow persistence success rate
      const persistenceRate = await this.calculateWorkflowPersistenceRate();
      await this.recordMetric({
        service: 'mvp_metrics',
        metric_name: 'workflow_persistence_rate',
        value: persistenceRate,
        unit: 'percentage',
        timestamp: new Date().toISOString(),
        environment: this.environment
      });
      
      // Deployment success rate
      const deploymentRate = await this.calculateDeploymentSuccessRate();
      await this.recordMetric({
        service: 'mvp_metrics',
        metric_name: 'deployment_success_rate',
        value: deploymentRate,
        unit: 'percentage',
        timestamp: new Date().toISOString(),
        environment: this.environment
      });
      
      console.log(`📊 MVP Metrics - Onboarding: ${onboardingRate}%, Persistence: ${persistenceRate}%, Deployment: ${deploymentRate}%`);
      
    } catch (error) {
      console.error('Error collecting MVP metrics:', error);
    }
  }

  /**
   * Calculate user onboarding completion rate
   */
  private async calculateOnboardingCompletionRate(): Promise<number> {
    const { data: totalUsers } = await this.supabase
      .from('auth.users')
      .select('count', { count: 'exact' });
    
    const { data: completedUsers } = await this.supabase
      .from('projects')
      .select('user_id', { count: 'exact' })
      .not('user_id', 'is', null);
    
    if (!totalUsers || totalUsers.length === 0) return 0;
    
    const total = totalUsers[0]?.count || 0;
    const completed = completedUsers?.length || 0;
    
    return total > 0 ? (completed / total) * 100 : 0;
  }

  /**
   * Calculate workflow persistence success rate
   */
  private async calculateWorkflowPersistenceRate(): Promise<number> {
    const { data: totalWorkflows } = await this.supabase
      .from('workflows')
      .select('count', { count: 'exact' });
    
    const { data: persistedWorkflows } = await this.supabase
      .from('workflows')
      .select('count', { count: 'exact' })
      .eq('status', 'active');
    
    const total = totalWorkflows?.[0]?.count || 0;
    const persisted = persistedWorkflows?.[0]?.count || 0;
    
    return total > 0 ? (persisted / total) * 100 : 0;
  }

  /**
   * Calculate deployment success rate
   */
  private async calculateDeploymentSuccessRate(): Promise<number> {
    const { data: totalDeployments } = await this.supabase
      .from('workflow_deployments')
      .select('count', { count: 'exact' });
    
    const { data: successfulDeployments } = await this.supabase
      .from('workflow_deployments')
      .select('count', { count: 'exact' })
      .eq('status', 'success');
    
    const total = totalDeployments?.[0]?.count || 0;
    const successful = successfulDeployments?.[0]?.count || 0;
    
    return total > 0 ? (successful / total) * 100 : 0;
  }

  /**
   * Calculate service uptime percentage
   */
  private async calculateUptime(serviceName: string): Promise<number> {
    const { data: healthChecks } = await this.supabase
      .from('service_health_history')
      .select('status')
      .eq('service', serviceName)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('timestamp', { ascending: false });
    
    if (!healthChecks || healthChecks.length === 0) return 100;
    
    const healthyChecks = healthChecks.filter(check => check.status === 'healthy').length;
    return (healthyChecks / healthChecks.length) * 100;
  }

  /**
   * Record monitoring metric
   */
  async recordMetric(metric: MonitoringMetric) {
    try {
      const { error } = await this.supabase
        .from('monitoring_metrics')
        .insert([metric]);
      
      if (error) {
        console.error('Error recording metric:', error);
      }
    } catch (error) {
      console.error('Error recording metric:', error);
    }
  }

  /**
   * Record service status in history
   */
  private async recordServiceStatus(health: ServiceHealth) {
    try {
      const { error } = await this.supabase
        .from('service_health_history')
        .insert([{
          service: health.service,
          status: health.status,
          response_time_ms: health.response_time_ms,
          error_message: health.error_message,
          timestamp: health.last_check,
          environment: this.environment
        }]);
      
      if (error) {
        console.error('Error recording service status:', error);
      }
    } catch (error) {
      console.error('Error recording service status:', error);
    }
  }

  /**
   * Evaluate alert rules and trigger notifications
   */
  async evaluateAlerts() {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;
      
      try {
        const shouldAlert = await this.checkAlertCondition(rule);
        if (shouldAlert) {
          await this.triggerAlert(rule);
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Check if alert condition is met
   */
  private async checkAlertCondition(rule: AlertRule): Promise<boolean> {
    const { data: metrics } = await this.supabase
      .from('monitoring_metrics')
      .select('value, timestamp')
      .eq('service', rule.service)
      .eq('metric_name', rule.metric)
      .gte('timestamp', new Date(Date.now() - rule.duration_minutes * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });
    
    if (!metrics || metrics.length === 0) return false;
    
    // Check if condition is met for the duration
    const recentMetrics = metrics.filter(m => 
      new Date(m.timestamp).getTime() > Date.now() - rule.duration_minutes * 60 * 1000
    );
    
    if (recentMetrics.length === 0) return false;
    
    const avgValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
    
    switch (rule.operator) {
      case 'gt': return avgValue > rule.threshold;
      case 'gte': return avgValue >= rule.threshold;
      case 'lt': return avgValue < rule.threshold;
      case 'lte': return avgValue <= rule.threshold;
      case 'eq': return avgValue === rule.threshold;
      default: return false;
    }
  }

  /**
   * Trigger alert notification
   */
  private async triggerAlert(rule: AlertRule) {
    const alert = {
      rule_id: rule.id,
      service: rule.service,
      metric: rule.metric,
      threshold: rule.threshold,
      severity: rule.severity,
      message: `Alert: ${rule.service} ${rule.metric} ${rule.operator} ${rule.threshold}`,
      timestamp: new Date().toISOString(),
      environment: this.environment
    };
    
    // Record alert
    await this.supabase
      .from('monitoring_alerts')
      .insert([alert]);
    
    console.log(`🚨 ALERT [${rule.severity.toUpperCase()}]: ${alert.message}`);
    
    // Send notifications
    for (const channel of rule.notification_channels) {
      await this.sendNotification(channel, alert);
    }
  }

  /**
   * Send notification through specified channel
   */
  private async sendNotification(channel: string, alert: any) {
    switch (channel) {
      case 'slack':
        await this.sendSlackNotification(alert);
        break;
      case 'email':
        await this.sendEmailNotification(alert);
        break;
      case 'pagerduty':
        await this.sendPagerDutyNotification(alert);
        break;
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: any) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;
    
    const severityEmoji = {
      critical: '🔥',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${severityEmoji[alert.severity]} Clixen Alert`,
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${alert.severity.toUpperCase()} Alert*\n🏷️ Service: ${alert.service}\n📊 Metric: ${alert.metric}\n🎯 Threshold: ${alert.threshold}\n🕐 Time: ${alert.timestamp}\n🌐 Environment: ${alert.environment}`
            }
          }]
        })
      });
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: any) {
    // Implement email notification logic
    console.log('📧 Email notification:', alert.message);
  }

  /**
   * Send PagerDuty notification
   */
  private async sendPagerDutyNotification(alert: any) {
    // Implement PagerDuty notification logic
    console.log('📟 PagerDuty notification:', alert.message);
  }

  /**
   * Get monitoring dashboard data
   */
  async getDashboardData() {
    const [healthData, metrics, alerts] = await Promise.all([
      this.performHealthCheck(),
      this.getRecentMetrics(),
      this.getRecentAlerts()
    ]);
    
    return {
      health: healthData,
      metrics,
      alerts,
      environment: this.environment,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get recent metrics for dashboard
   */
  private async getRecentMetrics() {
    const { data: metrics } = await this.supabase
      .from('monitoring_metrics')
      .select('*')
      .eq('environment', this.environment)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(1000);
    
    return metrics || [];
  }

  /**
   * Get recent alerts for dashboard
   */
  private async getRecentAlerts() {
    const { data: alerts } = await this.supabase
      .from('monitoring_alerts')
      .select('*')
      .eq('environment', this.environment)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(100);
    
    return alerts || [];
  }
}

// Export singleton instance
export const productionMonitor = new ProductionMonitor(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  process.env.NODE_ENV || 'production'
);