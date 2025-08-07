/**
 * N8n Workflow Healer - Automated Error Detection and Healing
 * 
 * This system catches real n8n errors, analyzes them, and automatically
 * heals workflow JSON to fix common issues before redeployment.
 */

import { n8nApi, N8nApiError } from '../n8n';
import { supabase } from '../supabase';

export interface WorkflowError {
  id: string;
  type: 'validation' | 'execution' | 'connection' | 'node' | 'syntax';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  nodeId?: string;
  nodeType?: string;
  suggestions: string[];
  autoFixable: boolean;
}

export interface HealingResult {
  success: boolean;
  originalWorkflow: any;
  healedWorkflow?: any;
  errors: WorkflowError[];
  fixes: string[];
  needsManualReview: boolean;
}

class N8nWorkflowHealer {
  private static instance: N8nWorkflowHealer;
  private healingHistory: Map<string, HealingResult[]> = new Map();

  public static getInstance(): N8nWorkflowHealer {
    if (!N8nWorkflowHealer.instance) {
      N8nWorkflowHealer.instance = new N8nWorkflowHealer();
    }
    return N8nWorkflowHealer.instance;
  }

  /**
   * Main healing method - analyzes and fixes workflow issues
   */
  async healWorkflow(workflow: any, context?: { userId?: string; sessionId?: string }): Promise<HealingResult> {
    console.log('🏥 Starting workflow healing process...');
    
    const result: HealingResult = {
      success: false,
      originalWorkflow: JSON.parse(JSON.stringify(workflow)),
      errors: [],
      fixes: [],
      needsManualReview: false
    };

    try {
      // Step 1: Validate workflow structure
      const structureErrors = await this.validateWorkflowStructure(workflow);
      result.errors.push(...structureErrors);

      // Step 2: Validate individual nodes
      const nodeErrors = await this.validateNodes(workflow);
      result.errors.push(...nodeErrors);

      // Step 3: Validate connections
      const connectionErrors = await this.validateConnections(workflow);
      result.errors.push(...connectionErrors);

      // Step 4: Test against n8n engine
      const engineErrors = await this.testAgainstN8nEngine(workflow);
      result.errors.push(...engineErrors);

      // Step 5: Apply automatic fixes
      if (result.errors.length > 0) {
        const healedWorkflow = await this.applyAutomaticFixes(workflow, result.errors);
        result.healedWorkflow = healedWorkflow;
        
        // Step 6: Validate healed workflow
        const healedErrors = await this.testAgainstN8nEngine(healedWorkflow);
        
        if (healedErrors.length < result.errors.length) {
          result.success = true;
          result.fixes = this.generateFixSummary(result.errors, healedErrors);
        }

        // Check if manual review is needed
        result.needsManualReview = healedErrors.some(e => e.severity === 'critical') ||
                                   healedErrors.length > result.errors.length * 0.5;
      } else {
        result.success = true;
        result.healedWorkflow = workflow;
      }

      // Store healing history
      if (context?.userId) {
        await this.storeHealingResult(context.userId, result);
      }

      console.log(`🏥 Healing complete: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`📊 Errors found: ${result.errors.length}, Fixes applied: ${result.fixes.length}`);

      return result;

    } catch (error) {
      console.error('❌ Workflow healing failed:', error);
      result.errors.push({
        id: 'healing-system-error',
        type: 'validation',
        severity: 'critical',
        message: `Healing system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: ['Manual review required', 'Contact system administrator'],
        autoFixable: false
      });
      return result;
    }
  }

  /**
   * Validate workflow structure
   */
  private async validateWorkflowStructure(workflow: any): Promise<WorkflowError[]> {
    const errors: WorkflowError[] = [];

    // Check required fields
    if (!workflow.name || typeof workflow.name !== 'string') {
      errors.push({
        id: 'missing-name',
        type: 'validation',
        severity: 'high',
        message: 'Workflow must have a valid name',
        suggestions: ['Add a descriptive name for the workflow'],
        autoFixable: true
      });
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push({
        id: 'missing-nodes',
        type: 'validation',
        severity: 'critical',
        message: 'Workflow must have a nodes array',
        suggestions: ['Add at least one node to the workflow'],
        autoFixable: false
      });
    }

    if (!workflow.connections || typeof workflow.connections !== 'object') {
      errors.push({
        id: 'missing-connections',
        type: 'validation',
        severity: 'medium',
        message: 'Workflow should have a connections object',
        suggestions: ['Add connections object to define node relationships'],
        autoFixable: true
      });
    }

    // Check for start node
    if (workflow.nodes && !workflow.nodes.some((node: any) => 
        node.type === 'n8n-nodes-base.start' || 
        node.type === 'n8n-nodes-base.manualTrigger'
    )) {
      errors.push({
        id: 'missing-start-node',
        type: 'validation',
        severity: 'high',
        message: 'Workflow should have a start or trigger node',
        suggestions: ['Add a Start node or trigger to begin workflow execution'],
        autoFixable: true
      });
    }

    return errors;
  }

  /**
   * Validate individual nodes
   */
  private async validateNodes(workflow: any): Promise<WorkflowError[]> {
    const errors: WorkflowError[] = [];

    if (!workflow.nodes) return errors;

    for (const node of workflow.nodes) {
      // Check required node fields
      if (!node.id || typeof node.id !== 'string') {
        errors.push({
          id: `node-${node.id || 'unknown'}-missing-id`,
          type: 'node',
          severity: 'critical',
          message: 'Node must have a valid ID',
          nodeId: node.id,
          suggestions: ['Add a unique ID to the node'],
          autoFixable: true
        });
      }

      if (!node.type || typeof node.type !== 'string') {
        errors.push({
          id: `node-${node.id}-missing-type`,
          type: 'node',
          severity: 'critical',
          message: 'Node must have a valid type',
          nodeId: node.id,
          suggestions: ['Specify a valid n8n node type'],
          autoFixable: false
        });
      }

      // Check node type validity
      if (node.type && !this.isValidNodeType(node.type)) {
        errors.push({
          id: `node-${node.id}-invalid-type`,
          type: 'node',
          severity: 'high',
          message: `Invalid node type: ${node.type}`,
          nodeId: node.id,
          nodeType: node.type,
          suggestions: ['Use a valid n8n node type', 'Check n8n documentation for available nodes'],
          autoFixable: false
        });
      }

      // Check position
      if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
        errors.push({
          id: `node-${node.id}-invalid-position`,
          type: 'node',
          severity: 'low',
          message: 'Node should have valid position coordinates',
          nodeId: node.id,
          suggestions: ['Add [x, y] coordinates for node position'],
          autoFixable: true
        });
      }

      // Validate node parameters
      if (node.parameters) {
        const paramErrors = this.validateNodeParameters(node);
        errors.push(...paramErrors);
      }
    }

    return errors;
  }

  /**
   * Validate node connections
   */
  private async validateConnections(workflow: any): Promise<WorkflowError[]> {
    const errors: WorkflowError[] = [];

    if (!workflow.connections || !workflow.nodes) return errors;

    const nodeIds = workflow.nodes.map((node: any) => node.id);

    for (const [sourceNodeId, connections] of Object.entries(workflow.connections)) {
      // Check if source node exists
      if (!nodeIds.includes(sourceNodeId)) {
        errors.push({
          id: `connection-invalid-source-${sourceNodeId}`,
          type: 'connection',
          severity: 'high',
          message: `Connection references non-existent source node: ${sourceNodeId}`,
          nodeId: sourceNodeId,
          suggestions: ['Remove invalid connection', 'Add missing node'],
          autoFixable: true
        });
        continue;
      }

      // Validate connection structure
      if (typeof connections !== 'object') continue;

      for (const [outputType, outputConnections] of Object.entries(connections)) {
        if (!Array.isArray(outputConnections)) continue;

        for (const connectionGroup of outputConnections) {
          if (!Array.isArray(connectionGroup)) continue;

          for (const connection of connectionGroup) {
            // Check if target node exists
            if (!nodeIds.includes(connection.node)) {
              errors.push({
                id: `connection-invalid-target-${connection.node}`,
                type: 'connection',
                severity: 'high',
                message: `Connection references non-existent target node: ${connection.node}`,
                nodeId: connection.node,
                suggestions: ['Remove invalid connection', 'Add missing node'],
                autoFixable: true
              });
            }

            // Validate connection properties
            if (connection.type !== 'main' && connection.type !== 'error') {
              errors.push({
                id: `connection-invalid-type-${connection.type}`,
                type: 'connection',
                severity: 'medium',
                message: `Invalid connection type: ${connection.type}`,
                suggestions: ['Use "main" or "error" as connection type'],
                autoFixable: true
              });
            }
          }
        }
      }
    }

    return errors;
  }

  /**
   * Test workflow against actual n8n engine
   */
  private async testAgainstN8nEngine(workflow: any): Promise<WorkflowError[]> {
    const errors: WorkflowError[] = [];

    try {
      // Try to create a test workflow in n8n
      const testWorkflow = {
        ...workflow,
        name: `${workflow.name || 'Test'} - Validation ${Date.now()}`,
        active: false
      };

      const result = await n8nApi.createWorkflow(testWorkflow);
      
      if (result.id) {
        // Workflow created successfully, clean it up
        try {
          // Note: We'll need to implement a delete method in n8nApi
          console.log('🧪 Test workflow created successfully, cleaning up...');
          // await n8nApi.deleteWorkflow(result.id);
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup test workflow:', cleanupError);
        }
      }

    } catch (error) {
      if (error instanceof N8nApiError) {
        // Parse n8n error and convert to WorkflowError
        const workflowError = this.parseN8nError(error);
        errors.push(workflowError);
      } else {
        errors.push({
          id: 'n8n-engine-error',
          type: 'validation',
          severity: 'high',
          message: `n8n engine error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestions: ['Check n8n connectivity', 'Verify workflow syntax'],
          autoFixable: false
        });
      }
    }

    return errors;
  }

  /**
   * Apply automatic fixes to workflow
   */
  private async applyAutomaticFixes(workflow: any, errors: WorkflowError[]): Promise<any> {
    const healedWorkflow = JSON.parse(JSON.stringify(workflow));

    for (const error of errors) {
      if (!error.autoFixable) continue;

      switch (error.id) {
        case 'missing-name':
          healedWorkflow.name = `Generated Workflow ${Date.now()}`;
          break;

        case 'missing-connections':
          healedWorkflow.connections = {};
          break;

        case 'missing-start-node':
          // Add a start node if missing
          const startNode = {
            id: 'start_' + Date.now(),
            type: 'n8n-nodes-base.start',
            position: [250, 300],
            parameters: {}
          };
          if (!healedWorkflow.nodes) healedWorkflow.nodes = [];
          healedWorkflow.nodes.unshift(startNode);
          break;

        default:
          if (error.id.includes('missing-id')) {
            // Fix missing node IDs
            const nodeIndex = healedWorkflow.nodes?.findIndex((n: any) => !n.id);
            if (nodeIndex >= 0) {
              healedWorkflow.nodes[nodeIndex].id = `node_${Date.now()}_${nodeIndex}`;
            }
          } else if (error.id.includes('invalid-position')) {
            // Fix invalid positions
            const node = healedWorkflow.nodes?.find((n: any) => n.id === error.nodeId);
            if (node) {
              node.position = [250 + Math.random() * 500, 300 + Math.random() * 300];
            }
          } else if (error.id.includes('connection-invalid')) {
            // Remove invalid connections
            this.cleanupInvalidConnections(healedWorkflow, error.nodeId);
          }
          break;
      }
    }

    return healedWorkflow;
  }

  /**
   * Helper methods
   */
  private isValidNodeType(type: string): boolean {
    // Common n8n node types - extend this list as needed
    const validTypes = [
      'n8n-nodes-base.start',
      'n8n-nodes-base.set',
      'n8n-nodes-base.if',
      'n8n-nodes-base.webhook',
      'n8n-nodes-base.httpRequest',
      'n8n-nodes-base.function',
      'n8n-nodes-base.respondToWebhook',
      'n8n-nodes-base.code',
      'n8n-nodes-base.merge',
      'n8n-nodes-base.schedule',
      'n8n-nodes-base.manualTrigger'
    ];
    
    return validTypes.includes(type) || type.startsWith('n8n-nodes-');
  }

  private validateNodeParameters(node: any): WorkflowError[] {
    const errors: WorkflowError[] = [];
    
    // Validate parameters based on node type
    switch (node.type) {
      case 'n8n-nodes-base.webhook':
        if (!node.parameters.path) {
          errors.push({
            id: `node-${node.id}-missing-webhook-path`,
            type: 'node',
            severity: 'medium',
            message: 'Webhook node should have a path parameter',
            nodeId: node.id,
            nodeType: node.type,
            suggestions: ['Add a path parameter for the webhook'],
            autoFixable: true
          });
        }
        break;

      case 'n8n-nodes-base.httpRequest':
        if (!node.parameters.url) {
          errors.push({
            id: `node-${node.id}-missing-http-url`,
            type: 'node',
            severity: 'high',
            message: 'HTTP Request node must have a URL',
            nodeId: node.id,
            nodeType: node.type,
            suggestions: ['Add a URL parameter for the HTTP request'],
            autoFixable: false
          });
        }
        break;
    }

    return errors;
  }

  private parseN8nError(error: N8nApiError): WorkflowError {
    let type: WorkflowError['type'] = 'validation';
    let severity: WorkflowError['severity'] = 'medium';
    
    if (error.message.includes('node')) type = 'node';
    if (error.message.includes('connection')) type = 'connection';
    if (error.message.includes('execution')) type = 'execution';
    
    if (error.status && error.status >= 500) severity = 'critical';
    if (error.status && error.status === 400) severity = 'high';

    return {
      id: `n8n-api-error-${Date.now()}`,
      type,
      severity,
      message: error.message,
      suggestions: [
        'Check workflow syntax',
        'Verify node configurations',
        'Review n8n documentation'
      ],
      autoFixable: false
    };
  }

  private cleanupInvalidConnections(workflow: any, nodeId?: string): void {
    if (!workflow.connections || !nodeId) return;

    // Remove connections to invalid nodes
    for (const [sourceId, connections] of Object.entries(workflow.connections)) {
      if (typeof connections !== 'object') continue;
      
      for (const [outputType, outputConnections] of Object.entries(connections)) {
        if (!Array.isArray(outputConnections)) continue;
        
        for (let i = outputConnections.length - 1; i >= 0; i--) {
          const connectionGroup = outputConnections[i];
          if (!Array.isArray(connectionGroup)) continue;
          
          const filteredGroup = connectionGroup.filter((conn: any) => conn.node !== nodeId);
          
          if (filteredGroup.length === 0) {
            outputConnections.splice(i, 1);
          } else {
            outputConnections[i] = filteredGroup;
          }
        }
      }
    }

    // Remove empty connection entries
    delete workflow.connections[nodeId];
  }

  private generateFixSummary(originalErrors: WorkflowError[], remainingErrors: WorkflowError[]): string[] {
    const fixes: string[] = [];
    const fixedErrorIds = originalErrors
      .filter(e => !remainingErrors.some(r => r.id === e.id))
      .map(e => e.id);

    for (const errorId of fixedErrorIds) {
      const error = originalErrors.find(e => e.id === errorId);
      if (error) {
        fixes.push(`Fixed: ${error.message}`);
      }
    }

    return fixes;
  }

  private async storeHealingResult(userId: string, result: HealingResult): Promise<void> {
    try {
      await supabase.from('workflow_healing_log').insert({
        user_id: userId,
        errors_found: result.errors.length,
        fixes_applied: result.fixes.length,
        success: result.success,
        needs_manual_review: result.needsManualReview,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to store healing result:', error);
    }
  }

  /**
   * Get healing history for analytics
   */
  async getHealingHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_healing_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch healing history:', error);
      return [];
    }
  }
}

export const workflowHealer = N8nWorkflowHealer.getInstance();
