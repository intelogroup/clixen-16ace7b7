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
}