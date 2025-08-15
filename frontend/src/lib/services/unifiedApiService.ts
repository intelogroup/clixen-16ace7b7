/**
 * Unified API Service
 * Consolidates all API interactions into a single, maintainable service
 * Eliminates duplication across 60+ files
 */

import { supabase } from '../supabase';
import { Logger } from '../monitoring/Logger';

// Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface WorkflowData {
  name: string;
  nodes: any[];
  connections: any;
  settings?: any;
  meta?: any;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  workflow_json?: any;
  n8n_workflow_id?: string;
  status: 'draft' | 'deployed' | 'active' | 'error';
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Unified API Service Class
 * Single source of truth for all API operations
 */
export class UnifiedApiService {
  private static instance: UnifiedApiService;
  private logger = new Logger('UnifiedApiService');

  private constructor() {}

  /**
   * Singleton pattern to ensure single instance
   */
  public static getInstance(): UnifiedApiService {
    if (!UnifiedApiService.instance) {
      UnifiedApiService.instance = new UnifiedApiService();
    }
    return UnifiedApiService.instance;
  }

  /**
   * Get current authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      this.logger.error('Failed to get auth token', error);
      return null;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { data: user, error: null };
    } catch (error) {
      this.logger.error('Failed to get current user', error);
      return { data: null, error: error.message };
    }
  }

  // ==========================================
  // AUTHENTICATION SERVICES
  // ==========================================

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      this.logger.info('User signed in successfully');
      return { data, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Sign in failed', error);
      return { 
        data: null, 
        error: error.message || 'Authentication failed',
        status: 401 
      };
    }
  }

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, metadata?: any): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;

      this.logger.info('User signed up successfully');
      return { data, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Sign up failed', error);
      return { 
        data: null, 
        error: error.message || 'Registration failed',
        status: 400 
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<ApiResponse> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      this.logger.info('User signed out successfully');
      return { data: null, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Sign out failed', error);
      return { 
        data: null, 
        error: error.message || 'Sign out failed',
        status: 400 
      };
    }
  }

  // ==========================================
  // CHAT & AI SERVICES
  // ==========================================

  /**
   * Send message to AI chat (consolidated from multiple implementations)
   */
  async sendChatMessage(
    message: string, 
    conversationId?: string,
    projectId?: string
  ): Promise<ApiResponse> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) {
        throw new Error('User not authenticated');
      }

      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      // Try MCP-enhanced function first, fallback to standard
      let response = await supabase.functions.invoke('ai-chat-simple-mcp', {
        body: {
          message,
          conversationId: conversationId || crypto.randomUUID(),
          projectId: projectId || 'default-project',
          userId: userData.id,
          user_id: userData.id // Support both formats
        }
      });

      // Fallback to standard function if MCP not available
      if (response.error?.message?.includes('NOT_FOUND')) {
        this.logger.info('MCP function not found, using standard chat');
        response = await supabase.functions.invoke('ai-chat-simple', {
          body: {
            message,
            user_id: userData.id,
            session_id: conversationId
          }
        });
      }

      if (response.error) throw response.error;

      return { 
        data: response.data, 
        error: null, 
        status: 200 
      };
    } catch (error) {
      this.logger.error('Chat message failed', error);
      return { 
        data: null, 
        error: error.message || 'Failed to send message',
        status: 500 
      };
    }
  }

  // ==========================================
  // PROJECT SERVICES
  // ==========================================

  /**
   * Get user's projects
   */
  async getProjects(): Promise<ApiResponse<Project[]>> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Failed to fetch projects', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  /**
   * Create new project
   */
  async createProject(name: string, description?: string): Promise<ApiResponse<Project>> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name,
          description,
          user_id: userData.id
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Project created successfully');
      return { data, error: null, status: 201 };
    } catch (error) {
      this.logger.error('Failed to create project', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<ApiResponse<Project>> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .eq('user_id', userData.id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Failed to update project', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<ApiResponse> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userData.id);

      if (error) throw error;

      return { data: null, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Failed to delete project', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  // ==========================================
  // WORKFLOW SERVICES
  // ==========================================

  /**
   * Get workflows for a project
   */
  async getWorkflows(projectId?: string): Promise<ApiResponse<Workflow[]>> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      let query = supabase
        .from('workflows')
        .select('*')
        .eq('user_id', userData.id);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Failed to fetch workflows', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  /**
   * Create workflow (consolidated from multiple services)
   */
  async createWorkflow(
    name: string,
    projectId: string,
    workflowData: WorkflowData,
    description?: string
  ): Promise<ApiResponse<Workflow>> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      // Apply user isolation naming
      const isolatedName = `[USR-${userData.id.substring(0, 8)}] ${name}`;
      workflowData.name = isolatedName;

      // Store in database
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          name: isolatedName,
          description,
          workflow_json: workflowData,
          project_id: projectId,
          user_id: userData.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Workflow created successfully');
      return { data, error: null, status: 201 };
    } catch (error) {
      this.logger.error('Failed to create workflow', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  /**
   * Deploy workflow to n8n
   */
  async deployWorkflow(workflowId: string): Promise<ApiResponse> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      // Get workflow data
      const { data: workflow, error: fetchError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('user_id', userData.id)
        .single();

      if (fetchError || !workflow) {
        throw new Error('Workflow not found');
      }

      // Deploy to n8n via Edge Function
      const { data, error } = await supabase.functions.invoke('workflow-deployment', {
        body: {
          workflow: workflow.workflow_json,
          workflowId: workflowId,
          userId: userData.id
        }
      });

      if (error) throw error;

      // Update workflow status
      await supabase
        .from('workflows')
        .update({ 
          status: 'deployed',
          n8n_workflow_id: data.n8nWorkflowId 
        })
        .eq('id', workflowId);

      return { data, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Failed to deploy workflow', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string): Promise<ApiResponse> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId)
        .eq('user_id', userData.id);

      if (error) throw error;

      return { data: null, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Failed to delete workflow', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  // ==========================================
  // CONVERSATION SERVICES
  // ==========================================

  /**
   * Get conversations for a project
   */
  async getConversations(projectId?: string): Promise<ApiResponse> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      let query = supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userData.id);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Failed to fetch conversations', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  /**
   * Save conversation
   */
  async saveConversation(
    messages: ChatMessage[],
    projectId: string,
    workflowId?: string
  ): Promise<ApiResponse> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          messages: JSON.stringify(messages),
          project_id: projectId,
          workflow_id: workflowId,
          user_id: userData.id,
          title: messages[0]?.content.substring(0, 50) || 'New Conversation'
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null, status: 201 };
    } catch (error) {
      this.logger.error('Failed to save conversation', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  // ==========================================
  // N8N INTEGRATION SERVICES
  // ==========================================

  /**
   * Get n8n workflows
   */
  async getN8nWorkflows(): Promise<ApiResponse> {
    try {
      const n8nUrl = 'https://n8nio-n8n-7xzf6n.sliplane.app/api/v1';
      const n8nApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';

      const response = await fetch(`${n8nUrl}/workflows`, {
        headers: {
          'X-N8N-API-KEY': n8nApiKey
        }
      });

      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status}`);
      }

      const data = await response.json();
      return { data, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Failed to fetch n8n workflows', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  /**
   * Execute n8n workflow
   */
  async executeN8nWorkflow(workflowId: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('workflow-execution', {
        body: {
          workflowId,
          action: 'execute'
        }
      });

      if (error) throw error;

      return { data, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Failed to execute workflow', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { data } = await this.getCurrentUser();
    return !!data;
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<ApiResponse> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userData.id)
        .single();

      if (error) throw error;

      return { data, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Failed to fetch user profile', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: any): Promise<ApiResponse> {
    try {
      const { data: userData } = await this.getCurrentUser();
      if (!userData) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userData.id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null, status: 200 };
    } catch (error) {
      this.logger.error('Failed to update user profile', error);
      return { 
        data: null, 
        error: error.message,
        status: 500 
      };
    }
  }
}

// Export singleton instance
export const apiService = UnifiedApiService.getInstance();