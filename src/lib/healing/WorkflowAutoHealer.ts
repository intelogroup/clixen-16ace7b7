import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { queueManager } from '../queues/SupabaseQueueManager';
import { validationPipeline, ValidationError, N8nWorkflow, N8nNode } from '../validation/WorkflowValidationPipeline';
import { Database } from '../types/database';

// ============================================================================
// Type Definitions
// ============================================================================

export interface HealingResult {
  success: boolean;
  healed: boolean;
  workflow?: N8nWorkflow;
  appliedFixes: AppliedFix[];
  remainingErrors: ValidationError[];
  confidence: number; // 0-1, how confident we are in the fix
}

export interface AppliedFix {
  errorType: string;
  fixType: string;
  description: string;
  path?: string;
  oldValue?: any;
  newValue?: any;
  confidence: number;
}

export interface HealingStrategy {
  canFix: (error: ValidationError, workflow: N8nWorkflow) => boolean;
  fix: (error: ValidationError, workflow: N8nWorkflow) => Promise<{
    workflow: N8nWorkflow;
    appliedFix: AppliedFix;
  }>;
  confidence: number; // Base confidence level for this strategy
}

// ============================================================================
// Auto-Healing Strategies
// ============================================================================

export class WorkflowAutoHealer {
  private supabase: SupabaseClient<Database>;
  private strategies: Map<string, HealingStrategy> = new Map();
  private readonly MAX_HEALING_ATTEMPTS = 3;
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.7;

  constructor() {
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.initializeHealingStrategies();
  }

  /**
   * Initialize all healing strategies
   */
  private initializeHealingStrategies(): void {
    // Structure-level fixes
    this.strategies.set('missing_required_property', {
      canFix: (error) => error.layer === 'structure' && error.type === 'required',
      fix: this.fixMissingRequiredProperty.bind(this),
      confidence: 0.9
    });

    this.strategies.set('invalid_node_id', {
      canFix: (error) => error.layer === 'structure' && error.path?.includes('nodes') && error.type === 'minLength',
      fix: this.fixInvalidNodeId.bind(this),
      confidence: 0.8
    });

    this.strategies.set('invalid_position', {
      canFix: (error) => error.layer === 'structure' && error.path?.includes('position'),
      fix: this.fixInvalidPosition.bind(this),
      confidence: 0.95
    });

    // Business logic fixes
    this.strategies.set('duplicate_node_ids', {
      canFix: (error) => error.layer === 'business' && error.message.includes('Duplicate node IDs'),
      fix: this.fixDuplicateNodeIds.bind(this),
      confidence: 0.85
    });

    this.strategies.set('orphaned_nodes', {
      canFix: (error) => error.layer === 'business' && error.type === 'orphaned_nodes',
      fix: this.fixOrphanedNodes.bind(this),
      confidence: 0.7
    });

    this.strategies.set('circular_dependency', {
      canFix: (error) => error.layer === 'business' && error.type === 'circular_dependency',
      fix: this.fixCircularDependency.bind(this),
      confidence: 0.6
    });

    // Compatibility fixes
    this.strategies.set('invalid_connection', {
      canFix: (error) => error.layer === 'compatibility' && error.type === 'invalid_connection',
      fix: this.fixInvalidConnection.bind(this),
      confidence: 0.8
    });

    this.strategies.set('forbidden_node_type', {
      canFix: (error) => error.layer === 'compatibility' && error.type === 'forbidden_node_type',
      fix: this.fixForbiddenNodeType.bind(this),
      confidence: 0.75
    });

    // Advanced AI-powered fixes
    this.strategies.set('ai_contextual_fix', {
      canFix: (error) => error.fixable && this.isComplexError(error),
      fix: this.aiContextualFix.bind(this),
      confidence: 0.65
    });
  }

