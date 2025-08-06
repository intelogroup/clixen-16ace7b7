/**
 * WorkflowErrorHealer - Intelligent error detection and healing for n8n workflows
 * This agent analyzes n8n API errors and automatically fixes common issues
 */

import { BaseAgent } from './BaseAgent';
import { AgentConfig, AgentContext } from './types';

export interface N8nError {
  message: string;
  code?: string;
  field?: string;
  value?: any;
  context?: any;
}

export interface HealingResult {
  success: boolean;
  healedWorkflow?: any;
  appliedFixes: string[];
  remainingErrors: N8nError[];
  recommendations: string[];
}

export class WorkflowErrorHealer extends BaseAgent {
  private healingRules: Map<string, Function> = new Map();
  private errorPatterns: Map<string, RegExp> = new Map();

  constructor(context: AgentContext) {
    const config: AgentConfig = {
      id: 'workflow-error-healer',
      name: 'Workflow Error Healer',
      type: 'specialist',
      capabilities: [
        {
          name: 'error_detection',
          description: 'Detect and categorize n8n workflow errors',
          inputs: ['error_response', 'original_workflow'],
          outputs: ['error_classification', 'severity_assessment'],
          dependencies: [],
          reliability: 0.95
        },
        {
          name: 'workflow_healing',
          description: 'Automatically fix common workflow issues',
          inputs: ['workflow_json', 'error_list'],
          outputs: ['healed_workflow', 'healing_report'],
          dependencies: ['error_detection'],
          reliability: 0.88
        },
        {
          name: 'validation_feedback',
          description: 'Provide recommendations for complex errors',
          inputs: ['unfixable_errors', 'workflow_context'],
          outputs: ['recommendations', 'manual_fix_guide'],
          dependencies: ['error_detection'],
          reliability: 0.92
        }
      ],
      model: 'gpt-4',
      temperature: 0.1, // Low temperature for precise healing
      maxTokens: 2000,
      systemPrompt: this.getSystemPrompt(),
      tools: ['json_manipulation', 'schema_validation', 'pattern_matching'],
      fallbackAgent: undefined
    };

    super(config, context);
    this.initializeHealingRules();
    this.initializeErrorPatterns();
  }

  private getSystemPrompt(): string {
    return `You are the Workflow Error Healer Agent, specialized in detecting and automatically fixing n8n workflow errors.

Your expertise includes:
1. N8N API ERROR ANALYSIS: Deep understanding of n8n API validation rules and error messages
2. AUTOMATIC HEALING: Smart fixes for common workflow structure issues
3. JSON MANIPULATION: Precise modification of workflow JSON structures
4. ERROR PREVENTION: Proactive identification of potential issues
5. HEALING RECOMMENDATIONS: Guidance for complex errors requiring human intervention

Common n8n API errors and fixes:
- "active is read-only": Remove 'active' field from workflow JSON
- "Invalid node type": Fix node type strings and versions
- "Missing required parameter": Add default values for required fields
- "Invalid connection": Fix node name references in connections
- "Invalid position": Ensure position arrays have exactly 2 numbers
- "Missing node ID": Generate unique IDs for all nodes
- "Duplicate node names": Make node names unique
- "Invalid webhook path": Fix webhook path formatting
- "Missing typeVersion": Add correct typeVersion for node types

Your healing process:
1. Parse and classify all errors from n8n API response
2. Apply automatic fixes for known error patterns
3. Validate the healed workflow structure
4. Provide recommendations for manual fixes when needed
5. Generate a comprehensive healing report

CRITICAL: Always preserve the workflow's intended functionality while fixing structural issues.`;
  }

