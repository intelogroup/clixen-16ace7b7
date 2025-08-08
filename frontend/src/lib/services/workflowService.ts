/**
 * Workflow Service for MVP
 * Handles all workflow operations with proper user isolation
 */

import { supabase } from '../supabase';

export interface UserWorkflow {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'deployed' | 'error' | 'archived';
  n8n_workflow_id?: string;
  webhook_url?: string;
  created_at: string;
  last_accessed_at?: string;
  execution_count?: number;
  is_active?: boolean;
  project_name?: string;
  project_id?: string;
}

export class WorkflowService {
  /**
   * Fetch all workflows for the current authenticated user
   * Uses Supabase RLS to ensure user isolation
   */
  static async getUserWorkflows(): Promise<UserWorkflow[]> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User not authenticated');
        return [];
      }

      // Fetch workflows from Supabase (RLS ensures only user's workflows)
      const { data, error } = await supabase
        .from('mvp_workflows')
        .select(`
          id,
          name,
          description,
          status,
          n8n_workflow_id,
          webhook_url,
          created_at,
          last_accessed_at,
          execution_count,
          is_active,
          project_id,
          projects!left(name)
        `)
        .eq('is_active', true)
        .order('last_accessed_at', { ascending: false });

      if (error) {
        console.error('Error fetching workflows:', error);
        return [];
      }

      // Transform data for dashboard display
      return (data || []).map(workflow => ({
        ...workflow,
        project_name: workflow.projects?.name || 'No Project'
      }));
    } catch (error) {
      console.error('Workflow fetch error:', error);
      return [];
    }
  }

  /**
   * Get workflows for a specific project
   */
  static async getProjectWorkflows(projectId: string): Promise<UserWorkflow[]> {
    try {
      const { data, error } = await supabase
        .from('mvp_workflows')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project workflows:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Project workflow fetch error:', error);
      return [];
    }
  }

  /**
   * Update workflow access time (for tracking)
   */
  static async touchWorkflow(workflowId: string): Promise<void> {
    try {
      await supabase
        .from('mvp_workflows')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', workflowId);
    } catch (error) {
      console.error('Error updating workflow access time:', error);
    }
  }

  /**
   * Archive a workflow (soft delete)
   */
  static async archiveWorkflow(workflowId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mvp_workflows')
        .update({ is_active: false, status: 'archived' })
        .eq('id', workflowId);

      return !error;
    } catch (error) {
      console.error('Error archiving workflow:', error);
      return false;
    }
  }

  /**
   * Get workflow statistics for dashboard
   */
  static async getWorkflowStats(): Promise<{
    total: number;
    deployed: number;
    draft: number;
    error: number;
  }> {
    try {
      const workflows = await this.getUserWorkflows();
      
      return {
        total: workflows.length,
        deployed: workflows.filter(w => w.status === 'deployed').length,
        draft: workflows.filter(w => w.status === 'draft').length,
        error: workflows.filter(w => w.status === 'error').length
      };
    } catch (error) {
      console.error('Error getting workflow stats:', error);
      return { total: 0, deployed: 0, draft: 0, error: 0 };
    }
  }

  /**
   * Check if user has reached workflow limit (for MVP quota management)
   */
  static async checkWorkflowQuota(limit: number = 10): Promise<boolean> {
    try {
      const workflows = await this.getUserWorkflows();
      return workflows.length < limit;
    } catch (error) {
      console.error('Error checking workflow quota:', error);
      return false;
    }
  }

  /**
   * Sync user workflows with n8n (2-way sync implementation)
   * Calls the workflow-sync Edge Function to update execution data
   */
  static async syncUserWorkflows(): Promise<{
    success: boolean;
    summary?: any;
    error?: string;
  }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Call workflow-sync Edge Function
      const { data, error } = await supabase.functions.invoke('workflow-sync', {
        body: {
          action: 'sync_user_workflows',
          user_id: user.id
        }
      });

      if (error) {
        console.error('Sync function error:', error);
        return { success: false, error: error.message };
      }

      console.log('Workflow sync completed:', data.summary);
      return { success: true, summary: data.summary };

    } catch (error) {
      console.error('Error syncing workflows:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start real-time sync for workflow updates
   * Sets up Supabase Realtime subscription for workflow changes
   */
  static setupRealtimeSync(onUpdate: (workflow: UserWorkflow) => void): () => void {
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: NodeJS.Timeout | null = null;

    const setupSubscription = (): (() => void) => {
      try {
        console.log(`Setting up realtime subscription (attempt ${retryCount + 1})`);

        // Subscribe to workflow updates for the current user
        const subscription = supabase
          .channel(`workflow_changes_${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'mvp_workflows'
            },
            (payload) => {
              console.log('Realtime workflow update:', payload);
              
              try {
                // Transform the updated data to match our UserWorkflow interface
                if (payload.new) {
                  const workflow: UserWorkflow = {
                    id: payload.new.id,
                    name: payload.new.name,
                    description: payload.new.description,
                    status: payload.new.status,
                    n8n_workflow_id: payload.new.n8n_workflow_id,
                    webhook_url: payload.new.webhook_url,
                    created_at: payload.new.created_at,
                    last_accessed_at: payload.new.last_accessed_at,
                    execution_count: payload.new.execution_count,
                    is_active: payload.new.is_active,
                    project_id: payload.new.project_id
                  };

                  onUpdate(workflow);
                }
              } catch (updateError) {
                console.error('Error processing realtime update:', updateError);
                // Continue processing despite individual update errors
              }
            }
          )
          .subscribe((status) => {
            console.log('Realtime subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime sync connected');
              retryCount = 0; // Reset retry count on successful connection
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('❌ Realtime sync error, will retry...', status);
              
              if (retryCount < maxRetries) {
                retryCount++;
                retryTimeout = setTimeout(() => {
                  console.log(`Retrying realtime connection (${retryCount}/${maxRetries})`);
                  cleanup();
                  setupSubscription();
                }, Math.pow(2, retryCount) * 1000); // Exponential backoff
              } else {
                console.error('❌ Realtime sync failed after maximum retries');
              }
            }
          });

        // Return cleanup function
        return () => {
          console.log('Cleaning up realtime subscription');
          if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
          }
          supabase.removeChannel(subscription);
        };

      } catch (error) {
        console.error('Error setting up realtime sync:', error);
        
        // Retry with exponential backoff if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          retryCount++;
          retryTimeout = setTimeout(() => {
            console.log(`Retrying realtime setup (${retryCount}/${maxRetries})`);
            setupSubscription();
          }, Math.pow(2, retryCount) * 1000);
        }
        
        return () => {
          if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
          }
        }; // Return no-op cleanup function
      }
    };

    // Initial setup
    const cleanup = setupSubscription();

    // Return main cleanup function
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      cleanup();
    };
  }

  /**
   * Force refresh workflow data from n8n
   * Triggers a sync and returns updated workflow data
   */
  static async refreshWorkflowData(workflowId: string): Promise<{
    success: boolean;
    workflow?: UserWorkflow;
    error?: string;
  }> {
    try {
      // First trigger a sync
      const syncResult = await this.syncUserWorkflows();
      
      if (!syncResult.success) {
        return { success: false, error: syncResult.error };
      }

      // Then fetch the updated workflow
      const { data, error } = await supabase
        .from('mvp_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const workflow: UserWorkflow = {
        id: data.id,
        name: data.name,
        description: data.description,
        status: data.status,
        n8n_workflow_id: data.n8n_workflow_id,
        webhook_url: data.webhook_url,
        created_at: data.created_at,
        last_accessed_at: data.last_accessed_at,
        execution_count: data.execution_count,
        is_active: data.is_active,
        project_id: data.project_id
      };

      return { success: true, workflow };

    } catch (error) {
      console.error('Error refreshing workflow data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get workflow execution statistics
   */
  static async getWorkflowExecutionStats(workflowId: string): Promise<{
    success: boolean;
    stats?: {
      total: number;
      successful: number;
      failed: number;
      lastExecution?: string;
      lastExecutionStatus?: string;
    };
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('mvp_workflows')
        .select('execution_count, successful_executions, failed_executions, last_execution_at, last_execution_status')
        .eq('id', workflowId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        stats: {
          total: data.execution_count || 0,
          successful: data.successful_executions || 0,
          failed: data.failed_executions || 0,
          lastExecution: data.last_execution_at,
          lastExecutionStatus: data.last_execution_status
        }
      };

    } catch (error) {
      console.error('Error getting execution stats:', error);
      return { success: false, error: error.message };
    }
  }
}