  /**
   * Main healing entry point
   */
  async healWorkflow(
    executionId: string,
    workflow: N8nWorkflow,
    errors: ValidationError[]
  ): Promise<HealingResult> {
    console.log(`🔧 Starting auto-heal for execution ${executionId} with ${errors.length} errors`);

    let currentWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone
    let appliedFixes: AppliedFix[] = [];
    let remainingErrors = [...errors];
    let attemptCount = 0;

    // Update execution status
    await this.updateExecutionStatus(executionId, 'auto_healing', {
      totalErrors: errors.length,
      attempt: 1
    });

    while (remainingErrors.length > 0 && attemptCount < this.MAX_HEALING_ATTEMPTS) {
      attemptCount++;
      console.log(`🔄 Healing attempt ${attemptCount}/${this.MAX_HEALING_ATTEMPTS}`);

      let healed = false;

      // Sort errors by severity and fixability
      const sortedErrors = this.prioritizeErrors(remainingErrors);

      for (const error of sortedErrors) {
        const strategy = this.findBestStrategy(error, currentWorkflow);
        
        if (strategy && strategy.confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
          try {
            const fixResult = await strategy.fix(error, currentWorkflow);
            
            currentWorkflow = fixResult.workflow;
            appliedFixes.push(fixResult.appliedFix);
            healed = true;

            console.log(`✅ Applied fix: ${fixResult.appliedFix.description}`);

            // Remove the fixed error from remaining errors
            remainingErrors = remainingErrors.filter(e => 
              e !== error && !this.isErrorResolved(e, fixResult.appliedFix)
            );

          } catch (fixError) {
            console.error(`❌ Failed to apply fix for error: ${error.message}`, fixError);
          }
        }
      }

      // If no fixes were applied, try AI-powered contextual fixes
      if (!healed && attemptCount === 1) {
        const aiResult = await this.attemptAIHealing(currentWorkflow, remainingErrors);
        if (aiResult.success) {
          currentWorkflow = aiResult.workflow!;
          appliedFixes.push(...aiResult.appliedFixes);
          remainingErrors = aiResult.remainingErrors;
          healed = true;
        }
      }

      // Re-validate to see if our fixes worked
      if (healed) {
        const revalidationResult = await validationPipeline.validateWorkflow(
          currentWorkflow,
          'system', // System user for re-validation
          { autoHeal: false, skipDeploymentTest: true }
        );

        if (revalidationResult.valid) {
          remainingErrors = [];
          break;
        } else {
          remainingErrors = revalidationResult.errors || [];
        }
      }

      if (!healed) {
        console.log(`⚠️ No fixes applied in attempt ${attemptCount}`);
        break;
      }
    }

    const success = remainingErrors.length === 0;
    const confidence = this.calculateOverallConfidence(appliedFixes);

    // Update execution with healing results
    await this.updateExecutionStatus(executionId, success ? 'completed' : 'failed', {
      healingResult: {
        success,
        healed: appliedFixes.length > 0,
        appliedFixes: appliedFixes.length,
        remainingErrors: remainingErrors.length,
        confidence
      }
    });

    // Store healed workflow if successful and significantly changed
    if (success && appliedFixes.length > 0) {
      await this.storeHealedWorkflow(executionId, currentWorkflow, appliedFixes);
    }

    return {
      success,
      healed: appliedFixes.length > 0,
      workflow: success ? currentWorkflow : undefined,
      appliedFixes,
      remainingErrors,
      confidence
    };
  }

  // ============================================================================
  // Healing Strategies Implementation
  // ============================================================================

  private async fixMissingRequiredProperty(
    error: ValidationError,
    workflow: N8nWorkflow
  ): Promise<{ workflow: N8nWorkflow; appliedFix: AppliedFix }> {
    const fixedWorkflow = { ...workflow };

    // Common missing properties and their defaults
    const defaults: Record<string, any> = {
      'name': 'Auto-generated Workflow',
      'active': false,
      'nodes': [],
      'connections': {},
      'settings': {},
      'staticData': null,
      'meta': null,
      'pinData': null
    };

    const missingProperty = error.message.split(': ')[1];
    if (missingProperty && defaults.hasOwnProperty(missingProperty)) {
      (fixedWorkflow as any)[missingProperty] = defaults[missingProperty];
    }

    return {
      workflow: fixedWorkflow,
      appliedFix: {
        errorType: error.type,
        fixType: 'add_default_property',
        description: `Added missing required property: ${missingProperty}`,
        path: missingProperty,
        oldValue: undefined,
        newValue: defaults[missingProperty],
        confidence: 0.9
      }
    };
  }

