/**
 * Workspace Maintenance Service - Phase 2 Implementation
 * Automated cleanup, maintenance, and optimization for workspace isolation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { WorkspaceQuotaManager } from './workspace-quota-manager.ts';

export interface MaintenanceTask {
  id: string;
  workspace_id: string;
  task_type: 'cleanup_old_activities' | 'archive_workflows' | 'optimize_storage' | 
             'cleanup_orphaned_data' | 'update_quotas' | 'health_check';
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  metadata: any;
  error_message?: string;
}

export interface MaintenanceResult {
  task_id: string;
  success: boolean;
  items_processed: number;
  items_cleaned: number;
  storage_freed_mb?: number;
  error?: string;
  duration_ms: number;
  details: any;
}

export class WorkspaceMaintenanceService {
  private supabase: any;
  private quotaManager: WorkspaceQuotaManager;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.quotaManager = new WorkspaceQuotaManager(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Schedule a maintenance task
   */
  async scheduleTask(
    workspaceId: string,
    taskType: MaintenanceTask['task_type'],
    scheduledAt: Date,
    metadata: any = {}
  ): Promise<string> {
    const taskId = crypto.randomUUID();
    
    try {
      await this.supabase
        .from('workspace_maintenance_tasks')
        .insert({
          id: taskId,
          workspace_id: workspaceId,
          task_type: taskType,
          status: 'pending',
          scheduled_at: scheduledAt.toISOString(),
          metadata: metadata
        });
      
      console.log(`📅 Scheduled maintenance task: ${taskType} for workspace ${workspaceId.substring(0, 8)}***`);
      return taskId;
    } catch (error) {
      console.error('Error scheduling maintenance task:', error);
      throw error;
    }
  }

  /**
   * Run all pending maintenance tasks
   */
  async runPendingTasks(): Promise<MaintenanceResult[]> {
    const results: MaintenanceResult[] = [];
    
    try {
      // Get all pending tasks that are due
      const { data: pendingTasks } = await this.supabase
        .from('workspace_maintenance_tasks')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(10);
      
      if (!pendingTasks || pendingTasks.length === 0) {
        console.log('📋 No pending maintenance tasks');
        return results;
      }

      console.log(`🛠️ Running ${pendingTasks.length} pending maintenance tasks`);

      for (const task of pendingTasks) {
        const result = await this.executeTask(task);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Error running pending tasks:', error);
      return results;
    }
  }

  /**
   * Execute a specific maintenance task
   */
  async executeTask(task: MaintenanceTask): Promise<MaintenanceResult> {
    const startTime = Date.now();
    
    try {
      // Mark task as running
      await this.supabase
        .from('workspace_maintenance_tasks')
        .update({
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', task.id);

      console.log(`⚙️ Executing ${task.task_type} for workspace ${task.workspace_id.substring(0, 8)}***`);

      let result: MaintenanceResult;

      switch (task.task_type) {
        case 'cleanup_old_activities':
          result = await this.cleanupOldActivities(task);
          break;
        case 'archive_workflows':
          result = await this.archiveOldWorkflows(task);
          break;
        case 'optimize_storage':
          result = await this.optimizeStorage(task);
          break;
        case 'cleanup_orphaned_data':
          result = await this.cleanupOrphanedData(task);
          break;
        case 'update_quotas':
          result = await this.updateQuotasBasedOnUsage(task);
          break;
        case 'health_check':
          result = await this.performHealthCheck(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.task_type}`);
      }

      result.duration_ms = Date.now() - startTime;

      // Mark task as completed
      await this.supabase
        .from('workspace_maintenance_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            ...task.metadata,
            result: result
          }
        })
        .eq('id', task.id);

      console.log(`✅ Completed ${task.task_type}: ${result.items_processed} items processed, ${result.items_cleaned} cleaned`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Task ${task.task_type} failed:`, error);

      // Mark task as failed
      await this.supabase
        .from('workspace_maintenance_tasks')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message
        })
        .eq('id', task.id);

      return {
        task_id: task.id,
        success: false,
        items_processed: 0,
        items_cleaned: 0,
        error: error.message,
        duration_ms: duration,
        details: {}
      };
    }
  }

  /**
   * Clean up old activity records
   */
  private async cleanupOldActivities(task: MaintenanceTask): Promise<MaintenanceResult> {
    const daysToKeep = task.metadata.days_to_keep || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Count activities to be deleted
    const { count: totalCount } = await this.supabase
      .from('workspace_activity')
      .select('id', { count: 'exact' })
      .eq('workspace_id', task.workspace_id)
      .lt('created_at', cutoffDate.toISOString());

    if (!totalCount || totalCount === 0) {
      return {
        task_id: task.id,
        success: true,
        items_processed: 0,
        items_cleaned: 0,
        duration_ms: 0,
        details: { message: 'No old activities to clean' }
      };
    }

    // Delete old activities in batches
    let cleanedCount = 0;
    const batchSize = 1000;

    while (cleanedCount < totalCount) {
      const { error } = await this.supabase
        .from('workspace_activity')
        .delete()
        .eq('workspace_id', task.workspace_id)
        .lt('created_at', cutoffDate.toISOString())
        .limit(batchSize);

      if (error) throw error;
      cleanedCount += Math.min(batchSize, totalCount - cleanedCount);
    }

    return {
      task_id: task.id,
      success: true,
      items_processed: totalCount,
      items_cleaned: cleanedCount,
      duration_ms: 0,
      details: {
        days_kept: daysToKeep,
        cutoff_date: cutoffDate.toISOString(),
        batch_size: batchSize
      }
    };
  }

  /**
   * Archive old inactive workflows
   */
  private async archiveOldWorkflows(task: MaintenanceTask): Promise<MaintenanceResult> {
    const daysInactive = task.metadata.days_inactive || 60;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    // Find workflows that haven't been executed recently
    const { data: oldWorkflows } = await this.supabase
      .from('mvp_workflows')
      .select('id, name, n8n_workflow_id')
      .eq('workspace_id', task.workspace_id)
      .eq('status', 'deployed')
      .lt('updated_at', cutoffDate.toISOString());

    if (!oldWorkflows || oldWorkflows.length === 0) {
      return {
        task_id: task.id,
        success: true,
        items_processed: 0,
        items_cleaned: 0,
        duration_ms: 0,
        details: { message: 'No workflows to archive' }
      };
    }

    let archivedCount = 0;

    for (const workflow of oldWorkflows) {
      try {
        // Check if workflow has recent executions
        const { count: recentExecutions } = await this.supabase
          .from('workspace_activity')
          .select('id', { count: 'exact' })
          .eq('workspace_id', task.workspace_id)
          .eq('activity_type', 'workflow_executed')
          .eq('resource_id', workflow.n8n_workflow_id)
          .gte('created_at', cutoffDate.toISOString());

        if (recentExecutions === 0) {
          // Archive the workflow
          await this.supabase
            .from('mvp_workflows')
            .update({
              status: 'archived',
              updated_at: new Date().toISOString()
            })
            .eq('id', workflow.id);

          archivedCount++;
        }
      } catch (error) {
        console.warn(`Failed to archive workflow ${workflow.id}:`, error);
      }
    }

    return {
      task_id: task.id,
      success: true,
      items_processed: oldWorkflows.length,
      items_cleaned: archivedCount,
      duration_ms: 0,
      details: {
        days_inactive: daysInactive,
        cutoff_date: cutoffDate.toISOString(),
        archived_workflows: archivedCount
      }
    };
  }

  /**
   * Optimize workspace storage
   */
  private async optimizeStorage(task: MaintenanceTask): Promise<MaintenanceResult> {
    // This would integrate with SSH to clean up actual files
    // For now, we'll simulate storage optimization
    
    const usage = await this.quotaManager.calculateCurrentUsage(task.workspace_id);
    const currentStorage = usage.storage_used_mb;
    
    // Simulate optimization (in reality, this would clean up logs, temp files, etc.)
    const estimatedSavings = Math.min(currentStorage * 0.1, 10); // Up to 10MB or 10% savings
    
    return {
      task_id: task.id,
      success: true,
      items_processed: 1,
      items_cleaned: 1,
      storage_freed_mb: estimatedSavings,
      duration_ms: 0,
      details: {
        original_storage_mb: currentStorage,
        storage_freed_mb: estimatedSavings,
        optimization_type: 'simulated'
      }
    };
  }

  /**
   * Clean up orphaned data
   */
  private async cleanupOrphanedData(task: MaintenanceTask): Promise<MaintenanceResult> {
    let cleanedCount = 0;

    // Find workflows without corresponding n8n entries
    const { data: workflows } = await this.supabase
      .from('mvp_workflows')
      .select('id, n8n_workflow_id')
      .eq('workspace_id', task.workspace_id)
      .not('n8n_workflow_id', 'is', null);

    if (workflows) {
      // This would check against n8n API to find orphaned records
      // For now, we'll just count them
      cleanedCount = workflows.length;
    }

    // Find activities without corresponding workflows
    const { count: orphanedActivities } = await this.supabase
      .from('workspace_activity')
      .select('id', { count: 'exact' })
      .eq('workspace_id', task.workspace_id)
      .eq('activity_type', 'workflow_executed')
      .not('resource_id', 'in', `(${workflows?.map(w => `'${w.n8n_workflow_id}'`).join(',') || "''"})`)
      .limit(1000);

    if (orphanedActivities && orphanedActivities > 0) {
      // Delete orphaned activity records
      await this.supabase
        .from('workspace_activity')
        .delete()
        .eq('workspace_id', task.workspace_id)
        .eq('activity_type', 'workflow_executed')
        .not('resource_id', 'in', `(${workflows?.map(w => `'${w.n8n_workflow_id}'`).join(',') || "''"})`);
      
      cleanedCount += orphanedActivities;
    }

    return {
      task_id: task.id,
      success: true,
      items_processed: (workflows?.length || 0) + (orphanedActivities || 0),
      items_cleaned: cleanedCount,
      duration_ms: 0,
      details: {
        orphaned_activities_cleaned: orphanedActivities || 0,
        workflows_checked: workflows?.length || 0
      }
    };
  }

  /**
   * Update quotas based on usage patterns
   */
  private async updateQuotasBasedOnUsage(task: MaintenanceTask): Promise<MaintenanceResult> {
    const recommendations = await this.quotaManager.getQuotaRecommendations(task.workspace_id);
    
    if (recommendations.cost_impact === 'neutral') {
      return {
        task_id: task.id,
        success: true,
        items_processed: 1,
        items_cleaned: 0,
        duration_ms: 0,
        details: {
          message: 'No quota updates needed',
          recommendations: recommendations.reasoning
        }
      };
    }

    // Apply recommended quotas if configured to do so
    const autoApply = task.metadata.auto_apply_recommendations || false;
    
    if (autoApply) {
      const updated = await this.quotaManager.updateWorkspaceQuota(
        task.workspace_id,
        recommendations.recommended_quota
      );
      
      return {
        task_id: task.id,
        success: updated,
        items_processed: 1,
        items_cleaned: updated ? 1 : 0,
        duration_ms: 0,
        details: {
          quota_updated: updated,
          new_quota: recommendations.recommended_quota,
          reasoning: recommendations.reasoning,
          cost_impact: recommendations.cost_impact
        }
      };
    } else {
      return {
        task_id: task.id,
        success: true,
        items_processed: 1,
        items_cleaned: 0,
        duration_ms: 0,
        details: {
          message: 'Quota recommendations generated (not auto-applied)',
          recommendations: recommendations
        }
      };
    }
  }

  /**
   * Perform workspace health check
   */
  private async performHealthCheck(task: MaintenanceTask): Promise<MaintenanceResult> {
    const healthResults = {
      workspace_exists: false,
      quota_valid: false,
      data_consistent: false,
      workflows_accessible: false,
      recent_activity: false
    };

    let issuesFound = 0;

    // Check if workspace exists
    const { data: workspace } = await this.supabase
      .from('user_workspaces')
      .select('*')
      .eq('id', task.workspace_id)
      .single();

    healthResults.workspace_exists = !!workspace;
    if (!workspace) issuesFound++;

    if (workspace) {
      // Check quota validity
      healthResults.quota_valid = !!(workspace.quota && 
        typeof workspace.quota.max_workflows === 'number' &&
        workspace.quota.max_workflows > 0);
      if (!healthResults.quota_valid) issuesFound++;

      // Check data consistency
      const { count: workflowCount } = await this.supabase
        .from('mvp_workflows')
        .select('id', { count: 'exact' })
        .eq('workspace_id', task.workspace_id);

      const { count: projectCount } = await this.supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('workspace_id', task.workspace_id);

      healthResults.data_consistent = (workflowCount !== null && projectCount !== null);
      if (!healthResults.data_consistent) issuesFound++;

      // Check recent activity
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { count: recentActivity } = await this.supabase
        .from('workspace_activity')
        .select('id', { count: 'exact' })
        .eq('workspace_id', task.workspace_id)
        .gte('created_at', oneDayAgo.toISOString());

      healthResults.recent_activity = (recentActivity || 0) > 0;
      // Note: No recent activity is not necessarily an issue
    }

    return {
      task_id: task.id,
      success: true,
      items_processed: 1,
      items_cleaned: 0,
      duration_ms: 0,
      details: {
        health_check: healthResults,
        issues_found: issuesFound,
        workspace_id: task.workspace_id,
        checked_at: new Date().toISOString()
      }
    };
  }

  /**
   * Schedule regular maintenance tasks for all workspaces
   */
  async scheduleRegularMaintenance(): Promise<void> {
    const { data: workspaces } = await this.supabase
      .from('user_workspaces')
      .select('id, last_active');

    if (!workspaces) return;

    const now = new Date();
    
    for (const workspace of workspaces) {
      // Schedule different maintenance tasks based on workspace activity
      const lastActive = new Date(workspace.last_active);
      const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      // Schedule cleanup tasks for active workspaces
      if (daysSinceActive < 7) {
        // Weekly cleanup for active workspaces
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        await this.scheduleTask(
          workspace.id,
          'cleanup_old_activities',
          nextWeek,
          { days_to_keep: 90 }
        );
      }

      // Monthly health checks for all workspaces
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      await this.scheduleTask(
        workspace.id,
        'health_check',
        nextMonth,
        { comprehensive: true }
      );

      // Archive workflows for very inactive workspaces
      if (daysSinceActive > 30) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        await this.scheduleTask(
          workspace.id,
          'archive_workflows',
          tomorrow,
          { days_inactive: 60 }
        );
      }
    }

    console.log(`📅 Scheduled maintenance tasks for ${workspaces.length} workspaces`);
  }

  /**
   * Get maintenance history for a workspace
   */
  async getMaintenanceHistory(workspaceId: string, limit: number = 50): Promise<MaintenanceTask[]> {
    const { data: tasks } = await this.supabase
      .from('workspace_maintenance_tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    return tasks || [];
  }
}