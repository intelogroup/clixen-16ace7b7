import Ajv, { JSONSchemaType, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { z } from 'zod';
import { queueManager } from '../queues/SupabaseQueueManager';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// ============================================================================
// Type Definitions
// ============================================================================

export interface N8nWorkflow {
  id?: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
  staticData?: Record<string, any>;
  meta?: Record<string, any>;
  pinData?: Record<string, any>;
  versionId?: string;
  tags?: string[];
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
  disabled?: boolean;
  notes?: string;
  color?: string;
}

export interface ValidationResult {
  valid: boolean;
  executionId?: string;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  performance?: PerformanceMetrics;
  autoHealed?: boolean;
}

export interface ValidationError {
  layer: 'structure' | 'business' | 'compatibility' | 'deployment';
  type: string;
  message: string;
  path?: string;
  suggestion?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fixable: boolean;
}

export interface ValidationWarning {
  type: string;
  message: string;
  path?: string;
  suggestion?: string;
}

export interface PerformanceMetrics {
  structureValidation: number; // ms
  businessValidation: number; // ms
  compatibilityValidation: number; // ms
  totalValidation: number; // ms
  queueTime?: number; // ms
}

// ============================================================================
// JSON Schema for n8n Workflow Structure
// ============================================================================

const n8nWorkflowSchema: JSONSchemaType<N8nWorkflow> = {
  type: 'object',
  properties: {
    id: { type: 'string', nullable: true },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    active: { type: 'boolean' },
    nodes: {
      type: 'array',
      minItems: 1,
      maxItems: 100, // Reasonable limit
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', minLength: 1 },
          name: { type: 'string', minLength: 1, maxLength: 100 },
          type: { type: 'string', minLength: 1 },
          typeVersion: { type: 'number', minimum: 1 },
          position: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2
          },
          parameters: { type: 'object' },
          credentials: { type: 'object', nullable: true },
          disabled: { type: 'boolean', nullable: true },
          notes: { type: 'string', nullable: true },
          color: { type: 'string', nullable: true }
        },
        required: ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'],
        additionalProperties: false
      }
    },
    connections: { type: 'object' },
    settings: { type: 'object', nullable: true },
    staticData: { type: 'object', nullable: true },
    meta: { type: 'object', nullable: true },
    pinData: { type: 'object', nullable: true },
    versionId: { type: 'string', nullable: true },
    tags: {
      type: 'array',
      items: { type: 'string' },
      nullable: true
    }
  },
  required: ['name', 'active', 'nodes', 'connections'],
  additionalProperties: false
};

// ============================================================================
// Business Rules Schema (Zod)
// ============================================================================

const nodeParametersSchema = z.record(z.any());

const n8nNodeBusinessSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  type: z.string().min(1).refine(
    (type) => !type.includes('..') && !type.includes('__proto__'),
    'Invalid node type'
  ),
  typeVersion: z.number().int().min(1).max(10),
  position: z.tuple([z.number(), z.number()]),
  parameters: nodeParametersSchema,
  credentials: z.record(z.string()).optional(),
  disabled: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