  private async fixInvalidNodeId(
    error: ValidationError,
    workflow: N8nWorkflow
  ): Promise<{ workflow: N8nWorkflow; appliedFix: AppliedFix }> {
    const fixedWorkflow = { ...workflow };
    fixedWorkflow.nodes = [...workflow.nodes];

    // Find nodes with invalid IDs and fix them
    for (let i = 0; i < fixedWorkflow.nodes.length; i++) {
      const node = fixedWorkflow.nodes[i];
      if (!node.id || node.id.length === 0) {
        const newId = `node_${i}_${Date.now()}`;
        fixedWorkflow.nodes[i] = { ...node, id: newId };
      }
    }

    return {
      workflow: fixedWorkflow,
      appliedFix: {
        errorType: error.type,
        fixType: 'generate_node_id',
        description: 'Generated valid IDs for nodes with missing or invalid IDs',
        path: error.path,
        confidence: 0.8
      }
    };
  }

  private async fixInvalidPosition(
    error: ValidationError,
    workflow: N8nWorkflow
  ): Promise<{ workflow: N8nWorkflow; appliedFix: AppliedFix }> {
    const fixedWorkflow = { ...workflow };
    fixedWorkflow.nodes = [...workflow.nodes];

    // Fix invalid positions
    for (let i = 0; i < fixedWorkflow.nodes.length; i++) {
      const node = fixedWorkflow.nodes[i];
      if (!Array.isArray(node.position) || node.position.length !== 2) {
        // Generate a reasonable position based on node index
        const x = 250 + (i % 3) * 200; // Arrange in grid
        const y = 300 + Math.floor(i / 3) * 150;
        
        fixedWorkflow.nodes[i] = { 
          ...node, 
          position: [x, y] as [number, number]
        };
      }
    }

    return {
      workflow: fixedWorkflow,
      appliedFix: {
        errorType: error.type,
        fixType: 'fix_node_positions',
        description: 'Fixed invalid node positions',
        path: error.path,
        confidence: 0.95
      }
    };
  }

  private async fixDuplicateNodeIds(
    error: ValidationError,
    workflow: N8nWorkflow
  ): Promise<{ workflow: N8nWorkflow; appliedFix: AppliedFix }> {
    const fixedWorkflow = { ...workflow };
    fixedWorkflow.nodes = [...workflow.nodes];

    const seenIds = new Set<string>();
    const duplicateMap = new Map<string, string>();

    for (let i = 0; i < fixedWorkflow.nodes.length; i++) {
      const node = fixedWorkflow.nodes[i];
      const originalId = node.id;

      if (seenIds.has(originalId)) {
        // Generate new unique ID
        const newId = `${originalId}_${i}_${Date.now()}`;
        fixedWorkflow.nodes[i] = { ...node, id: newId };
        duplicateMap.set(originalId, newId);
      } else {
        seenIds.add(originalId);
      }
    }

    // Update connections to use new IDs
    const fixedConnections = this.updateConnectionIds(workflow.connections, duplicateMap);
    fixedWorkflow.connections = fixedConnections;

    return {
      workflow: fixedWorkflow,
      appliedFix: {
        errorType: error.type,
        fixType: 'resolve_duplicate_ids',
        description: `Resolved ${duplicateMap.size} duplicate node IDs`,
        confidence: 0.85
      }
    };
  }

