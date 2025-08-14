/**
 * Usage Tracker Service - Phase 2 Implementation
 * Comprehensive usage tracking for workspace analytics and quota enforcement
 */

import { WorkspaceQuotaManager } from './workspace-quota-manager.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface UsageEvent {
  workspace_id: string;
  user_id: string;
  event_type: 'workflow_created' | 'workflow_executed' | 'workflow_deleted' | 
             'project_created' | 'api_call' | 'webhook_call' | 'login' | 'export';
  resource_id?: string;
  resource_type?: string;
  metadata?: any;
  timestamp: string;
  success: boolean;
  duration_ms?: number;
  error_message?: string;
}

export interface UsageMetrics {
  total_workflows: number;
  total_executions: number;
  total_api_calls: number;
  success_rate: number;
  avg_execution_time: number;
  active_users: number;
  storage_used: number;
  bandwidth_used: number;
  peak_usage_time: string;
  most_used_workflows: Array<{
    workflow_name: string;
    execution_count: number;
    success_rate: number;
  }>;
}

export interface PerformanceMetrics {
  response_time_p50: number;
  response_time_p95: number;
  response_time_p99: number;
  error_rate: number;
  throughput_per_minute: number;
  resource_utilization: {
    cpu_usage: number;
    memory_usage: number;
    storage_usage: number;
  };
}