const workflowBusinessSchema = z.object({
  name: z.string()
    .min(1, 'Workflow name is required')
    .max(255, 'Workflow name too long')
    .refine(
      (name) => !/[<>:"/\\|?*]/.test(name),
      'Workflow name contains invalid characters'
    ),
  active: z.boolean(),
  nodes: z.array(n8nNodeBusinessSchema)
    .min(1, 'At least one node is required')
    .max(50, 'Too many nodes (max: 50)')
    .refine(
      (nodes) => new Set(nodes.map(n => n.id)).size === nodes.length,
      'Duplicate node IDs found'
    ),
  connections: z.record(z.any()),
  settings: z.record(z.any()).optional(),
  staticData: z.record(z.any()).optional(),
  meta: z.record(z.any()).optional(),
  pinData: z.record(z.any()).optional(),
  versionId: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional()
});

// ============================================================================
// Main Validation Pipeline Class
// ============================================================================

export class WorkflowValidationPipeline {
  private ajv: Ajv;
  private supabase: SupabaseClient<Database>;
  private readonly TIMEOUT_MS = 30000; // 30 seconds

  constructor() {
    // Initialize AJV with optimizations
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false, // More permissive for n8n compatibility
      removeAdditional: false, // Don't modify the data
      useDefaults: true,
      coerceTypes: false // Strict type checking
    });
    
    addFormats(this.ajv);
    this.ajv.compile(n8nWorkflowSchema); // Pre-compile schema
    
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Main validation entry point
   */
  async validateWorkflow(
    workflow: unknown,
    userId: string,
    options: {
      autoHeal?: boolean;
      skipDeploymentTest?: boolean;
      webhook?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<ValidationResult> {
    const startTime = performance.now();
    const executionId = crypto.randomUUID();

    try {
      // Create execution record
      await this.createExecutionRecord(executionId, userId, workflow, options);

      // Layer 1: Structure Validation (AJV)
      const structureStart = performance.now();
      const structureResult = await this.validateStructure(workflow);
      const structureTime = performance.now() - structureStart;

      await this.updateExecutionProgress(
        executionId, 
        'structure_validated', 
        structureResult
      );

      if (!structureResult.valid) {
        return this.handleValidationFailure(
          executionId,
          'structure',
          structureResult.errors!,
          { structureValidation: structureTime },
          options.autoHeal
        );
      }

      // Layer 2: Business Rules Validation (Zod)
      const businessStart = performance.now();
      const businessResult = await this.validateBusinessRules(workflow as N8nWorkflow);
      const businessTime = performance.now() - businessStart;

      await this.updateExecutionProgress(
        executionId,
        'business_validated',
        businessResult
      );

      if (!businessResult.valid) {
        return this.handleValidationFailure(
          executionId,
          'business',
          businessResult.errors!,
          { 
            structureValidation: structureTime,
            businessValidation: businessTime
          },
          options.autoHeal
        );
      }

      // Layer 3: n8n Compatibility Validation
      const compatibilityStart = performance.now();
      const compatibilityResult = await this.validateN8nCompatibility(workflow as N8nWorkflow);
      const compatibilityTime = performance.now() - compatibilityStart;

      await this.updateExecutionProgress(
        executionId,
        'compatibility_validated',
        compatibilityResult
      );

      const totalTime = performance.now() - startTime;
      const performanceMetrics: PerformanceMetrics = {
        structureValidation: structureTime,
        businessValidation: businessTime,
        compatibilityValidation: compatibilityTime,
        totalValidation: totalTime
      };

      if (!compatibilityResult.valid) {
        return this.handleValidationFailure(
          executionId,
          'compatibility',
          compatibilityResult.errors!,
          performanceMetrics,
          options.autoHeal
        );
      }

      // Layer 4: Deployment Test (if enabled)
      if (!options.skipDeploymentTest) {
        await this.queueDeploymentTest(executionId, workflow as N8nWorkflow);
      }

      // Success!
      await this.completeExecution(executionId, performanceMetrics);

      return {
        valid: true,
        executionId,
        performance: performanceMetrics,
        warnings: [
          ...structureResult.warnings || [],
          ...businessResult.warnings || [],
          ...compatibilityResult.warnings || []
        ]
      };

    } catch (error) {
      await this.handleSystemError(executionId, error as Error);
      throw error;
    }
  }

  /**
   * Layer 1: Structure Validation using AJV
   */
  private async validateStructure(workflow: unknown): Promise<{
    valid: boolean;
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
  }> {
    const validate = this.ajv.getSchema('#/definitions/N8nWorkflow') || 
                     this.ajv.compile(n8nWorkflowSchema);

    const valid = validate(workflow);

    if (!valid) {
      const errors: ValidationError[] = (validate.errors || []).map(error => ({
        layer: 'structure',
        type: error.keyword || 'validation_error',
        message: this.formatAjvError(error),
        path: error.instancePath,
        suggestion: this.getStructureSuggestion(error),
        severity: this.getErrorSeverity(error),
        fixable: this.isErrorFixable(error)
      }));

      return { valid: false, errors };
    }

    // Generate warnings for best practices
    const warnings = this.generateStructureWarnings(workflow as N8nWorkflow);

    return { valid: true, warnings };
  }

  /**
   * Layer 2: Business Rules Validation using Zod
   */
  private async validateBusinessRules(workflow: N8nWorkflow): Promise<{
    valid: boolean;
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
  }> {
    try {
      const result = workflowBusinessSchema.safeParse(workflow);

      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map(error => ({
          layer: 'business',
          type: error.code,
          message: error.message,
          path: error.path.join('.'),
          suggestion: this.getBusinessSuggestion(error),
          severity: this.getZodErrorSeverity(error),
          fixable: true
        }));

        return { valid: false, errors };
      }

      // Additional business logic validation
      const businessErrors = await this.validateCustomBusinessRules(workflow);
      if (businessErrors.length > 0) {
        return { valid: false, errors: businessErrors };
      }

      const warnings = this.generateBusinessWarnings(workflow);
      return { valid: true, warnings };

    } catch (error) {
      return {
        valid: false,
        errors: [{
          layer: 'business',
          type: 'system_error',
          message: `Business validation failed: ${(error as Error).message}`,
          severity: 'critical',
          fixable: false
        }]
      };
    }
  }

  /**
   * Layer 3: n8n Compatibility Validation
   */
  private async validateN8nCompatibility(workflow: N8nWorkflow): Promise<{
    valid: boolean;
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Check node types availability
      const nodeTypeErrors = await this.validateNodeTypes(workflow.nodes);
      errors.push(...nodeTypeErrors);

      // Check connections validity
      const connectionErrors = this.validateConnections(workflow.nodes, workflow.connections);
      errors.push(...connectionErrors);

      // Check credential requirements
      const credentialErrors = await this.validateCredentials(workflow.nodes);
      errors.push(...credentialErrors);

      // Performance warnings
      const performanceWarnings = this.generatePerformanceWarnings(workflow);
      warnings.push(...performanceWarnings);

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      return {
        valid: false,
        errors: [{
          layer: 'compatibility',
          type: 'system_error',
          message: `Compatibility validation failed: ${(error as Error).message}`,
          severity: 'critical',
          fixable: false
        }]
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async createExecutionRecord(
    executionId: string,
    userId: string,
    workflow: unknown,
    options: any
  ): Promise<void> {
    const { error } = await this.supabase
      .from('workflow_executions')
      .insert({
        id: executionId,
        user_id: userId,
        workflow_json: workflow as any,
        status: 'validating',
        webhook_url: options.webhook,
        metadata: options.metadata || {},
        started_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to create execution record: ${error.message}`);
    }
  }

  private async updateExecutionProgress(
    executionId: string,
    status: string,
    result: any
  ): Promise<void> {
    const progress = {
      [status]: {
        timestamp: new Date().toISOString(),
        result: result
      }
    };

    const { error } = await this.supabase
      .from('workflow_executions')
      .update({
        status: status as any,
        validation_progress: progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId);

    if (error) {
      console.error('Failed to update execution progress:', error);
    }
  }

  private async handleValidationFailure(
    executionId: string,
    layer: string,
    errors: ValidationError[],
    performance: Partial<PerformanceMetrics>,
    autoHeal?: boolean
  ): Promise<ValidationResult> {
    // Update execution with failure
    await this.supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        error_details: { layer, errors },
        execution_time: performance.totalValidation,
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId);

    // Queue for auto-heal if enabled and errors are fixable
    if (autoHeal && errors.some(e => e.fixable)) {
      await queueManager.addJob('auto_heal', {
        execution_id: executionId,
        layer,
        errors
      });
    }

    return {
      valid: false,
      executionId,
      errors,
      performance: performance as PerformanceMetrics
    };
  }

  private async queueDeploymentTest(executionId: string, workflow: N8nWorkflow): Promise<void> {
    await queueManager.addJob('deployment_test', {
      execution_id: executionId,
      workflow
    });

    await this.updateExecutionProgress(executionId, 'testing', {
      message: 'Queued for deployment test'
    });
  }

  private async completeExecution(
    executionId: string,
    performance: PerformanceMetrics
  ): Promise<void> {
    await this.supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        execution_time: Math.round(performance.totalValidation),
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId);
  }

  private async handleSystemError(executionId: string, error: Error): Promise<void> {
    await this.supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        error_details: {
          type: 'system_error',
          message: error.message,
          stack: error.stack
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId);
  }

  // ============================================================================
  // Validation Helper Methods
  // ============================================================================

  private formatAjvError(error: ErrorObject): string {
    const path = error.instancePath || 'root';
    
    switch (error.keyword) {
      case 'required':
        return `Missing required property: ${error.params?.missingProperty}`;
      case 'type':
        return `Expected ${error.params?.type} but got ${typeof error.data}`;
      case 'minLength':
        return `Minimum length is ${error.params?.limit}`;
      case 'maxLength':
        return `Maximum length is ${error.params?.limit}`;
      case 'minimum':
        return `Minimum value is ${error.params?.limit}`;
      case 'maximum':
        return `Maximum value is ${error.params?.limit}`;
      default:
        return error.message || 'Validation error';
    }
  }

  private getStructureSuggestion(error: ErrorObject): string {
    switch (error.keyword) {
      case 'required':
        return `Add the required property: ${error.params?.missingProperty}`;
      case 'type':
        return `Change the value to type: ${error.params?.type}`;
      case 'minLength':
        return `Increase the length to at least ${error.params?.limit} characters`;
      case 'maxLength':
        return `Reduce the length to maximum ${error.params?.limit} characters`;
      default:
        return 'Check the n8n workflow documentation for correct format';
    }
  }

  private getErrorSeverity(error: ErrorObject): ValidationError['severity'] {
    const criticalKeywords = ['required', 'type'];
    const highKeywords = ['minLength', 'maxLength', 'minimum', 'maximum'];
    
    if (criticalKeywords.includes(error.keyword || '')) return 'critical';
    if (highKeywords.includes(error.keyword || '')) return 'high';
    return 'medium';
  }

  private isErrorFixable(error: ErrorObject): boolean {
    const unfixableKeywords = ['type']; // Type mismatches usually require manual intervention
    return !unfixableKeywords.includes(error.keyword || '');
  }

  private getBusinessSuggestion(error: z.ZodIssue): string {
    switch (error.code) {
      case 'too_small':
        return `Minimum ${error.minimum} items required`;
      case 'too_big':
        return `Maximum ${error.maximum} items allowed`;
      case 'invalid_string':
        return 'String format is invalid';
      default:
        return 'Check the business rules for this field';
    }
  }

  private getZodErrorSeverity(error: z.ZodIssue): ValidationError['severity'] {
    const criticalCodes = ['invalid_type', 'required'];
    const highCodes = ['too_small', 'too_big'];
    
    if (criticalCodes.includes(error.code)) return 'critical';
    if (highCodes.includes(error.code)) return 'high';
    return 'medium';
  }

  private async validateCustomBusinessRules(workflow: N8nWorkflow): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check for circular dependencies
    if (this.hasCircularDependencies(workflow.nodes, workflow.connections)) {
      errors.push({
        layer: 'business',
        type: 'circular_dependency',
        message: 'Workflow contains circular dependencies',
        suggestion: 'Remove connections that create loops',
        severity: 'high',
        fixable: true
      });
    }

    // Check for orphaned nodes
    const orphanedNodes = this.findOrphanedNodes(workflow.nodes, workflow.connections);
    if (orphanedNodes.length > 0) {
      errors.push({
        layer: 'business',
        type: 'orphaned_nodes',
        message: `Found ${orphanedNodes.length} disconnected nodes`,
        suggestion: 'Connect all nodes or remove unused ones',
        severity: 'medium',
        fixable: true
      });
    }

    return errors;
  }

  private generateStructureWarnings(workflow: N8nWorkflow): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for missing descriptions
    const nodesWithoutNotes = workflow.nodes.filter(node => !node.notes);
    if (nodesWithoutNotes.length > workflow.nodes.length * 0.5) {
      warnings.push({
        type: 'documentation',
        message: 'Many nodes lack documentation',
        suggestion: 'Add notes to nodes for better maintainability'
      });
    }

    return warnings;
  }

  private generateBusinessWarnings(workflow: N8nWorkflow): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for complex workflows
    if (workflow.nodes.length > 20) {
      warnings.push({
        type: 'complexity',
        message: 'Workflow is quite complex',
        suggestion: 'Consider breaking into smaller sub-workflows'
      });
    }

    return warnings;
  }

  private async validateNodeTypes(nodes: N8nNode[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    // This would typically check against n8n's available node types
    // For now, we'll implement basic validation
    const forbiddenTypes = ['n8n-nodes-base.malicious', 'dangerous-node'];
    
    for (const node of nodes) {
      if (forbiddenTypes.includes(node.type)) {
        errors.push({
          layer: 'compatibility',
          type: 'forbidden_node_type',
          message: `Node type '${node.type}' is not allowed`,
          path: `nodes.${node.id}`,
          suggestion: 'Use an alternative node type',
          severity: 'critical',
          fixable: true
        });
      }
    }

    return errors;
  }

  private validateConnections(nodes: N8nNode[], connections: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));

    // Validate that all connections reference existing nodes
    for (const [sourceNodeName, sourceConnections] of Object.entries(connections)) {
      if (!nodeIds.has(sourceNodeName)) {
        errors.push({
          layer: 'compatibility',
          type: 'invalid_connection',
          message: `Connection references non-existent node: ${sourceNodeName}`,
          path: `connections.${sourceNodeName}`,
          suggestion: 'Remove invalid connections or add missing nodes',
          severity: 'high',
          fixable: true
        });
      }
    }

    return errors;
  }

  private async validateCredentials(nodes: N8nNode[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check for nodes that require credentials but don't have them
    const nodesRequiringCredentials = ['n8n-nodes-base.gmail', 'n8n-nodes-base.googleDrive'];
    
    for (const node of nodes) {
      if (nodesRequiringCredentials.includes(node.type) && !node.credentials) {
        errors.push({
          layer: 'compatibility',
          type: 'missing_credentials',
          message: `Node '${node.name}' requires credentials`,
          path: `nodes.${node.id}`,
          suggestion: 'Add required credentials for this node',
          severity: 'high',
          fixable: false // Requires user intervention
        });
      }
    }

    return errors;
  }

  private generatePerformanceWarnings(workflow: N8nWorkflow): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for potential performance issues
    const httpNodes = workflow.nodes.filter(n => n.type.includes('http'));
    if (httpNodes.length > 10) {
      warnings.push({
        type: 'performance',
        message: 'Many HTTP nodes may cause performance issues',
        suggestion: 'Consider using batch operations or sub-workflows'
      });
    }

    return warnings;
  }

  private hasCircularDependencies(nodes: N8nNode[], connections: Record<string, any>): boolean {
    // Simple cycle detection - would need more sophisticated implementation
    // This is a placeholder for the actual algorithm
    return false;
  }

  private findOrphanedNodes(nodes: N8nNode[], connections: Record<string, any>): N8nNode[] {
    const connectedNodes = new Set();
    
    // Add all nodes that appear in connections
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

    // Find nodes not in connections (except start nodes)
    return nodes.filter(node => 
      !connectedNodes.has(node.name) && 
      !node.type.includes('start') &&
      !node.type.includes('trigger')
    );
  }
}

// Export singleton instance
export const validationPipeline = new WorkflowValidationPipeline();