  private async fixOrphanedNodes(
    error: ValidationError,
    workflow: N8nWorkflow
  ): Promise<{ workflow: N8nWorkflow; appliedFix: AppliedFix }> {
    const fixedWorkflow = { ...workflow };
    
    // Find orphaned nodes
    const orphanedNodes = this.findOrphanedNodes(workflow.nodes, workflow.connections);
    
    // Strategy: Connect orphaned nodes to the workflow end or remove them
    if (orphanedNodes.length > 0) {
      // Remove orphaned nodes that are not start/trigger nodes
      const filteredNodes = workflow.nodes.filter(node => 
        !orphanedNodes.some(orphan => orphan.id === node.id) ||
        node.type.includes('start') ||
        node.type.includes('trigger')
      );

      fixedWorkflow.nodes = filteredNodes;
    }

    return {
      workflow: fixedWorkflow,
      appliedFix: {
        errorType: error.type,
        fixType: 'remove_orphaned_nodes',
        description: `Removed ${orphanedNodes.length} orphaned nodes`,
        confidence: 0.7
      }
    };
  }

  private async fixCircularDependency(
    error: ValidationError,
    workflow: N8nWorkflow
  ): Promise<{ workflow: N8nWorkflow; appliedFix: AppliedFix }> {
    const fixedWorkflow = { ...workflow };
    
    // This is a complex fix - for now, we'll break the cycle by removing the last connection
    // In a production system, this would use proper cycle detection algorithms
    const cycles = this.detectCycles(workflow.nodes, workflow.connections);
    
    if (cycles.length > 0) {
      // Remove the connection that creates the cycle
      const modifiedConnections = { ...workflow.connections };
      
      for (const cycle of cycles) {
        // Remove the last connection in the cycle
        const lastNode = cycle[cycle.length - 1];
        const firstNode = cycle[0];
        
        if (modifiedConnections[lastNode]?.main) {
          modifiedConnections[lastNode].main = modifiedConnections[lastNode].main.filter(
            (connectionGroup: any[]) => 
              !connectionGroup.some((conn: any) => conn.node === firstNode)
          );
        }
      }
      
      fixedWorkflow.connections = modifiedConnections;
    }

    return {
      workflow: fixedWorkflow,
      appliedFix: {
        errorType: error.type,
        fixType: 'break_circular_dependency',
        description: `Broke ${cycles.length} circular dependencies`,
        confidence: 0.6
      }
    };
  }

  private async fixInvalidConnection(
    error: ValidationError,
    workflow: N8nWorkflow
  ): Promise<{ workflow: N8nWorkflow; appliedFix: AppliedFix }> {
    const fixedWorkflow = { ...workflow };
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    const modifiedConnections = { ...workflow.connections };

    // Remove connections that reference non-existent nodes
    for (const [sourceNode, connections] of Object.entries(modifiedConnections)) {
      if (!nodeIds.has(sourceNode)) {
        delete modifiedConnections[sourceNode];
      } else if (connections.main) {
        connections.main = connections.main.filter((connectionGroup: any[]) =>
          connectionGroup.every((conn: any) => nodeIds.has(conn.node))
        );
      }
    }

    fixedWorkflow.connections = modifiedConnections;

    return {
      workflow: fixedWorkflow,
      appliedFix: {
        errorType: error.type,
        fixType: 'remove_invalid_connections',
        description: 'Removed connections to non-existent nodes',
        path: error.path,
        confidence: 0.8
      }
    };
  }

  private async fixForbiddenNodeType(
    error: ValidationError,
    workflow: N8nWorkflow
  ): Promise<{ workflow: N8nWorkflow; appliedFix: AppliedFix }> {
    const fixedWorkflow = { ...workflow };
    
    // Map of forbidden node types to safe alternatives
    const nodeTypeReplacements: Record<string, string> = {
      'n8n-nodes-base.malicious': 'n8n-nodes-base.noOp',
      'dangerous-node': 'n8n-nodes-base.noOp'
    };

    fixedWorkflow.nodes = workflow.nodes.map(node => {
      if (nodeTypeReplacements[node.type]) {
        return {
          ...node,
          type: nodeTypeReplacements[node.type],
          parameters: {} // Reset parameters for safety
        };
      }
      return node;
    });

    return {
      workflow: fixedWorkflow,
      appliedFix: {
        errorType: error.type,
        fixType: 'replace_forbidden_node_type',
        description: 'Replaced forbidden node types with safe alternatives',
        path: error.path,
        confidence: 0.75
      }
    };
  }