export class UsageTracker {
  private supabase: any;
  private quotaManager: WorkspaceQuotaManager;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.quotaManager = new WorkspaceQuotaManager(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Track a usage event with quota enforcement
   */
  async trackEvent(event: UsageEvent): Promise<{
    tracked: boolean;
    quota_exceeded?: boolean;
    quota_message?: string;
  }> {
    try {
      // Check quota before allowing the action
      const quotaResult = await this.quotaManager.checkQuota(
        event.workspace_id,
        this.mapEventToQuotaAction(event.event_type)
      );

      if (!quotaResult.allowed) {
        console.log(`Quota exceeded for workspace ${event.workspace_id}: ${quotaResult.reason}`);
        return {
          tracked: false,
          quota_exceeded: true,
          quota_message: quotaResult.reason
        };
      }

      // Track the event
      await this.supabase
        .from('workspace_activity')
        .insert({
          workspace_id: event.workspace_id,
          user_id: event.user_id,
          activity_type: event.event_type,
          resource_type: event.resource_type || 'unknown',
          resource_id: event.resource_id,
          metadata: {
            ...event.metadata,
            success: event.success,
            duration_ms: event.duration_ms,
            error_message: event.error_message,
            tracked_at: event.timestamp
          }
        });

      // Update workspace last activity
      await this.supabase
        .from('user_workspaces')
        .update({ 
          last_active: event.timestamp,
          updated_at: event.timestamp
        })
        .eq('id', event.workspace_id);

      // Log quota usage if this is a significant event
      if (this.isSignificantEvent(event.event_type)) {
        await this.quotaManager.logActivity(
          event.workspace_id,
          event.event_type,
          event.resource_type || 'system',
          event.resource_id || 'unknown',
          {
            quota_check: quotaResult,
            performance: {
              duration_ms: event.duration_ms,
              success: event.success
            }
          }
        );
      }

      return { tracked: true };
    } catch (error) {
      console.error('Error tracking event:', error);
      return { tracked: false };
    }
  }

  /**
   * Get comprehensive usage metrics for a workspace
   */
  async getUsageMetrics(workspaceId: string, days: number = 30): Promise<UsageMetrics> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all activities in the time period
      const { data: activities } = await this.supabase
        .from('workspace_activity')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('created_at', startDate.toISOString());

      if (!activities || activities.length === 0) {
        return this.getEmptyMetrics();
      }

      // Calculate metrics
      const totalWorkflows = await this.getTotalWorkflows(workspaceId);
      const totalExecutions = activities.filter(a => a.activity_type === 'workflow_executed').length;
      const totalApiCalls = activities.filter(a => 
        ['workflow_executed', 'api_call', 'webhook_call'].includes(a.activity_type)
      ).length;

      const successfulExecutions = activities.filter(a => 
        a.activity_type === 'workflow_executed' && 
        a.metadata?.success === true
      ).length;

      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100;

      // Calculate average execution time
      const executionTimes = activities
        .filter(a => a.activity_type === 'workflow_executed' && a.metadata?.duration_ms)
        .map(a => a.metadata.duration_ms);
      
      const avgExecutionTime = executionTimes.length > 0 
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
        : 0;

      // Get unique active users
      const activeUsers = new Set(activities.map(a => a.user_id)).size;

      // Get storage usage
      const storageUsed = await this.calculateStorageUsage(workspaceId);

      // Find peak usage time
      const peakUsageTime = this.findPeakUsageTime(activities);

      // Get most used workflows
      const mostUsedWorkflows = await this.getMostUsedWorkflows(workspaceId, activities);

      return {
        total_workflows: totalWorkflows,
        total_executions: totalExecutions,
        total_api_calls: totalApiCalls,
        success_rate: Math.round(successRate * 100) / 100,
        avg_execution_time: Math.round(avgExecutionTime),
        active_users: activeUsers,
        storage_used: storageUsed,
        bandwidth_used: 0, // TODO: Implement bandwidth tracking
        peak_usage_time: peakUsageTime,
        most_used_workflows: mostUsedWorkflows
      };
    } catch (error) {
      console.error('Error getting usage metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get performance metrics for a workspace
   */
  async getPerformanceMetrics(workspaceId: string, hours: number = 24): Promise<PerformanceMetrics> {
    try {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);

      const { data: activities } = await this.supabase
        .from('workspace_activity')
        .select('metadata, created_at')
        .eq('workspace_id', workspaceId)
        .eq('activity_type', 'workflow_executed')
        .gte('created_at', startDate.toISOString());

      if (!activities || activities.length === 0) {
        return this.getEmptyPerformanceMetrics();
      }

      // Extract response times
      const responseTimes = activities
        .filter(a => a.metadata?.duration_ms)
        .map(a => a.metadata.duration_ms)
        .sort((a, b) => a - b);

      const p50 = this.calculatePercentile(responseTimes, 50);
      const p95 = this.calculatePercentile(responseTimes, 95);
      const p99 = this.calculatePercentile(responseTimes, 99);

      // Calculate error rate
      const totalRequests = activities.length;
      const errorCount = activities.filter(a => !a.metadata?.success).length;
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

      // Calculate throughput (requests per minute)
      const durationHours = hours;
      const throughputPerMinute = totalRequests / (durationHours * 60);

      return {
        response_time_p50: Math.round(p50),
        response_time_p95: Math.round(p95),
        response_time_p99: Math.round(p99),
        error_rate: Math.round(errorRate * 100) / 100,
        throughput_per_minute: Math.round(throughputPerMinute * 100) / 100,
        resource_utilization: {
          cpu_usage: 0, // TODO: Integrate with SSH monitoring
          memory_usage: 0,
          storage_usage: 0
        }
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return this.getEmptyPerformanceMetrics();
    }
  }

  /**
   * Get usage trends and forecasting
   */
  async getUsageTrends(workspaceId: string, days: number = 30): Promise<{
    workflow_growth_rate: number;
    execution_growth_rate: number;
    projected_quota_exhaustion: {
      workflows: string | null;
      executions: string | null;
      storage: string | null;
    };
    recommendations: string[];
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const midDate = new Date();
      midDate.setDate(midDate.getDate() - days / 2);

      // Get activities for trend analysis
      const [firstHalf, secondHalf] = await Promise.all([
        this.supabase
          .from('workspace_activity')
          .select('activity_type, created_at')
          .eq('workspace_id', workspaceId)
          .gte('created_at', startDate.toISOString())
          .lt('created_at', midDate.toISOString()),
        
        this.supabase
          .from('workspace_activity')
          .select('activity_type, created_at')
          .eq('workspace_id', workspaceId)
          .gte('created_at', midDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      const firstHalfWorkflows = firstHalf.data?.filter(a => a.activity_type === 'workflow_created').length || 0;
      const secondHalfWorkflows = secondHalf.data?.filter(a => a.activity_type === 'workflow_created').length || 0;
      const workflowGrowthRate = firstHalfWorkflows > 0 
        ? ((secondHalfWorkflows - firstHalfWorkflows) / firstHalfWorkflows) * 100
        : 0;

      const firstHalfExecutions = firstHalf.data?.filter(a => a.activity_type === 'workflow_executed').length || 0;
      const secondHalfExecutions = secondHalf.data?.filter(a => a.activity_type === 'workflow_executed').length || 0;
      const executionGrowthRate = firstHalfExecutions > 0
        ? ((secondHalfExecutions - firstHalfExecutions) / firstHalfExecutions) * 100
        : 0;

      // Get current quota and usage for projections
      const quotaInfo = await this.quotaManager.getWorkspaceInfo(workspaceId);
      const projections = quotaInfo ? await this.calculateExhaustionProjections(
        quotaInfo.usage,
        quotaInfo.quota,
        { workflowGrowthRate, executionGrowthRate }
      ) : null;

      // Generate recommendations
      const recommendations = this.generateUsageRecommendations(
        workflowGrowthRate,
        executionGrowthRate,
        quotaInfo
      );

      return {
        workflow_growth_rate: Math.round(workflowGrowthRate * 100) / 100,
        execution_growth_rate: Math.round(executionGrowthRate * 100) / 100,
        projected_quota_exhaustion: projections || {
          workflows: null,
          executions: null,
          storage: null
        },
        recommendations
      };
    } catch (error) {
      console.error('Error getting usage trends:', error);
      return {
        workflow_growth_rate: 0,
        execution_growth_rate: 0,
        projected_quota_exhaustion: { workflows: null, executions: null, storage: null },
        recommendations: ['Unable to generate recommendations due to data error']
      };
    }
  }

  /**
   * Generate automated usage report
   */
  async generateUsageReport(workspaceId: string, days: number = 30): Promise<{
    summary: string;
    metrics: UsageMetrics;
    performance: PerformanceMetrics;
    trends: any;
    alerts: string[];
    recommendations: string[];
  }> {
    try {
      const [metrics, performance, trends] = await Promise.all([
        this.getUsageMetrics(workspaceId, days),
        this.getPerformanceMetrics(workspaceId, 24),
        this.getUsageTrends(workspaceId, days)
      ]);

      const alerts = this.generateAlerts(metrics, performance);
      const summary = this.generateSummary(metrics, performance, trends);

      return {
        summary,
        metrics,
        performance,
        trends,
        alerts,
        recommendations: trends.recommendations
      };
    } catch (error) {
      console.error('Error generating usage report:', error);
      return {
        summary: 'Error generating report',
        metrics: this.getEmptyMetrics(),
        performance: this.getEmptyPerformanceMetrics(),
        trends: null,
        alerts: ['Report generation failed'],
        recommendations: []
      };
    }
  }

  // Private helper methods

  private mapEventToQuotaAction(eventType: string): 'create_workflow' | 'execute_workflow' | 'create_project' | 'api_call' {
    switch (eventType) {
      case 'workflow_created': return 'create_workflow';
      case 'workflow_executed': return 'execute_workflow';
      case 'project_created': return 'create_project';
      default: return 'api_call';
    }
  }

  private isSignificantEvent(eventType: string): boolean {
    return ['workflow_created', 'workflow_executed', 'project_created'].includes(eventType);
  }

  private async getTotalWorkflows(workspaceId: string): Promise<number> {
    const { count } = await this.supabase
      .from('mvp_workflows')
      .select('id', { count: 'exact' })
      .eq('workspace_id', workspaceId);
    return count || 0;
  }

  private async calculateStorageUsage(workspaceId: string): Promise<number> {
    // Simplified storage calculation
    const workflows = await this.getTotalWorkflows(workspaceId);
    return Math.round((workflows * 0.1) * 100) / 100; // Estimate 0.1MB per workflow
  }

  private findPeakUsageTime(activities: any[]): string {
    const hourlyUsage: Record<string, number> = {};
    
    activities.forEach(activity => {
      const hour = new Date(activity.created_at).getHours();
      const key = `${hour}:00`;
      hourlyUsage[key] = (hourlyUsage[key] || 0) + 1;
    });

    const peak = Object.entries(hourlyUsage)
      .sort(([,a], [,b]) => b - a)[0];
    
    return peak ? peak[0] : '12:00';
  }

  private async getMostUsedWorkflows(workspaceId: string, activities: any[]): Promise<Array<{
    workflow_name: string;
    execution_count: number;
    success_rate: number;
  }>> {
    const workflowStats: Record<string, { executions: number; successes: number }> = {};
    
    activities
      .filter(a => a.activity_type === 'workflow_executed')
      .forEach(activity => {
        const workflowId = activity.resource_id || 'unknown';
        if (!workflowStats[workflowId]) {
          workflowStats[workflowId] = { executions: 0, successes: 0 };
        }
        workflowStats[workflowId].executions++;
        if (activity.metadata?.success) {
          workflowStats[workflowId].successes++;
        }
      });

    // Get workflow names (simplified - would need to query n8n API for real names)
    return Object.entries(workflowStats)
      .map(([id, stats]) => ({
        workflow_name: `Workflow ${id.substring(0, 8)}`,
        execution_count: stats.executions,
        success_rate: stats.executions > 0 ? (stats.successes / stats.executions) * 100 : 0
      }))
      .sort((a, b) => b.execution_count - a.execution_count)
      .slice(0, 5);
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  private getEmptyMetrics(): UsageMetrics {
    return {
      total_workflows: 0,
      total_executions: 0,
      total_api_calls: 0,
      success_rate: 100,
      avg_execution_time: 0,
      active_users: 0,
      storage_used: 0,
      bandwidth_used: 0,
      peak_usage_time: '12:00',
      most_used_workflows: []
    };
  }

  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      response_time_p50: 0,
      response_time_p95: 0,
      response_time_p99: 0,
      error_rate: 0,
      throughput_per_minute: 0,
      resource_utilization: {
        cpu_usage: 0,
        memory_usage: 0,
        storage_usage: 0
      }
    };
  }

  private async calculateExhaustionProjections(usage: any, quota: any, trends: any) {
    // Simplified projection logic
    const projections = {
      workflows: null as string | null,
      executions: null as string | null,
      storage: null as string | null
    };

    if (trends.workflowGrowthRate > 0) {
      const remainingWorkflows = quota.max_workflows - usage.workflows_count;
      const weeksToExhaustion = remainingWorkflows / (trends.workflowGrowthRate / 100 * usage.workflows_count / 4);
      if (weeksToExhaustion > 0 && weeksToExhaustion < 52) {
        const exhaustionDate = new Date();
        exhaustionDate.setDate(exhaustionDate.getDate() + Math.ceil(weeksToExhaustion * 7));
        projections.workflows = exhaustionDate.toISOString().split('T')[0];
      }
    }

    return projections;
  }

  private generateUsageRecommendations(workflowGrowthRate: number, executionGrowthRate: number, quotaInfo: any): string[] {
    const recommendations: string[] = [];

    if (workflowGrowthRate > 50) {
      recommendations.push('High workflow growth detected - consider upgrading quota limits');
    }

    if (executionGrowthRate > 100) {
      recommendations.push('Execution volume growing rapidly - monitor performance closely');
    }

    if (quotaInfo && quotaInfo.usage.workflows_count / quotaInfo.quota.max_workflows > 0.8) {
      recommendations.push('Approaching workflow limit - consider cleanup or quota increase');
    }

    if (recommendations.length === 0) {
      recommendations.push('Usage patterns look healthy - no immediate action required');
    }

    return recommendations;
  }

  private generateAlerts(metrics: UsageMetrics, performance: PerformanceMetrics): string[] {
    const alerts: string[] = [];

    if (metrics.success_rate < 90) {
      alerts.push(`Low success rate: ${metrics.success_rate}% - investigate workflow failures`);
    }

    if (performance.error_rate > 10) {
      alerts.push(`High error rate: ${performance.error_rate}% - review system stability`);
    }

    if (performance.response_time_p95 > 5000) {
      alerts.push(`Slow response times: P95 ${performance.response_time_p95}ms - performance optimization needed`);
    }

    return alerts;
  }

  private generateSummary(metrics: UsageMetrics, performance: PerformanceMetrics, trends: any): string {
    return `Workspace processed ${metrics.total_executions} workflow executions with ${metrics.success_rate}% success rate. 
            Average response time: ${performance.response_time_p50}ms. 
            Growth trends: ${trends.workflow_growth_rate}% workflow growth, ${trends.execution_growth_rate}% execution growth.`;
  }
}