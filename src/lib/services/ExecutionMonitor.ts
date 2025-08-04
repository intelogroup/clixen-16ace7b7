/**
 * Execution Monitoring Service
 * Tracks workflow executions and updates Supabase in real-time
 */

import { supabase } from '../supabase';

export interface ExecutionStatus {
  id: string;
  workflowId: string;
  userId: string;
  status: 'queued' | 'running' | 'success' | 'error' | 'timeout';
  startedAt?: Date;
  completedAt?: Date;
  executionTime?: number;
  nodeCount?: number;
  errorMessage?: string;
  outputData?: any;
}

export class ExecutionMonitor {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly POLL_INTERVAL = 3000; // 3 seconds
  private readonly MAX_POLL_DURATION = 300000; // 5 minutes

  /**
   * Start monitoring a workflow execution
   */
  async startMonitoring(executionId: string, workflowId: string, userId: string) {
    // Create initial execution record
    const { data, error } = await supabase
      .from('workflow_executions')
      .insert({
        id: executionId,
        workflow_id: workflowId,
        user_id: userId,
        status: 'queued',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create execution record:', error);
      return;
    }

    // Start polling for long-running workflows
    this.startPolling(executionId, workflowId, userId);

    return data;
  }

  /**
   * Poll n8n for execution status
   */
  private startPolling(executionId: string, workflowId: string, userId: string) {
    const startTime = Date.now();

    const interval = setInterval(async () => {
      try {
        // Check if we've exceeded max polling duration
        if (Date.now() - startTime > this.MAX_POLL_DURATION) {
          await this.updateExecutionStatus(executionId, {
            status: 'timeout',
            errorMessage: 'Execution timed out after 5 minutes',
          });
          this.stopPolling(executionId);
          return;
        }

        // Poll n8n for status
        const n8nStatus = await this.fetchN8nExecutionStatus(executionId);

        if (n8nStatus.finished) {
          // Update Supabase with final status
          await this.updateExecutionStatus(executionId, {
            status: n8nStatus.status === 'success' ? 'success' : 'error',
            completedAt: new Date(),
            executionTime: n8nStatus.executionTime,
            nodeCount: n8nStatus.nodeCount,
            outputData: n8nStatus.data,
            errorMessage: n8nStatus.error,
          });

          // Stop polling
          this.stopPolling(executionId);

          // Notify user via real-time
          await this.notifyUser(userId, executionId, n8nStatus.status);

          // Update user quotas
          await this.updateUserQuota(userId);
        } else if (n8nStatus.status === 'running') {
          // Update status to running if not already
          await this.updateExecutionStatus(executionId, {
            status: 'running',
            startedAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
        await this.updateExecutionStatus(executionId, {
          status: 'error',
          errorMessage: `Monitoring failed: ${error}`,
        });
        this.stopPolling(executionId);
      }
    }, this.POLL_INTERVAL);

    this.pollingIntervals.set(executionId, interval);
  }

  /**
   * Stop polling for a specific execution
   */
  private stopPolling(executionId: string) {
    const interval = this.pollingIntervals.get(executionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(executionId);
    }
  }

  /**
   * Fetch execution status from n8n
   */
  private async fetchN8nExecutionStatus(executionId: string) {
    const n8nUrl = process.env.VITE_N8N_API_URL || 'http://18.221.12.50:5678/api/v1';
    const n8nApiKey = process.env.VITE_N8N_API_KEY;

    const response = await fetch(`${n8nUrl}/executions/${executionId}?includeData=true`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch execution status: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      finished: data.finished,
      status: data.status,
      executionTime: data.executionTime,
      nodeCount: data.data?.resultData?.runData ? Object.keys(data.data.resultData.runData).length : 0,
      data: data.data?.resultData?.lastNodeExecuted,
      error: data.data?.resultData?.error,
    };
  }

  /**
   * Update execution status in Supabase
   */
  private async updateExecutionStatus(executionId: string, updates: Partial<ExecutionStatus>) {
    const { error } = await supabase
      .from('workflow_executions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    if (error) {
      console.error('Failed to update execution status:', error);
    }
  }

  /**
   * Send real-time notification to user
   */
  private async notifyUser(userId: string, executionId: string, status: string) {
    // Insert notification for real-time subscription
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'execution_complete',
      data: {
        executionId,
        status,
      },
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Update user quota after execution
   */
  private async updateUserQuota(userId: string) {
    const { data: quota } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (quota) {
      const now = new Date();
      const resetDate = new Date(quota.reset_at);

      // Reset weekly counter if needed
      if (now > resetDate) {
        await supabase
          .from('user_quotas')
          .update({
            executions_this_week: 1,
            reset_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            total_executions: quota.total_executions + 1,
          })
          .eq('user_id', userId);
      } else {
        // Increment counters
        await supabase
          .from('user_quotas')
          .update({
            executions_this_week: quota.executions_this_week + 1,
            total_executions: quota.total_executions + 1,
          })
          .eq('user_id', userId);
      }
    }
  }

  /**
   * Handle webhook callback from n8n (alternative to polling)
   */
  async handleN8nCallback(executionId: string, result: any) {
    // Update execution with final result
    await this.updateExecutionStatus(executionId, {
      status: result.success ? 'success' : 'error',
      completedAt: new Date(),
      outputData: result.data,
      errorMessage: result.error,
      executionTime: result.executionTime,
    });

    // Stop polling if active
    this.stopPolling(executionId);
  }

  /**
   * Get execution history for a user
   */
  async getUserExecutions(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch user executions:', error);
      return [];
    }

    return data;
  }

  /**
   * Clean up old polling intervals on shutdown
   */
  cleanup() {
    for (const [executionId, interval] of this.pollingIntervals.entries()) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();
  }
}

// Singleton instance
export const executionMonitor = new ExecutionMonitor();

// Cleanup on process exit
process.on('SIGINT', () => executionMonitor.cleanup());
process.on('SIGTERM', () => executionMonitor.cleanup());