/**
 * Project-Aware Workflow Service for Clixen
 * Integrates with the enhanced backend system for complete project/folder organization
 */

import { supabase } from '../supabase';

export interface ProjectAwareWorkflow {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  project_id: string;
  folder_id: string;
  project_name?: string;
  execution_count: number;
  last_execution?: string;
  status: 'active' | 'inactive' | 'error';
}

export interface UserAssignment {
  project_number: number;
  folder_tag_name: string;
  user_slot: number;
  assigned_at: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  number: number;
}

export interface FolderInfo {
  id: string;
  name: string;
  project_number: number;
  user_slot: number;
}

export class ProjectAwareWorkflowService {
  /**
   * Get workflows with complete project/folder context
   */
  static async getUserWorkflowsWithProjects(
    projectId?: string,
    folderId?: string
  ): Promise<{
    success: boolean;
    workflows: ProjectAwareWorkflow[];
    user_assignment: UserAssignment | null;
    available_projects: ProjectInfo[];
    available_folders: FolderInfo[];
    total_workflows: number;
    active_workflows: number;
    error?: string;
  }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          workflows: [],
          user_assignment: null,
          available_projects: [],
          available_folders: [],
          total_workflows: 0,
          active_workflows: 0,
          error: 'User not authenticated'
        };
      }

      // Call the enhanced workflows Edge Function
      const { data, error } = await supabase.functions.invoke('workflows-enhanced', {
        body: { 
          user_id: user.id,
          project_id: projectId,
          folder_id: folderId
        }
      });

      if (error) {
        console.error('Enhanced workflows error:', error);
        return {
          success: false,
          workflows: [],
          user_assignment: null,
          available_projects: [],
          available_folders: [],
          total_workflows: 0,
          active_workflows: 0,
          error: error.message
        };
      }

      return {
        success: true,
        workflows: data.workflows || [],
        user_assignment: data.user_assignment,
        available_projects: data.available_projects || [],
        available_folders: data.available_folders || [],
        total_workflows: data.total_workflows || 0,
        active_workflows: data.active_workflows || 0
      };

    } catch (error) {
      console.error('Project-aware workflow fetch error:', error);
      return {
        success: false,
        workflows: [],
        user_assignment: null,
        available_projects: [],
        available_folders: [],
        total_workflows: 0,
        active_workflows: 0,
        error: error.message
      };
    }
  }

  /**
   * Assign workflow to user's project/folder automatically
   */
  static async assignWorkflowToProject(
    workflowId: string,
    workflowName?: string
  ): Promise<{
    success: boolean;
    assignment?: {
      project_id: string;
      folder_id: string;
      project_number: number;
      user_slot: number;
    };
    error?: string;
  }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { 
          success: false, 
          error: 'User not authenticated' 
        };
      }

      // Call the workflow assignment Edge Function
      const { data, error } = await supabase.functions.invoke('workflow-assignment', {
        body: {
          workflow_id: workflowId,
          user_id: user.id,
          workflow_name: workflowName
        }
      });

      if (error) {
        console.error('Workflow assignment error:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }

      console.log('✅ Workflow assigned successfully:', data.assignment);
      
      return {
        success: true,
        assignment: data.assignment
      };

    } catch (error) {
      console.error('Assignment error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get user's project assignment status
   */
  static async getUserProjectStatus(): Promise<{
    success: boolean;
    is_assigned: boolean;
    assignment?: UserAssignment;
    available_capacity?: number;
    error?: string;
  }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { 
          success: false, 
          is_assigned: false,
          error: 'User not authenticated' 
        };
      }

      // Check user's folder assignment
      const { data: assignment, error } = await supabase
        .from('folder_assignments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking user assignment:', error);
        return { 
          success: false, 
          is_assigned: false,
          error: error.message 
        };
      }

      // Get available capacity
      const { count: availableCount } = await supabase
        .from('folder_assignments')
        .select('*', { count: 'exact' })
        .is('user_id', null)
        .eq('status', 'available');

      return {
        success: true,
        is_assigned: !!assignment,
        assignment: assignment ? {
          project_number: assignment.project_number,
          folder_tag_name: assignment.folder_tag_name,
          user_slot: assignment.user_slot,
          assigned_at: assignment.assigned_at
        } : undefined,
        available_capacity: availableCount || 0
      };

    } catch (error) {
      console.error('Project status error:', error);
      return { 
        success: false, 
        is_assigned: false,
        error: error.message 
      };
    }
  }

  /**
   * Get workflow assignment details
   */
  static async getWorkflowAssignment(workflowId: string): Promise<{
    success: boolean;
    assignment?: {
      project_id: string;
      folder_id: string;
      assigned_at: string;
      status: string;
    };
    error?: string;
  }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { 
          success: false, 
          error: 'User not authenticated' 
        };
      }

      const { data, error } = await supabase
        .from('workflow_assignments')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return { 
            success: true, 
            assignment: undefined 
          };
        }
        return { 
          success: false, 
          error: error.message 
        };
      }

      return {
        success: true,
        assignment: {
          project_id: data.project_id,
          folder_id: data.folder_id,
          assigned_at: data.assigned_at,
          status: data.status
        }
      };

    } catch (error) {
      console.error('Workflow assignment fetch error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Filter workflows by project
   */
  static async getProjectWorkflows(projectId: string): Promise<{
    success: boolean;
    workflows: ProjectAwareWorkflow[];
    error?: string;
  }> {
    const result = await this.getUserWorkflowsWithProjects(projectId);
    return {
      success: result.success,
      workflows: result.workflows,
      error: result.error
    };
  }

  /**
   * Filter workflows by folder
   */
  static async getFolderWorkflows(folderId: string): Promise<{
    success: boolean;
    workflows: ProjectAwareWorkflow[];
    error?: string;
  }> {
    const result = await this.getUserWorkflowsWithProjects(undefined, folderId);
    return {
      success: result.success,
      workflows: result.workflows,
      error: result.error
    };
  }

  /**
   * Get project statistics
   */
  static async getProjectStats(): Promise<{
    success: boolean;
    stats?: {
      total_projects: number;
      total_folders: number;
      assigned_folders: number;
      available_folders: number;
      user_workflows: number;
      user_project?: string;
    };
    error?: string;
  }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { 
          success: false, 
          error: 'User not authenticated' 
        };
      }

      // Get folder statistics
      const { count: totalFolders } = await supabase
        .from('folder_assignments')
        .select('*', { count: 'exact' });

      const { count: assignedFolders } = await supabase
        .from('folder_assignments')
        .select('*', { count: 'exact' })
        .not('user_id', 'is', null);

      const { count: availableFolders } = await supabase
        .from('folder_assignments')
        .select('*', { count: 'exact' })
        .is('user_id', null);

      // Get user's workflow count
      const { count: userWorkflows } = await supabase
        .from('workflow_assignments')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'active');

      // Get user's project assignment
      const { data: userAssignment } = await supabase
        .from('folder_assignments')
        .select('project_number')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      return {
        success: true,
        stats: {
          total_projects: 10, // Fixed number of projects
          total_folders: totalFolders || 0,
          assigned_folders: assignedFolders || 0,
          available_folders: availableFolders || 0,
          user_workflows: userWorkflows || 0,
          user_project: userAssignment ? `CLIXEN-PROJ-${userAssignment.project_number.toString().padStart(2, '0')}` : undefined
        }
      };

    } catch (error) {
      console.error('Project stats error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}