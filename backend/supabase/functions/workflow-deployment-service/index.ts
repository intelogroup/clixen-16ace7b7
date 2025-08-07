import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticate } from '../_shared/auth.ts';

// Types
interface DeploymentRequest {
  workflowId: string;
  activate?: boolean;
  testMode?: boolean;
  rollbackOnFailure?: boolean;
}

interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  n8nWorkflowId?: string;
  status: 'pending' | 'validating' | 'deploying' | 'deployed' | 'failed' | 'rolled_back';
  validationResults?: ValidationResult;
  deploymentUrl?: string;
  webhookUrl?: string;
  error?: string;
  warnings?: string[];
  rollbackAvailable?: boolean;
  estimatedCompletionTime?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  confidence: number;
  complexity: 'simple' | 'medium' | 'complex';
  requiredPermissions: string[];
  estimatedExecutionTime: string;
}

interface RollbackRequest {
  deploymentId: string;
  reason?: string;
}

interface HealthCheckResult {
  healthy: boolean;
  services: {
    n8n: boolean;
    database: boolean;
    mcp: boolean;
  };
  metrics: {
    activeWorkflows: number;
    recentDeployments: number;
    averageDeploymentTime: number;
    errorRate: number;
  };
  timestamp: string;
}

// Configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const n8nApiUrl = Deno.env.get('N8N_API_URL') || 'http://18.221.12.50:5678/api/v1';
const n8nApiKey = Deno.env.get('N8N_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Deployment service class
class WorkflowDeploymentService {
  private deploymentQueue = new Map<string, DeploymentResult>();
  
  async deployWorkflow(
    userId: string,
    request: DeploymentRequest
  ): Promise<DeploymentResult> {
    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize deployment record
    const deployment: DeploymentResult = {
      success: false,
      deploymentId,
      status: 'pending',
      rollbackAvailable: false,
      estimatedCompletionTime: this.estimateCompletionTime()
    };

    this.deploymentQueue.set(deploymentId, deployment);

    try {
      // Step 1: Get workflow from database
      const workflow = await this.getWorkflow(userId, request.workflowId);
      
      // Step 2: Comprehensive validation
      deployment.status = 'validating';
      this.deploymentQueue.set(deploymentId, { ...deployment });
      
      const validationResult = await this.validateWorkflowComprehensive(workflow);
      deployment.validationResults = validationResult;
      
      if (!validationResult.valid) {
        deployment.status = 'failed';
        deployment.error = `Validation failed: ${validationResult.errors.join(', ')}`;
        deployment.warnings = validationResult.warnings;
        await this.recordDeployment(userId, request.workflowId, deployment);
        return deployment;
      }

      // Step 3: Pre-deployment checks
      await this.performPreDeploymentChecks();

      // Step 4: Deploy to n8n (or simulate in test mode)
      deployment.status = 'deploying';
      this.deploymentQueue.set(deploymentId, { ...deployment });

      let deployResult;
      if (request.testMode) {
        deployResult = await this.simulateDeployment(workflow);
      } else {
        deployResult = await this.deployToN8n(workflow, request.activate || false);
      }

      if (deployResult.success) {
        deployment.success = true;
        deployment.status = 'deployed';
        deployment.n8nWorkflowId = deployResult.workflowId;
        deployment.deploymentUrl = deployResult.deploymentUrl;
        deployment.webhookUrl = deployResult.webhookUrl;
        deployment.rollbackAvailable = !request.testMode;

        // Update workflow status in database
        await this.updateWorkflowStatus(
          request.workflowId, 
          'deployed', 
          deployResult.workflowId,
          deployment.deploymentUrl
        );

        // Create execution tracking
        if (!request.testMode) {
          await this.setupExecutionTracking(deployment.n8nWorkflowId!, workflow);
        }

      } else {
        deployment.status = 'failed';
        deployment.error = deployResult.error;
        
        // Rollback if requested and previous version exists
        if (request.rollbackOnFailure) {
          const rollbackResult = await this.performAutomaticRollback(
            userId, 
            request.workflowId,
            'Automatic rollback due to deployment failure'
          );
          if (rollbackResult.success) {
            deployment.status = 'rolled_back';
          }
        }
      }

      // Record deployment in database
      await this.recordDeployment(userId, request.workflowId, deployment);

      // Log telemetry
      await this.logTelemetry(userId, 'workflow_deployment', {
        deployment_id: deploymentId,
        workflow_id: request.workflowId,
        success: deployment.success,
        test_mode: request.testMode,
        validation_score: validationResult.confidence,
        complexity: validationResult.complexity
      });

    } catch (error) {
      deployment.status = 'failed';
      deployment.error = `Deployment error: ${error.message}`;
      console.error('Deployment failed:', error);
    }

    this.deploymentQueue.set(deploymentId, deployment);
    return deployment;
  }

  async getWorkflow(userId: string, workflowId: string) {
    const { data: workflow, error } = await supabase
      .from('mvp_workflows')
      .select(`
        *,
        projects!inner(user_id, name)
      `)
      .eq('id', workflowId)
      .eq('projects.user_id', userId)
      .single();

    if (error || !workflow) {
      throw new Error('Workflow not found or access denied');
    }

    return workflow;
  }

  async validateWorkflowComprehensive(workflow: any): Promise<ValidationResult> {
    const workflowJson = workflow.n8n_workflow_json;
    
    // Basic structure validation
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!workflowJson.nodes || !Array.isArray(workflowJson.nodes)) {
      errors.push('Workflow must have nodes array');
    }

    if (workflowJson.nodes?.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Node validation
    const nodeIds = new Set();
    let hasTrigger = false;
    let complexity = 'simple';

    for (const node of workflowJson.nodes || []) {
      if (!node.id || !node.name || !node.type) {
        errors.push(`Invalid node: ${node.name || 'unknown'}`);
      }

      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);

      // Check for trigger nodes
      if (node.type?.includes('trigger') || node.type?.includes('webhook') || node.type?.includes('cron')) {
        hasTrigger = true;
      }

      // Assess complexity
      if (node.type === 'n8n-nodes-base.function' || node.type === 'n8n-nodes-base.switch') {
        complexity = 'medium';
      }
    }

    if (!hasTrigger) {
      warnings.push('Workflow should have at least one trigger node');
    }

    if (workflowJson.nodes?.length > 15) {
      complexity = 'complex';
      suggestions.push('Consider breaking large workflows into smaller components');
    }

    // Connection validation
    for (const [sourceId, connection] of Object.entries(workflowJson.connections || {})) {
      if (!nodeIds.has(sourceId)) {
        errors.push(`Connection from unknown node: ${sourceId}`);
      }
    }

    // Calculate confidence score
    let confidence = 100;
    confidence -= errors.length * 20;
    confidence -= warnings.length * 5;
    confidence = Math.max(0, Math.min(100, confidence));

    // Extract required permissions
    const requiredPermissions = this.extractRequiredPermissions(workflowJson);

    // Estimate execution time
    const estimatedExecutionTime = this.estimateWorkflowExecutionTime(workflowJson);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      confidence,
      complexity: complexity as any,
      requiredPermissions,
      estimatedExecutionTime
    };
  }

  private extractRequiredPermissions(workflowJson: any): string[] {
    const permissions = new Set<string>();

    for (const node of workflowJson.nodes || []) {
      switch (node.type) {
        case 'n8n-nodes-base.slack':
          permissions.add('Slack API access');
          break;
        case 'n8n-nodes-base.gmail':
          permissions.add('Gmail API access');
          break;
        case 'n8n-nodes-base.googleSheets':
          permissions.add('Google Sheets API access');
          break;
        case 'n8n-nodes-base.httpRequest':
          permissions.add('External HTTP requests');
          break;
        case 'n8n-nodes-base.postgres':
        case 'n8n-nodes-base.mysql':
          permissions.add('Database access');
          break;
        case 'n8n-nodes-base.webhook':
          permissions.add('Webhook endpoint creation');
          break;
      }
    }

    return Array.from(permissions);
  }

  private estimateWorkflowExecutionTime(workflowJson: any): string {
    if (!workflowJson.nodes) return '< 1 second';

    let estimatedMs = 0;
    for (const node of workflowJson.nodes) {
      switch (node.type) {
        case 'n8n-nodes-base.httpRequest':
          estimatedMs += 1000;
          break;
        case 'n8n-nodes-base.function':
          estimatedMs += 100;
          break;
        case 'n8n-nodes-base.postgres':
          estimatedMs += 500;
          break;
        default:
          estimatedMs += 50;
      }
    }

    if (estimatedMs < 1000) return '< 1 second';
    return `${Math.ceil(estimatedMs / 1000)} seconds`;
  }

  async performPreDeploymentChecks(): Promise<void> {
    // Check n8n connectivity
    try {
      const response = await fetch(`${n8nApiUrl.replace('/api/v1', '')}/healthz`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error('n8n service is not healthy');
      }
    } catch (error) {
      throw new Error(`n8n connectivity check failed: ${error.message}`);
    }

    // Check database connectivity
    try {
      const { error } = await supabase.from('mvp_workflows').select('id').limit(1);
      if (error) {
        throw new Error('Database connectivity check failed');
      }
    } catch (error) {
      throw new Error(`Database check failed: ${error.message}`);
    }
  }

  async deployToN8n(workflow: any, activate: boolean) {
    if (!n8nApiKey) {
      throw new Error('n8n API key not configured');
    }

    const workflowJson = workflow.n8n_workflow_json;
    const deploymentPayload = {
      name: workflow.name,
      nodes: workflowJson.nodes,
      connections: workflowJson.connections || {},
      active: activate,
      settings: workflowJson.settings || {}
    };

    try {
      const response = await fetch(`${n8nApiUrl}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nApiKey
        },
        body: JSON.stringify(deploymentPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n deployment failed: ${response.status} - ${errorText}`);
      }

      const deployedWorkflow = await response.json();

      // Generate webhook URL if applicable
      let webhookUrl;
      const webhookNode = workflowJson.nodes?.find((node: any) => node.type === 'n8n-nodes-base.webhook');
      if (webhookNode) {
        const webhookPath = webhookNode.parameters?.path;
        if (webhookPath) {
          webhookUrl = `${n8nApiUrl.replace('/api/v1', '')}/webhook/${webhookPath}`;
        }
      }

      return {
        success: true,
        workflowId: deployedWorkflow.id.toString(),
        deploymentUrl: `${n8nApiUrl.replace('/api/v1', '')}/workflow/${deployedWorkflow.id}`,
        webhookUrl
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async simulateDeployment(workflow: any) {
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      workflowId: `test_${Date.now()}`,
      deploymentUrl: `${n8nApiUrl.replace('/api/v1', '')}/workflow/test_${Date.now()}`,
      webhookUrl: workflow.n8n_workflow_json.nodes?.find((n: any) => n.type === 'n8n-nodes-base.webhook') 
        ? `${n8nApiUrl.replace('/api/v1', '')}/webhook/test_${Date.now()}` 
        : undefined
    };
  }

  async updateWorkflowStatus(
    workflowId: string, 
    status: string, 
    n8nWorkflowId?: string,
    deploymentUrl?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      deployment_status: status === 'deployed' ? 'deployed' : status,
      updated_at: new Date().toISOString()
    };

    if (n8nWorkflowId) {
      updateData.n8n_workflow_id = n8nWorkflowId;
    }

    if (deploymentUrl) {
      updateData.deployment_url = deploymentUrl;
    }

    if (status === 'deployed') {
      updateData.last_deployed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('mvp_workflows')
      .update(updateData)
      .eq('id', workflowId);

    if (error) {
      console.error('Failed to update workflow status:', error);
    }
  }

  async setupExecutionTracking(n8nWorkflowId: string, workflow: any): Promise<void> {
    // This would set up monitoring for the deployed workflow
    // For now, just log the setup
    console.log(`Setting up execution tracking for workflow ${n8nWorkflowId}`);
  }

  async recordDeployment(userId: string, workflowId: string, deployment: DeploymentResult): Promise<void> {
    try {
      await supabase
        .from('deployments')
        .insert({
          user_id: userId,
          workflow_id: workflowId,
          n8n_workflow_id: deployment.n8nWorkflowId || null,
          deployment_version: 1,
          status: deployment.status,
          n8n_response: deployment.n8nWorkflowId ? { workflowId: deployment.n8nWorkflowId } : null,
          error_message: deployment.error || null,
          deployment_url: deployment.deploymentUrl || null,
          completed_at: new Date().toISOString(),
          duration_ms: 0 // Could calculate actual duration
        });
    } catch (error) {
      console.error('Failed to record deployment:', error);
    }
  }

  async rollbackWorkflow(userId: string, request: RollbackRequest): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      // Get deployment record
      const { data: deployment, error } = await supabase
        .from('deployments')
        .select(`
          *,
          mvp_workflows!inner(user_id, n8n_workflow_id)
        `)
        .eq('id', request.deploymentId)
        .eq('mvp_workflows.user_id', userId)
        .single();

      if (error || !deployment) {
        return { success: false, message: 'Deployment not found or access denied' };
      }

      if (deployment.n8n_workflow_id && n8nApiKey) {
        // Deactivate and delete from n8n
        try {
          await fetch(`${n8nApiUrl}/workflows/${deployment.n8n_workflow_id}`, {
            method: 'DELETE',
            headers: { 'X-N8N-API-KEY': n8nApiKey }
          });
        } catch (error) {
          console.warn('Failed to delete n8n workflow during rollback:', error);
        }
      }

      // Update deployment status
      await supabase
        .from('deployments')
        .update({ 
          status: 'rolled_back',
          error_message: `Rolled back: ${request.reason || 'Manual rollback'}`
        })
        .eq('id', request.deploymentId);

      // Update workflow status
      await supabase
        .from('mvp_workflows')
        .update({
          status: 'draft',
          deployment_status: 'not_deployed',
          n8n_workflow_id: null,
          deployment_url: null
        })
        .eq('id', deployment.workflow_id);

      return { success: true, message: 'Workflow rolled back successfully' };

    } catch (error) {
      return { success: false, message: 'Rollback failed', error: error.message };
    }
  }

  async performAutomaticRollback(userId: string, workflowId: string, reason: string) {
    // Find the most recent deployment for this workflow
    const { data: recentDeployment, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('status', 'deployed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !recentDeployment) {
      return { success: false, message: 'No deployment found to rollback' };
    }

    return await this.rollbackWorkflow(userId, {
      deploymentId: recentDeployment.id,
      reason
    });
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentResult | null> {
    return this.deploymentQueue.get(deploymentId) || null;
  }

  async getHealthStatus(): Promise<HealthCheckResult> {
    const health: HealthCheckResult = {
      healthy: true,
      services: {
        n8n: false,
        database: false,
        mcp: false
      },
      metrics: {
        activeWorkflows: 0,
        recentDeployments: 0,
        averageDeploymentTime: 0,
        errorRate: 0
      },
      timestamp: new Date().toISOString()
    };

    // Check n8n
    try {
      const response = await fetch(`${n8nApiUrl.replace('/api/v1', '')}/healthz`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      health.services.n8n = response.ok;
    } catch {
      health.services.n8n = false;
    }

    // Check database
    try {
      const { error } = await supabase.from('mvp_workflows').select('id').limit(1);
      health.services.database = !error;
    } catch {
      health.services.database = false;
    }

    // Check MCP (simplified)
    health.services.mcp = true; // Assume healthy if service is running

    // Get metrics
    try {
      const { data: activeWorkflows } = await supabase
        .from('mvp_workflows')
        .select('id')
        .eq('deployment_status', 'deployed');

      const { data: recentDeployments } = await supabase
        .from('deployments')
        .select('id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      health.metrics.activeWorkflows = activeWorkflows?.length || 0;
      health.metrics.recentDeployments = recentDeployments?.length || 0;

    } catch (error) {
      console.error('Failed to get health metrics:', error);
    }

    health.healthy = health.services.n8n && health.services.database && health.services.mcp;

    return health;
  }

  private estimateCompletionTime(): string {
    const baseTime = 30; // seconds
    const now = new Date();
    now.setSeconds(now.getSeconds() + baseTime);
    return now.toISOString();
  }

  private async logTelemetry(userId: string, eventType: string, eventData: any): Promise<void> {
    try {
      await supabase
        .from('telemetry_events')
        .insert({
          user_id: userId,
          event_type: eventType,
          event_category: 'deployment',
          event_data: eventData
        });
    } catch (error) {
      console.error('Failed to log telemetry:', error);
    }
  }
}

// Main request handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authResult = await authenticate(req);
    if (!authResult.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { user } = authResult;
    const url = new URL(req.url);
    const method = req.method;

    const service = new WorkflowDeploymentService();

    if (method === 'POST' && url.pathname === '/deploy') {
      const body = await req.json() as DeploymentRequest;
      const result = await service.deployWorkflow(user.id, body);
      
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'GET' && url.pathname.startsWith('/status/')) {
      const deploymentId = url.pathname.split('/')[2];
      const result = await service.getDeploymentStatus(deploymentId);
      
      return new Response(JSON.stringify(result || { error: 'Deployment not found' }), {
        status: result ? 200 : 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'POST' && url.pathname === '/rollback') {
      const body = await req.json() as RollbackRequest;
      const result = await service.rollbackWorkflow(user.id, body);
      
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'GET' && url.pathname === '/health') {
      const health = await service.getHealthStatus();
      
      return new Response(JSON.stringify(health), {
        status: health.healthy ? 200 : 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response('Not Found', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Workflow deployment service error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});