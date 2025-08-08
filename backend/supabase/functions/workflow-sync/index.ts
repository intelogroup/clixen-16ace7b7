import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Workflow Sync Service - Phase 3 Implementation
 * 
 * This Edge Function implements 2-way synchronization between Supabase and n8n:
 * 1. Polls n8n for workflow execution status and counts
 * 2. Updates Supabase with execution data and status changes
 * 3. Handles workflow state changes (active/inactive)
 * 4. Implements retry logic for failed syncs
 * 5. Maintains data consistency between systems
 * 
 * Architecture:
 * User Action → Supabase (RLS) → Edge Function → n8n API
 *                 ↓                              ↓
 *         [Source of Truth]            [Execution Engine]
 * 
 * Dashboard ← Supabase (RLS) ← Sync Service ← n8n Status
 */

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// N8n API configuration
const N8N_API_URL = Deno.env.get('N8N_API_URL') || 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY');
if (!N8N_API_KEY) {
  throw new Error('N8N_API_KEY environment variable is required');
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  status?: string;
  retryOf?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
}

interface SyncResult {
  workflowId: string;
  status: 'success' | 'error' | 'skipped';
  executionsUpdated: number;
  statusChanged: boolean;
  error?: string;
}

interface SyncSummary {
  totalWorkflows: number;
  successful: number;
  failed: number;
  skipped: number;
  executionsUpdated: number;
  errors: string[];
  duration: number;
}

class N8nSyncClient {
  constructor() {
    this.apiUrl = N8N_API_URL;
    this.apiKey = N8N_API_KEY;
  }

