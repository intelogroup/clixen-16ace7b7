/**
 * Workspace Quota Manager - Phase 2 Implementation
 * Handles quota enforcement, usage tracking, and resource management
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface WorkspaceQuota {
  max_workflows: number;
  max_executions: number;
  storage_mb: number;
  max_projects: number;
  max_api_calls_per_day?: number;
  max_webhook_calls_per_day?: number;
}

export interface WorkspaceUsage {
  workflows_count: number;
  executions_count: number;
  storage_used_mb: number;
  projects_count: number;
  api_calls_today: number;
  webhook_calls_today: number;
  last_calculated: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  current_usage: Partial<WorkspaceUsage>;
  quota_limits: Partial<WorkspaceQuota>;
  usage_percentage: number;
}

export class WorkspaceQuotaManager {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get workspace quota and usage information
   */
  async getWorkspaceInfo(workspaceId: string): Promise<{
    quota: WorkspaceQuota;
    usage: WorkspaceUsage;
  } | null> {
    try {
      const { data: workspace, error } = await this.supabase
        .from('user_workspaces')
        .select('quota, metadata')
        .eq('id', workspaceId)
        .single();

      if (error || !workspace) {
        console.error('Error fetching workspace:', error);
        return null;
      }

      // Get current usage
      const usage = await this.calculateCurrentUsage(workspaceId);

      return {
        quota: workspace.quota as WorkspaceQuota,
        usage: usage
      };
    } catch (error) {
      console.error('Error in getWorkspaceInfo:', error);
      return null;
    }
  }

  /**
   * Calculate current workspace usage
   */
  async calculateCurrentUsage(workspaceId: string): Promise<WorkspaceUsage> {
    try {
      // Get workflow count
      const { count: workflowCount } = await this.supabase
        .from('mvp_workflows')
        .select('id', { count: 'exact' })
        .eq('workspace_id', workspaceId);

      // Get project count
      const { count: projectCount } = await this.supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('workspace_id', workspaceId);

      // Get execution count (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: executionCount } = await this.supabase
        .from('workspace_activity')
        .select('id', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .eq('activity_type', 'workflow_executed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get API calls today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: apiCallsToday } = await this.supabase
        .from('workspace_activity')
        .select('id', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .in('activity_type', ['workflow_executed', 'api_call'])
        .gte('created_at', today.toISOString());

      // Estimate storage usage (simplified for Phase 2)
      const estimatedStorageMB = (workflowCount || 0) * 0.1 + (executionCount || 0) * 0.01;

      return {
        workflows_count: workflowCount || 0,
        executions_count: executionCount || 0,
        storage_used_mb: Math.round(estimatedStorageMB * 100) / 100,
        projects_count: projectCount || 0,
        api_calls_today: apiCallsToday || 0,
        webhook_calls_today: 0, // TODO: Implement webhook tracking
        last_calculated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating usage:', error);
      return {
        workflows_count: 0,
        executions_count: 0,
        storage_used_mb: 0,
        projects_count: 0,
        api_calls_today: 0,
        webhook_calls_today: 0,
        last_calculated: new Date().toISOString()
      };
    }
  }

  /**
   * Check if a specific action is allowed within quota limits
   */
  async checkQuota(
    workspaceId: string, 
    action: 'create_workflow' | 'execute_workflow' | 'create_project' | 'api_call'
  ): Promise<QuotaCheckResult> {
    const info = await this.getWorkspaceInfo(workspaceId);
    
    if (!info) {
      return {
        allowed: false,
        reason: 'Workspace not found',
        current_usage: {},
        quota_limits: {},
        usage_percentage: 100
      };
    }

    const { quota, usage } = info;

    switch (action) {
      case 'create_workflow':
        if (usage.workflows_count >= quota.max_workflows) {
          return {
            allowed: false,
            reason: `Workflow limit exceeded (${usage.workflows_count}/${quota.max_workflows})`,
            current_usage: { workflows_count: usage.workflows_count },
            quota_limits: { max_workflows: quota.max_workflows },
            usage_percentage: (usage.workflows_count / quota.max_workflows) * 100
          };
        }
        break;

      case 'execute_workflow':
        if (usage.executions_count >= quota.max_executions) {
          return {
            allowed: false,
            reason: `Execution limit exceeded (${usage.executions_count}/${quota.max_executions})`,
            current_usage: { executions_count: usage.executions_count },
            quota_limits: { max_executions: quota.max_executions },
            usage_percentage: (usage.executions_count / quota.max_executions) * 100
          };
        }
        break;

      case 'create_project':
        if (usage.projects_count >= quota.max_projects) {
          return {
            allowed: false,
            reason: `Project limit exceeded (${usage.projects_count}/${quota.max_projects})`,
            current_usage: { projects_count: usage.projects_count },
            quota_limits: { max_projects: quota.max_projects },
            usage_percentage: (usage.projects_count / quota.max_projects) * 100
          };
        }
        break;

      case 'api_call':
        const dailyLimit = quota.max_api_calls_per_day || 1000;
        if (usage.api_calls_today >= dailyLimit) {
          return {
            allowed: false,
            reason: `Daily API limit exceeded (${usage.api_calls_today}/${dailyLimit})`,
            current_usage: { api_calls_today: usage.api_calls_today },
            quota_limits: { max_api_calls_per_day: dailyLimit },
            usage_percentage: (usage.api_calls_today / dailyLimit) * 100
          };
        }
        break;
    }

    // Check storage quota
    if (usage.storage_used_mb >= quota.storage_mb) {
      return {
        allowed: false,
        reason: `Storage limit exceeded (${usage.storage_used_mb}MB/${quota.storage_mb}MB)`,
        current_usage: { storage_used_mb: usage.storage_used_mb },
        quota_limits: { storage_mb: quota.storage_mb },
        usage_percentage: (usage.storage_used_mb / quota.storage_mb) * 100
      };
    }

    return {
      allowed: true,
      current_usage: usage,
      quota_limits: quota,
      usage_percentage: this.calculateOverallUsage(usage, quota)
    };
  }

  /**
   * Update quota for a workspace
   */
  async updateWorkspaceQuota(workspaceId: string, newQuota: Partial<WorkspaceQuota>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_workspaces')
        .update({ 
          quota: newQuota,
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId);

      if (error) {
        console.error('Error updating quota:', error);
        return false;
      }

      // Log quota change
      await this.logActivity(workspaceId, 'quota_updated', 'workspace', workspaceId, {
        new_quota: newQuota,
        updated_at: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error in updateWorkspaceQuota:', error);
      return false;
    }
  }

  /**
   * Log workspace activity for usage tracking
   */
  async logActivity(
    workspaceId: string,
    activityType: string,
    resourceType: string,
    resourceId: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      // Get user_id from workspace
      const { data: workspace } = await this.supabase
        .from('user_workspaces')
        .select('user_id')
        .eq('id', workspaceId)
        .single();

      if (!workspace) return;

      await this.supabase
        .from('workspace_activity')
        .insert({
          workspace_id: workspaceId,
          user_id: workspace.user_id,
          activity_type: activityType,
          resource_type: resourceType,
          resource_id: resourceId,
          metadata: metadata
        });

      // Update workspace last_active
      await this.supabase
        .from('user_workspaces')
        .update({ last_active: new Date().toISOString() })
        .eq('id', workspaceId);

    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  /**
   * Get workspace usage analytics
   */
  async getWorkspaceAnalytics(workspaceId: string, days: number = 30): Promise<{
    daily_executions: Array<{ date: string; count: number }>;
    workflow_performance: Array<{ workflow_name: string; success_rate: number; avg_duration: number }>;
    resource_trends: {
      workflows_growth: number;
      executions_growth: number;
      storage_growth: number;
    };
    quota_alerts: Array<{ resource: string; usage_percentage: number; alert_level: 'warning' | 'critical' }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get daily executions
      const { data: activities } = await this.supabase
        .from('workspace_activity')
        .select('created_at')
        .eq('workspace_id', workspaceId)
        .eq('activity_type', 'workflow_executed')
        .gte('created_at', startDate.toISOString());

      // Group by date
      const dailyExecutions = this.groupActivitiesByDate(activities || []);

      // Get current usage for quota alerts
      const usage = await this.calculateCurrentUsage(workspaceId);
      const info = await this.getWorkspaceInfo(workspaceId);
      const quota = info?.quota || {} as WorkspaceQuota;

      const quotaAlerts = this.generateQuotaAlerts(usage, quota);

      return {
        daily_executions: dailyExecutions,
        workflow_performance: [], // TODO: Implement with n8n execution data
        resource_trends: {
          workflows_growth: 0, // TODO: Calculate growth
          executions_growth: 0,
          storage_growth: 0
        },
        quota_alerts: quotaAlerts
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return {
        daily_executions: [],
        workflow_performance: [],
        resource_trends: { workflows_growth: 0, executions_growth: 0, storage_growth: 0 },
        quota_alerts: []
      };
    }
  }

  /**
   * Get quota recommendations based on usage patterns
   */
  async getQuotaRecommendations(workspaceId: string): Promise<{
    recommended_quota: WorkspaceQuota;
    reasoning: string[];
    cost_impact: 'increase' | 'decrease' | 'neutral';
  }> {
    const info = await this.getWorkspaceInfo(workspaceId);
    if (!info) {
      return {
        recommended_quota: {
          max_workflows: 50,
          max_executions: 1000,
          storage_mb: 100,
          max_projects: 10
        },
        reasoning: ['Unable to analyze usage - using defaults'],
        cost_impact: 'neutral'
      };
    }

    const { usage, quota } = info;
    const reasoning: string[] = [];
    const recommended: WorkspaceQuota = { ...quota };

    // Analyze workflows
    const workflowUsage = usage.workflows_count / quota.max_workflows;
    if (workflowUsage > 0.8) {
      recommended.max_workflows = Math.ceil(quota.max_workflows * 1.5);
      reasoning.push(`High workflow usage (${Math.round(workflowUsage * 100)}%) - recommend increasing limit`);
    }

    // Analyze executions
    const executionUsage = usage.executions_count / quota.max_executions;
    if (executionUsage > 0.9) {
      recommended.max_executions = Math.ceil(quota.max_executions * 2);
      reasoning.push(`High execution usage (${Math.round(executionUsage * 100)}%) - recommend increasing limit`);
    }

    // Analyze storage
    const storageUsage = usage.storage_used_mb / quota.storage_mb;
    if (storageUsage > 0.8) {
      recommended.storage_mb = Math.ceil(quota.storage_mb * 1.5);
      reasoning.push(`High storage usage (${Math.round(storageUsage * 100)}%) - recommend increasing limit`);
    }

    const costImpact = JSON.stringify(recommended) === JSON.stringify(quota) 
      ? 'neutral' 
      : 'increase' as 'increase' | 'decrease' | 'neutral';

    return {
      recommended_quota: recommended,
      reasoning: reasoning.length > 0 ? reasoning : ['Current quotas are sufficient'],
      cost_impact: costImpact
    };
  }

  // Private helper methods

  private calculateOverallUsage(usage: WorkspaceUsage, quota: WorkspaceQuota): number {
    const percentages = [
      usage.workflows_count / quota.max_workflows,
      usage.executions_count / quota.max_executions,
      usage.storage_used_mb / quota.storage_mb,
      usage.projects_count / quota.max_projects
    ];

    return Math.round(Math.max(...percentages) * 100);
  }

  private groupActivitiesByDate(activities: any[]): Array<{ date: string; count: number }> {
    const grouped = activities.reduce((acc, activity) => {
      const date = new Date(activity.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private generateQuotaAlerts(usage: WorkspaceUsage, quota: WorkspaceQuota): Array<{
    resource: string;
    usage_percentage: number;
    alert_level: 'warning' | 'critical';
  }> {
    const alerts = [];

    const checks = [
      { resource: 'workflows', usage: usage.workflows_count, limit: quota.max_workflows },
      { resource: 'executions', usage: usage.executions_count, limit: quota.max_executions },
      { resource: 'storage', usage: usage.storage_used_mb, limit: quota.storage_mb },
      { resource: 'projects', usage: usage.projects_count, limit: quota.max_projects }
    ];

    for (const check of checks) {
      const percentage = (check.usage / check.limit) * 100;
      if (percentage >= 90) {
        alerts.push({
          resource: check.resource,
          usage_percentage: Math.round(percentage),
          alert_level: 'critical'
        });
      } else if (percentage >= 75) {
        alerts.push({
          resource: check.resource,
          usage_percentage: Math.round(percentage),
          alert_level: 'warning'
        });
      }
    }

    return alerts;
  }
}

// Default quota configurations
export const DEFAULT_QUOTAS = {
  free: {
    max_workflows: 10,
    max_executions: 100,
    storage_mb: 50,
    max_projects: 3,
    max_api_calls_per_day: 500
  } as WorkspaceQuota,
  
  basic: {
    max_workflows: 50,
    max_executions: 1000,
    storage_mb: 100,
    max_projects: 10,
    max_api_calls_per_day: 2000
  } as WorkspaceQuota,
  
  pro: {
    max_workflows: 200,
    max_executions: 10000,
    storage_mb: 500,
    max_projects: 50,
    max_api_calls_per_day: 10000
  } as WorkspaceQuota
};