  private initializeHealingRules(): void {
    // Rule: Remove read-only fields
    this.healingRules.set('remove_readonly_fields', (workflow: any) => {
      const readonlyFields = ['active', 'id', 'createdAt', 'updatedAt', 'versionId', 'triggerCount'];
      const cleaned = { ...workflow };
      
      readonlyFields.forEach(field => {
        if (field in cleaned) {
          delete cleaned[field];
        }
      });

      // Also clean nodes
      if (cleaned.nodes) {
        cleaned.nodes = cleaned.nodes.map((node: any) => {
          const cleanNode = { ...node };
          ['createdAt', 'updatedAt', 'disabled'].forEach(field => {
            if (field in cleanNode) {
              delete cleanNode[field];
            }
          });
          return cleanNode;
        });
      }

      return cleaned;
    });

    // Rule: Fix node structure
    this.healingRules.set('fix_node_structure', (workflow: any) => {
      if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
        workflow.nodes = [];
        return workflow;
      }

      workflow.nodes = workflow.nodes.map((node: any, index: number) => {
        // Ensure required fields
        if (!node.id) {
          node.id = `node-${index}-${Date.now()}`;
        }
        if (!node.name) {
          node.name = `Node ${index + 1}`;
        }
        if (!node.type) {
          node.type = 'n8n-nodes-base.set';
        }
        if (!node.typeVersion) {
          node.typeVersion = 1;
        }
        if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
          node.position = [240 + (index * 220), 300];
        }
        if (!node.parameters) {
          node.parameters = {};
        }

        // Fix position values to be numbers
        node.position = node.position.map((pos: any) => {
          const num = Number(pos);
          return isNaN(num) ? 300 : num;
        });

        return node;
      });

      return workflow;
    });

    // Rule: Fix connections
    this.healingRules.set('fix_connections', (workflow: any) => {
      if (!workflow.connections || typeof workflow.connections !== 'object') {
        workflow.connections = {};
        return workflow;
      }

      const nodeNames = new Set((workflow.nodes || []).map((n: any) => n.name));
      const validConnections: any = {};

      for (const [sourceNode, connections] of Object.entries(workflow.connections)) {
        if (nodeNames.has(sourceNode) && connections && typeof connections === 'object') {
          const conn = connections as any;
          if (conn.main && Array.isArray(conn.main)) {
            const validMainConnections = conn.main.map((outputGroup: any[]) => {
              if (!Array.isArray(outputGroup)) return [];
              return outputGroup.filter((connection: any) => 
                connection && 
                typeof connection === 'object' && 
                connection.node && 
                nodeNames.has(connection.node)
              ).map((connection: any) => ({
                node: connection.node,
                type: connection.type || 'main',
                index: connection.index || 0
              }));
            }).filter((group: any[]) => group.length > 0);

            if (validMainConnections.length > 0) {
              validConnections[sourceNode] = { main: validMainConnections };
            }
          }
        }
      }

      workflow.connections = validConnections;
      return workflow;
    });

    // Rule: Add required fields
    this.healingRules.set('add_required_fields', (workflow: any) => {
      if (!workflow.name) {
        workflow.name = `Healed Workflow ${Date.now()}`;
      }
      if (!workflow.settings) {
        workflow.settings = {};
      }
      if (!workflow.staticData) {
        workflow.staticData = {};
      }

      return workflow;
    });

    // Rule: Fix webhook paths
    this.healingRules.set('fix_webhook_paths', (workflow: any) => {
      if (workflow.nodes) {
        workflow.nodes = workflow.nodes.map((node: any) => {
          if (node.type === 'n8n-nodes-base.webhook' && node.parameters && node.parameters.path) {
            let path = node.parameters.path;
            
            // Ensure path starts with /
            if (!path.startsWith('/')) {
              path = '/' + path;
            }
            
            // Remove invalid characters and spaces
            path = path.replace(/[^a-zA-Z0-9\-\_\/]/g, '-').toLowerCase();
            
            node.parameters.path = path;
          }
          return node;
        });
      }

      return workflow;
    });

    // Rule: Fix node names to be unique
    this.healingRules.set('make_node_names_unique', (workflow: any) => {
      if (!workflow.nodes) return workflow;

      const usedNames = new Set<string>();
      const nameMap = new Map<string, string>();

      workflow.nodes = workflow.nodes.map((node: any) => {
        let originalName = node.name;
        let uniqueName = originalName;
        let counter = 1;

        while (usedNames.has(uniqueName)) {
          uniqueName = `${originalName} ${counter}`;
          counter++;
        }

        usedNames.add(uniqueName);
        
        if (uniqueName !== originalName) {
          nameMap.set(originalName, uniqueName);
        }
        
        node.name = uniqueName;
        return node;
      });

      // Update connections to use new names
      if (workflow.connections) {
        const updatedConnections: any = {};
        
        for (const [sourceNode, connections] of Object.entries(workflow.connections)) {
          const newSourceName = nameMap.get(sourceNode) || sourceNode;
          
          if (connections && typeof connections === 'object') {
            const conn = connections as any;
            if (conn.main && Array.isArray(conn.main)) {
              conn.main = conn.main.map((outputGroup: any[]) => {
                return outputGroup.map((connection: any) => ({
                  ...connection,
                  node: nameMap.get(connection.node) || connection.node
                }));
              });
            }
          }
          
          updatedConnections[newSourceName] = connections;
        }
        
        workflow.connections = updatedConnections;
      }

      return workflow;
    });
  }

  private initializeErrorPatterns(): void {
    this.errorPatterns.set('readonly_field', /is read-only|read[-\s]?only/i);
    this.errorPatterns.set('missing_parameter', /missing.*parameter|required.*parameter/i);
    this.errorPatterns.set('invalid_type', /invalid.*type|unknown.*type/i);
    this.errorPatterns.set('invalid_connection', /invalid.*connection|connection.*error/i);
    this.errorPatterns.set('invalid_position', /invalid.*position|position.*error/i);
    this.errorPatterns.set('duplicate_name', /duplicate.*name|name.*already.*exists/i);
    this.errorPatterns.set('invalid_webhook', /invalid.*webhook|webhook.*path/i);
    this.errorPatterns.set('missing_id', /missing.*id|id.*required/i);
  }

  async healWorkflow(workflow: any, errors: N8nError[]): Promise<HealingResult> {
    this.updateProgress(10);
    
    let healedWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone
    const appliedFixes: string[] = [];
    const remainingErrors: N8nError[] = [];
    const recommendations: string[] = [];

    this.updateProgress(20);

    // Classify errors
    const errorClassification = this.classifyErrors(errors);
    
    this.updateProgress(40);

    // Apply healing rules based on error patterns
    if (errorClassification.readonly_field.length > 0) {
      healedWorkflow = this.healingRules.get('remove_readonly_fields')!(healedWorkflow);
      appliedFixes.push('Removed read-only fields (active, id, createdAt, etc.)');
    }

    if (errorClassification.invalid_type.length > 0 || errorClassification.missing_parameter.length > 0) {
      healedWorkflow = this.healingRules.get('fix_node_structure')!(healedWorkflow);
      appliedFixes.push('Fixed node structure and added missing required fields');
    }

    if (errorClassification.invalid_connection.length > 0) {
      healedWorkflow = this.healingRules.get('fix_connections')!(healedWorkflow);
      appliedFixes.push('Fixed invalid node connections');
    }

    if (errorClassification.duplicate_name.length > 0) {
      healedWorkflow = this.healingRules.get('make_node_names_unique')!(healedWorkflow);
      appliedFixes.push('Made node names unique');
    }

    if (errorClassification.invalid_webhook.length > 0) {
      healedWorkflow = this.healingRules.get('fix_webhook_paths')!(healedWorkflow);
      appliedFixes.push('Fixed webhook path formatting');
    }

    // Always apply basic required fields fix
    healedWorkflow = this.healingRules.get('add_required_fields')!(healedWorkflow);

    this.updateProgress(70);

    // Check for remaining unfixable errors and provide recommendations
    for (const error of errors) {
      const isHandled = this.isErrorHandled(error, appliedFixes);
      if (!isHandled) {
        remainingErrors.push(error);
        const recommendation = this.generateRecommendation(error);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    this.updateProgress(90);

    // Final validation
    const validationResult = await this.validateHealedWorkflow(healedWorkflow);
    if (validationResult.errors.length > 0) {
      remainingErrors.push(...validationResult.errors);
    }

    this.updateProgress(100);

    return {
      success: remainingErrors.length === 0,
      healedWorkflow,
      appliedFixes,
      remainingErrors,
      recommendations: [...recommendations, ...validationResult.recommendations]
    };
  }

  private classifyErrors(errors: N8nError[]): { [key: string]: N8nError[] } {
    const classification: { [key: string]: N8nError[] } = {
      readonly_field: [],
      missing_parameter: [],
      invalid_type: [],
      invalid_connection: [],
      invalid_position: [],
      duplicate_name: [],
      invalid_webhook: [],
      missing_id: [],
      other: []
    };

    for (const error of errors) {
      let classified = false;
      
      for (const [category, pattern] of this.errorPatterns.entries()) {
        if (pattern.test(error.message)) {
          classification[category].push(error);
          classified = true;
          break;
        }
      }
      
      if (!classified) {
        classification.other.push(error);
      }
    }

    return classification;
  }

  private isErrorHandled(error: N8nError, appliedFixes: string[]): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // Check if any applied fix addresses this error type
    if (errorMessage.includes('read-only') && appliedFixes.some(fix => fix.includes('read-only'))) {
      return true;
    }
    
    if (errorMessage.includes('node') && appliedFixes.some(fix => fix.includes('node structure'))) {
      return true;
    }
    
    if (errorMessage.includes('connection') && appliedFixes.some(fix => fix.includes('connections'))) {
      return true;
    }
    
    if (errorMessage.includes('duplicate') && appliedFixes.some(fix => fix.includes('unique'))) {
      return true;
    }
    
    if (errorMessage.includes('webhook') && appliedFixes.some(fix => fix.includes('webhook'))) {
      return true;
    }
    
    return false;
  }

  private generateRecommendation(error: N8nError): string | null {
    const message = error.message.toLowerCase();
    
    if (message.includes('credential')) {
      return 'This workflow requires credentials to be configured in n8n. Set up the necessary credentials before deploying.';
    }
    
    if (message.includes('permission')) {
      return 'Permission denied. Check API key permissions and user access rights.';
    }
    
    if (message.includes('limit') || message.includes('quota')) {
      return 'Rate limit or quota exceeded. Wait before retrying or check your plan limits.';
    }
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'Network connectivity issue. Check your internet connection and n8n server availability.';
    }
    
    return null;
  }

  private async validateHealedWorkflow(workflow: any): Promise<{ errors: N8nError[]; recommendations: string[] }> {
    const errors: N8nError[] = [];
    const recommendations: string[] = [];

    // Basic structure validation
    if (!workflow.name || typeof workflow.name !== 'string') {
      errors.push({ message: 'Workflow name is required and must be a string' });
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push({ message: 'Workflow must have a nodes array' });
    } else {
      // Validate each node
      for (const node of workflow.nodes) {
        if (!node.id) {
          errors.push({ message: `Node missing ID: ${node.name || 'unnamed'}` });
        }
        if (!node.type) {
          errors.push({ message: `Node missing type: ${node.name || 'unnamed'}` });
        }
        if (!Array.isArray(node.position) || node.position.length !== 2) {
          errors.push({ message: `Invalid position for node: ${node.name || 'unnamed'}` });
        }
      }
    }

    if (typeof workflow.connections !== 'object') {
      errors.push({ message: 'Workflow connections must be an object' });
    }

    // Performance recommendations
    if (workflow.nodes && workflow.nodes.length > 15) {
      recommendations.push('Consider breaking down large workflows into smaller sub-workflows for better performance');
    }

    const httpNodes = (workflow.nodes || []).filter((n: any) => n.type?.includes('http'));
    if (httpNodes.length > 8) {
      recommendations.push('Multiple HTTP requests detected - consider implementing caching or request batching');
    }

    return { errors, recommendations };
  }

  async processTask(task: any): Promise<any> {
    const { action, input } = task;

    switch (action) {
      case 'heal_workflow':
        return await this.healWorkflow(input.workflow, input.errors);
      
      case 'classify_errors':
        return this.classifyErrors(input.errors);
      
      case 'validate_workflow':
        return await this.validateHealedWorkflow(input.workflow);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  validateInput(input: any): boolean {
    return input && typeof input === 'object';
  }

  getCapabilities(): string[] {
    return this.config.capabilities.map(cap => cap.name);
  }
}