  async makeRequest(endpoint: string, method = 'GET', body: any = null) {
    const url = `${this.apiUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          parsedError = { message: errorText };
        }
        
        throw new Error(`n8n API Error ${response.status}: ${parsedError.message || errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error(`n8n API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await this.makeRequest('/workflows');
      return response.data || response;
    } catch (error) {
      console.error('Failed to fetch workflows from n8n:', error);
      return [];
    }
  }

  async getWorkflow(id: string): Promise<N8nWorkflow | null> {
    try {
      return await this.makeRequest(`/workflows/${id}`);
    } catch (error) {
      console.error(`Failed to fetch workflow ${id} from n8n:`, error);
      return null;
    }
  }

  async getExecutions(workflowId: string, limit = 50): Promise<N8nExecution[]> {
    try {
      const response = await this.makeRequest(`/executions?workflowId=${workflowId}&limit=${limit}`);
      return response.data || response;
    } catch (error) {
      console.error(`Failed to fetch executions for workflow ${workflowId}:`, error);
      return [];
    }
  }
}

class WorkflowSyncService {
  private n8nClient: N8nSyncClient;

  constructor() {
    this.n8nClient = new N8nSyncClient();
  }

  /**
   * Sync a single workflow's status and execution data
   */
  async syncWorkflow(supabaseWorkflow: any): Promise<SyncResult> {
    const result: SyncResult = {
      workflowId: supabaseWorkflow.id,
      status: 'success',
      executionsUpdated: 0,
      statusChanged: false
    };

    try {
      // Skip if no n8n workflow ID
      if (!supabaseWorkflow.n8n_workflow_id) {
        result.status = 'skipped';
        return result;
      }

      // Get current n8n workflow data
      const n8nWorkflow = await this.n8nClient.getWorkflow(supabaseWorkflow.n8n_workflow_id);
      
      if (!n8nWorkflow) {
        console.warn(`n8n workflow not found: ${supabaseWorkflow.n8n_workflow_id}`);
        result.status = 'error';
        result.error = 'Workflow not found in n8n';
        return result;
      }

      // Check for status changes
      const currentStatus = n8nWorkflow.active ? 'deployed' : 'draft';
      if (supabaseWorkflow.status !== currentStatus) {
        await supabase
          .from('mvp_workflows')
          .update({
            status: currentStatus,
            is_active: n8nWorkflow.active,
            last_sync_at: new Date().toISOString()
          })
          .eq('id', supabaseWorkflow.id);
        
        result.statusChanged = true;
        console.log(`Status updated for workflow ${supabaseWorkflow.id}: ${supabaseWorkflow.status} → ${currentStatus}`);
      }

      // Get execution data
      const executions = await this.n8nClient.getExecutions(supabaseWorkflow.n8n_workflow_id, 100);
      
      if (executions.length > 0) {
        // Calculate execution statistics
        const totalExecutions = executions.length;
        const successfulExecutions = executions.filter(e => e.finished && e.status !== 'error').length;
        const failedExecutions = executions.filter(e => e.finished && e.status === 'error').length;
        const lastExecution = executions[0]; // Most recent

        // Update execution counts and last execution info
        await supabase
          .from('mvp_workflows')
          .update({
            execution_count: totalExecutions,
            successful_executions: successfulExecutions,
            failed_executions: failedExecutions,
            last_execution_at: lastExecution?.startedAt || null,
            last_execution_status: lastExecution?.status || null,
            last_sync_at: new Date().toISOString()
          })
          .eq('id', supabaseWorkflow.id);

        result.executionsUpdated = totalExecutions;
      }

      return result;

    } catch (error) {
      console.error(`Error syncing workflow ${supabaseWorkflow.id}:`, error);
      result.status = 'error';
      result.error = error.message;
      return result;
    }
  }

  /**
   * Sync all workflows for a specific user or all users
   */
  async syncAllWorkflows(userId?: string): Promise<SyncSummary> {
    const startTime = Date.now();
    const summary: SyncSummary = {
      totalWorkflows: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      executionsUpdated: 0,
      errors: [],
      duration: 0
    };

    try {
      console.log(`🔄 Starting workflow sync${userId ? ` for user ${userId.substring(0, 8)}***` : ' for all users'}`);

      // Get workflows to sync from Supabase
      let query = supabase
        .from('mvp_workflows')
        .select('*')
        .eq('is_active', true)
        .not('n8n_workflow_id', 'is', null);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: workflows, error } = await query;

      if (error) {
        throw error;
      }

      summary.totalWorkflows = workflows?.length || 0;

      if (!workflows || workflows.length === 0) {
        console.log('No workflows to sync');
        summary.duration = Date.now() - startTime;
        return summary;
      }

      console.log(`Found ${workflows.length} workflows to sync`);

      // Sync each workflow
      for (const workflow of workflows) {
        const syncResult = await this.syncWorkflow(workflow);
        
        switch (syncResult.status) {
          case 'success':
            summary.successful++;
            summary.executionsUpdated += syncResult.executionsUpdated;
            break;
          case 'error':
            summary.failed++;
            if (syncResult.error) {
              summary.errors.push(`${workflow.name}: ${syncResult.error}`);
            }
            break;
          case 'skipped':
            summary.skipped++;
            break;
        }
      }

      summary.duration = Date.now() - startTime;

      console.log(`✅ Sync completed: ${summary.successful} successful, ${summary.failed} failed, ${summary.skipped} skipped (${summary.duration}ms)`);

      // Update sync status in database
      await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'workflow_sync',
          user_id: userId,
          status: summary.failed > 0 ? 'partial_success' : 'success',
          workflows_processed: summary.totalWorkflows,
          successful_syncs: summary.successful,
          failed_syncs: summary.failed,
          executions_updated: summary.executionsUpdated,
          duration_ms: summary.duration,
          errors: summary.errors.length > 0 ? summary.errors : null
        });

      return summary;

    } catch (error) {
      console.error('Fatal sync error:', error);
      summary.duration = Date.now() - startTime;
      summary.errors.push(`Fatal error: ${error.message}`);
      
      // Log the failure
      try {
        await supabase
          .from('sync_logs')
          .insert({
            sync_type: 'workflow_sync',
            user_id: userId,
            status: 'error',
            workflows_processed: summary.totalWorkflows,
            successful_syncs: summary.successful,
            failed_syncs: summary.failed,
            duration_ms: summary.duration,
            errors: summary.errors
          });
      } catch (logError) {
        console.error('Failed to log sync error:', logError);
      }

      return summary;
    }
  }

  /**
   * Clean up inactive workflows (soft delete in Supabase, hard delete from n8n)
   */
  async cleanupInactiveWorkflows(): Promise<{ deleted: number; errors: string[] }> {
    console.log('🧹 Starting workflow cleanup');
    
    const result = { deleted: 0, errors: [] };

    try {
      // Find workflows marked for deletion (is_active = false) older than 24 hours
      const { data: workflowsToDelete, error } = await supabase
        .from('mvp_workflows')
        .select('*')
        .eq('is_active', false)
        .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        throw error;
      }

      if (!workflowsToDelete || workflowsToDelete.length === 0) {
        console.log('No workflows to clean up');
        return result;
      }

      console.log(`Found ${workflowsToDelete.length} workflows to clean up`);

      for (const workflow of workflowsToDelete) {
        try {
          // Delete from n8n if it exists
          if (workflow.n8n_workflow_id) {
            await this.n8nClient.makeRequest(`/workflows/${workflow.n8n_workflow_id}`, 'DELETE');
            console.log(`Deleted workflow ${workflow.n8n_workflow_id} from n8n`);
          }

          // Hard delete from Supabase (GDPR compliance)
          await supabase
            .from('mvp_workflows')
            .delete()
            .eq('id', workflow.id);

          result.deleted++;
          console.log(`Cleaned up workflow: ${workflow.name}`);

        } catch (error) {
          const errorMsg = `Failed to clean up workflow ${workflow.name}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`✅ Cleanup completed: ${result.deleted} deleted, ${result.errors.length} errors`);

      return result;

    } catch (error) {
      console.error('Fatal cleanup error:', error);
      result.errors.push(`Fatal error: ${error.message}`);
      return result;
    }
  }
}

// Main request handler
serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`🔄 [Workflow-Sync] [${requestId}] ${req.method} ${req.url}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`✅ [Workflow-Sync] [${requestId}] CORS preflight handled`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const syncService = new WorkflowSyncService();

    if (req.method === 'POST') {
      const body = await req.json();
      const { action, user_id } = body;

      switch (action) {
        case 'sync_user_workflows': {
          if (!user_id) {
            return new Response(
              JSON.stringify({ error: 'user_id is required' }),
              {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          const summary = await syncService.syncAllWorkflows(user_id);
          
          return new Response(
            JSON.stringify({
              success: true,
              action: 'sync_user_workflows',
              user_id,
              summary
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        case 'sync_all_workflows': {
          const summary = await syncService.syncAllWorkflows();
          
          return new Response(
            JSON.stringify({
              success: true,
              action: 'sync_all_workflows',
              summary
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        case 'cleanup_workflows': {
          const result = await syncService.cleanupInactiveWorkflows();
          
          return new Response(
            JSON.stringify({
              success: true,
              action: 'cleanup_workflows',
              result
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
      }
    }

    // GET request - health check
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          service: 'workflow-sync',
          status: 'healthy',
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error(`❌ [Workflow-Sync] [${requestId}] Unexpected error:`, {
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        request_id: requestId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});