  private async aiContextualFix(
    error: ValidationError,
    workflow: N8nWorkflow
  ): Promise<{ workflow: N8nWorkflow; appliedFix: AppliedFix }> {
    // This would integrate with OpenAI to provide contextual fixes
    // For now, we'll implement a simple heuristic-based approach
    
    console.log(`🤖 Attempting AI contextual fix for: ${error.message}`);
    
    // Placeholder for AI integration
    // In production, this would send the workflow and error to GPT-4
    // and ask for a specific fix with high confidence
    
    return {
      workflow: workflow, // No changes for now
      appliedFix: {
        errorType: error.type,
        fixType: 'ai_contextual',
        description: 'AI contextual fix (placeholder)',
        confidence: 0.5
      }
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private prioritizeErrors(errors: ValidationError[]): ValidationError[] {
    return errors.sort((a, b) => {
      // Sort by severity first, then by fixability
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) return severityDiff;
      
      // Prefer fixable errors
      if (a.fixable && !b.fixable) return -1;
      if (!a.fixable && b.fixable) return 1;
      
      return 0;
    });
  }

  private findBestStrategy(error: ValidationError, workflow: N8nWorkflow): HealingStrategy | null {
    for (const [name, strategy] of this.strategies) {
      if (strategy.canFix(error, workflow)) {
        return strategy;
      }
    }
    return null;
  }

  private isErrorResolved(error: ValidationError, appliedFix: AppliedFix): boolean {
    // Check if the applied fix likely resolved this error
    return appliedFix.errorType === error.type && 
           (appliedFix.path === error.path || !error.path);
  }

  private calculateOverallConfidence(appliedFixes: AppliedFix[]): number {
    if (appliedFixes.length === 0) return 0;
    
    const totalConfidence = appliedFixes.reduce((sum, fix) => sum + fix.confidence, 0);
    return totalConfidence / appliedFixes.length;
  }

  private isComplexError(error: ValidationError): boolean {
    const complexTypes = ['circular_dependency', 'orphaned_nodes', 'invalid_workflow_structure'];
    return complexTypes.includes(error.type) || error.message.length > 100;
  }

  private updateConnectionIds(
    connections: Record<string, any>,
    idMap: Map<string, string>
  ): Record<string, any> {
    const updated = { ...connections };

    for (const [oldId, newId] of idMap) {
      // Update connection keys
      if (updated[oldId]) {
        updated[newId] = updated[oldId];
        delete updated[oldId];
      }

      // Update connection targets
      for (const [sourceNode, nodeConnections] of Object.entries(updated)) {
        if (nodeConnections.main) {
          nodeConnections.main = nodeConnections.main.map((connectionGroup: any[]) =>
            connectionGroup.map((conn: any) => ({
              ...conn,
              node: idMap.get(conn.node) || conn.node
            }))
          );
        }
      }
    }

    return updated;
  }

  private findOrphanedNodes(nodes: N8nNode[], connections: Record<string, any>): N8nNode[] {
    // Implementation similar to the one in validation pipeline
    const connectedNodes = new Set<string>();
    
    for (const [source, targets] of Object.entries(connections)) {
      connectedNodes.add(source);
      if (targets.main) {
        for (const targetGroup of targets.main) {
          for (const target of targetGroup) {
            connectedNodes.add(target.node);
          }
        }
      }
    }

    return nodes.filter(node => 
      !connectedNodes.has(node.name) && 
      !node.type.includes('start') &&
      !node.type.includes('trigger')
    );
  }

  private detectCycles(nodes: N8nNode[], connections: Record<string, any>): string[][] {
    // Simplified cycle detection - would need proper implementation
    // This is a placeholder that returns empty array
    return [];
  }

  private async attemptAIHealing(
    workflow: N8nWorkflow,
    errors: ValidationError[]
  ): Promise<HealingResult> {
    // Placeholder for AI-powered healing
    // This would integrate with OpenAI API to provide intelligent fixes
    
    console.log('🤖 AI healing not yet implemented');
    
    return {
      success: false,
      healed: false,
      appliedFixes: [],
      remainingErrors: errors,
      confidence: 0
    };
  }

  private async updateExecutionStatus(
    executionId: string,
    status: string,
    data: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('workflow_executions')
        .update({
          status: status as any,
          validation_progress: {
            ...data,
            timestamp: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', executionId);
    } catch (error) {
      console.error('Failed to update execution status:', error);
    }
  }

  private async storeHealedWorkflow(
    executionId: string,
    healedWorkflow: N8nWorkflow,
    appliedFixes: AppliedFix[]
  ): Promise<void> {
    try {
      await this.supabase
        .from('workflow_executions')
        .update({
          workflow_json: healedWorkflow,
          metadata: {
            auto_healed: true,
            applied_fixes: appliedFixes,
            healing_timestamp: new Date().toISOString()
          }
        })
        .eq('id', executionId);

      console.log(`💾 Stored healed workflow for execution ${executionId}`);
    } catch (error) {
      console.error('Failed to store healed workflow:', error);
    }
  }

  /**
   * Initialize the auto-healer queue processor
   */
  async startAutoHealProcessor(): Promise<void> {
    queueManager.startProcessor('auto_heal', async (job: any) => {
      const { execution_id, layer, errors } = job;
      
      // Fetch the original workflow
      const { data: execution } = await this.supabase
        .from('workflow_executions')
        .select('workflow_json, user_id')
        .eq('id', execution_id)
        .single();

      if (!execution) {
        throw new Error(`Execution ${execution_id} not found`);
      }

      // Attempt healing
      const healingResult = await this.healWorkflow(
        execution_id,
        execution.workflow_json as N8nWorkflow,
        errors
      );

      if (healingResult.success && healingResult.workflow) {
        // Re-queue for validation
        await queueManager.addJob('workflow_validation', {
          execution_id,
          workflow: healingResult.workflow,
          user_id: execution.user_id,
          retry_after_healing: true
        });
      }

      console.log(`🔧 Auto-heal completed for ${execution_id}: ${healingResult.success ? 'SUCCESS' : 'FAILED'}`);
    }, {
      visibilityTimeout: 120, // 2 minutes for healing
      batchSize: 5
    });

    console.log('🚀 Auto-heal processor started');
  }

  /**
   * Get healing statistics
   */
  async getHealingStats(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<{
    totalAttempts: number;
    successfulHeals: number;
    successRate: number;
    commonErrorTypes: Array<{ type: string; count: number }>;
  }> {
    const interval = timeframe === 'day' ? '1 day' : 
                    timeframe === 'week' ? '7 days' : '30 days';

    const { data, error } = await this.supabase
      .from('workflow_executions')
      .select('metadata, status')
      .gte('created_at', `now() - interval '${interval}'`)
      .not('metadata->auto_healed', 'is', null);

    if (error) {
      console.error('Failed to fetch healing stats:', error);
      return { totalAttempts: 0, successfulHeals: 0, successRate: 0, commonErrorTypes: [] };
    }

    const totalAttempts = data.length;
    const successfulHeals = data.filter(d => d.status === 'completed').length;
    const successRate = totalAttempts > 0 ? (successfulHeals / totalAttempts) * 100 : 0;

    // Analyze common error types (would need more sophisticated analysis)
    const commonErrorTypes = [
      { type: 'missing_required_property', count: 0 },
      { type: 'duplicate_node_ids', count: 0 },
      { type: 'invalid_connection', count: 0 }
    ];

    return {
      totalAttempts,
      successfulHeals,
      successRate,
      commonErrorTypes
    };
  }
}

// Export singleton instance
export const autoHealer = new WorkflowAutoHealer();