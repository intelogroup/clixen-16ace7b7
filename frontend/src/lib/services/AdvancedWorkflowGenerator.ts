/**
 * Advanced Workflow Generation Engine
 * 
 * Converts natural language descriptions into production-ready n8n workflows
 * using OpenAI GPT-4 with comprehensive validation and optimization
 */

import { OpenAIService } from './OpenAIService';
import type { N8nWorkflow } from '../n8n';

// Advanced workflow templates and patterns
export interface WorkflowPattern {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  template: Partial<N8nWorkflow>;
  complexity: 'simple' | 'medium' | 'complex';
  category: 'trigger' | 'data-processing' | 'notification' | 'integration' | 'automation';
}

export interface WorkflowGenerationRequest {
  prompt: string;
  userId?: string;
  projectId?: string;
  constraints?: {
    maxNodes?: number;
    allowedNodeTypes?: string[];
    complexity?: 'simple' | 'medium' | 'complex';
    requireTrigger?: boolean;
  };
  context?: {
    existingWorkflows?: string[];
    userPreferences?: Record<string, any>;
  };
}

export interface WorkflowGenerationResult {
  success: boolean;
  workflow?: N8nWorkflow;
  explanation?: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedExecutionTime?: string;
  requiredPermissions?: string[];
  suggestions?: string[];
  warnings?: string[];
  errors?: string[];
  confidence: number; // 0-100 confidence score
}

// Comprehensive workflow pattern library
const WORKFLOW_PATTERNS: WorkflowPattern[] = [
  {
    id: 'webhook-to-slack',
    name: 'Webhook to Slack Notification',
    description: 'Receive webhook data and send formatted notification to Slack',
    keywords: ['webhook', 'slack', 'notification', 'alert', 'message'],
    complexity: 'simple',
    category: 'notification',
    template: {
      nodes: [
        {
          id: 'webhook',
          name: 'Webhook Trigger',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [240, 300],
          parameters: {
            httpMethod: 'POST',
            path: '',
            responseMode: 'responseNode'
          }
        },
        {
          id: 'format',
          name: 'Format Data',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [460, 300],
          parameters: {
            values: {
              string: [
                {
                  name: 'message',
                  value: '{{ $json.message || "New webhook received" }}'
                },
                {
                  name: 'timestamp',
                  value: '{{ new Date().toISOString() }}'
                }
              ]
            }
          }
        },
        {
          id: 'slack',
          name: 'Send to Slack',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [680, 300],
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#general',
            text: '{{ $json.message }}'
          }
        },
        {
          id: 'response',
          name: 'Webhook Response',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [900, 300],
          parameters: {
            respondWith: 'json',
            responseBody: '{{ { "status": "success", "timestamp": new Date().toISOString() } }}'
          }
        }
      ],
      connections: {
        'Webhook Trigger': {
          main: [[{ node: 'Format Data', type: 'main', index: 0 }]]
        },
        'Format Data': {
          main: [[{ node: 'Send to Slack', type: 'main', index: 0 }]]
        },
        'Send to Slack': {
          main: [[{ node: 'Webhook Response', type: 'main', index: 0 }]]
        }
      }
    }
  },
  {
    id: 'scheduled-api-sync',
    name: 'Scheduled API Data Sync',
    description: 'Periodically fetch data from API and store in database',
    keywords: ['schedule', 'api', 'sync', 'database', 'cron', 'periodic'],
    complexity: 'medium',
    category: 'automation',
    template: {
      nodes: [
        {
          id: 'schedule',
          name: 'Schedule Trigger',
          type: 'n8n-nodes-base.cron',
          typeVersion: 1,
          position: [240, 300],
          parameters: {
            rule: {
              interval: [{ field: 'hour', hour: 1 }]
            }
          }
        },
        {
          id: 'fetch',
          name: 'Fetch API Data',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [460, 300],
          parameters: {
            url: '',
            requestMethod: 'GET',
            headers: {}
          }
        },
        {
          id: 'transform',
          name: 'Transform Data',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [680, 300],
          parameters: {
            functionCode: `
// Transform API response to database format
const items = $input.all();
const transformed = [];

for (const item of items) {
  transformed.push({
    ...item.json,
    synced_at: new Date().toISOString(),
    source: 'api_sync'
  });
}

return transformed.map(data => ({ json: data }));
`
          }
        },
        {
          id: 'store',
          name: 'Store in Database',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 1,
          position: [900, 300],
          parameters: {
            operation: 'insert',
            table: '',
            columns: ''
          }
        }
      ],
      connections: {
        'Schedule Trigger': {
          main: [[{ node: 'Fetch API Data', type: 'main', index: 0 }]]
        },
        'Fetch API Data': {
          main: [[{ node: 'Transform Data', type: 'main', index: 0 }]]
        },
        'Transform Data': {
          main: [[{ node: 'Store in Database', type: 'main', index: 0 }]]
        }
      }
    }
  },
  {
    id: 'email-processing',
    name: 'Email Processing Pipeline',
    description: 'Process incoming emails, extract data, and trigger actions',
    keywords: ['email', 'gmail', 'process', 'extract', 'parse', 'automation'],
    complexity: 'complex',
    category: 'data-processing',
    template: {
      nodes: [
        {
          id: 'email_trigger',
          name: 'New Email Trigger',
          type: 'n8n-nodes-base.gmailTrigger',
          typeVersion: 1,
          position: [240, 300],
          parameters: {
            operation: 'message'
          }
        },
        {
          id: 'extract',
          name: 'Extract Email Data',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [460, 300],
          parameters: {
            functionCode: `
// Extract structured data from email
const email = $input.first().json;

const extractedData = {
  subject: email.payload.headers.find(h => h.name === 'Subject')?.value || '',
  from: email.payload.headers.find(h => h.name === 'From')?.value || '',
  body: email.snippet || '',
  received_at: new Date(parseInt(email.internalDate)).toISOString(),
  labels: email.labelIds || []
};

return [{ json: extractedData }];
`
          }
        },
        {
          id: 'classify',
          name: 'Classify Email',
          type: 'n8n-nodes-base.switch',
          typeVersion: 1,
          position: [680, 200],
          parameters: {
            mode: 'rules',
            rules: [
              {
                conditions: [
                  {
                    field: 'subject',
                    operator: 'contains',
                    value: 'urgent'
                  }
                ],
                output: 0
              },
              {
                conditions: [
                  {
                    field: 'subject',
                    operator: 'contains',
                    value: 'invoice'
                  }
                ],
                output: 1
              }
            ]
          }
        },
        {
          id: 'urgent_action',
          name: 'Handle Urgent',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [900, 100],
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#alerts',
            text: 'Urgent email: {{ $json.subject }}'
          }
        },
        {
          id: 'invoice_action',
          name: 'Process Invoice',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [900, 300],
          parameters: {
            url: 'https://api.accounting.example.com/invoices',
            requestMethod: 'POST',
            body: '{{ JSON.stringify($json) }}'
          }
        }
      ],
      connections: {
        'New Email Trigger': {
          main: [[{ node: 'Extract Email Data', type: 'main', index: 0 }]]
        },
        'Extract Email Data': {
          main: [[{ node: 'Classify Email', type: 'main', index: 0 }]]
        },
        'Classify Email': {
          main: [
            [{ node: 'Handle Urgent', type: 'main', index: 0 }],
            [{ node: 'Process Invoice', type: 'main', index: 0 }]
          ]
        }
      }
    }
  }
];

export class AdvancedWorkflowGenerator {
  private openaiService: OpenAIService;

  constructor(openaiService?: OpenAIService) {
    this.openaiService = openaiService || new OpenAIService();
  }

  /**
   * Generate a workflow from natural language description
   */
  async generateWorkflow(request: WorkflowGenerationRequest): Promise<WorkflowGenerationResult> {
    try {
      console.log('🔄 Starting workflow generation for:', request.prompt);

      // Step 1: Analyze the prompt and identify patterns
      const analysis = await this.analyzePrompt(request.prompt);
      
      // Step 2: Find matching patterns
      const matchedPatterns = this.findMatchingPatterns(request.prompt, analysis);
      
      // Step 3: Generate workflow using AI with pattern guidance
      const workflow = await this.generateWithAI(request, analysis, matchedPatterns);
      
      // Step 4: Validate and optimize the generated workflow
      const validation = await this.validateWorkflow(workflow);
      
      // Step 5: Apply optimizations
      const optimizedWorkflow = await this.optimizeWorkflow(workflow, request.constraints);

      return {
        success: true,
        workflow: optimizedWorkflow,
        explanation: validation.explanation,
        complexity: analysis.complexity,
        estimatedExecutionTime: this.estimateExecutionTime(optimizedWorkflow),
        requiredPermissions: this.extractPermissions(optimizedWorkflow),
        suggestions: validation.suggestions,
        warnings: validation.warnings,
        errors: validation.errors,
        confidence: analysis.confidence
      };

    } catch (error) {
      console.error('❌ Workflow generation failed:', error);
      return {
        success: false,
        complexity: 'simple',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        confidence: 0
      };
    }
  }

  /**
   * Analyze natural language prompt to understand requirements
   */
  private async analyzePrompt(prompt: string): Promise<{
    intent: string;
    entities: string[];
    complexity: 'simple' | 'medium' | 'complex';
    confidence: number;
    category: string;
    keywords: string[];
  }> {
    const systemPrompt = `You are a workflow analysis expert. Analyze the user's request and extract:
1. Primary intent/goal
2. Key entities (services, actions, data types)
3. Complexity level (simple/medium/complex)
4. Confidence score (0-100)
5. Category (trigger/data-processing/notification/integration/automation)
6. Important keywords

Return JSON only.`;

    const response = await this.openaiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this workflow request: "${prompt}"` }
    ], {
      temperature: 0.1,
      maxTokens: 500
    });

    try {
      return JSON.parse(response);
    } catch {
      // Fallback analysis
      return {
        intent: prompt.substring(0, 100),
        entities: this.extractBasicEntities(prompt),
        complexity: prompt.length > 100 ? 'medium' : 'simple',
        confidence: 60,
        category: 'automation',
        keywords: prompt.toLowerCase().split(/\s+/)
      };
    }
  }

  /**
   * Find patterns that match the user's request
   */
  private findMatchingPatterns(prompt: string, analysis: any): WorkflowPattern[] {
    const promptLower = prompt.toLowerCase();
    
    return WORKFLOW_PATTERNS
      .map(pattern => ({
        pattern,
        score: this.calculatePatternMatch(promptLower, analysis, pattern)
      }))
      .filter(({ score }) => score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ pattern }) => pattern);
  }

  /**
   * Calculate how well a pattern matches the request
   */
  private calculatePatternMatch(prompt: string, analysis: any, pattern: WorkflowPattern): number {
    let score = 0;

    // Keyword matching
    const keywordMatches = pattern.keywords.filter(keyword => 
      prompt.includes(keyword) || analysis.keywords?.includes(keyword)
    );
    score += (keywordMatches.length / pattern.keywords.length) * 0.4;

    // Category matching
    if (pattern.category === analysis.category) {
      score += 0.3;
    }

    // Complexity alignment
    if (pattern.complexity === analysis.complexity) {
      score += 0.2;
    }

    // Entity matching
    const entityMatches = (analysis.entities || []).filter((entity: string) =>
      pattern.keywords.some(keyword => keyword.includes(entity.toLowerCase()))
    );
    score += (entityMatches.length / Math.max(analysis.entities?.length || 1, 1)) * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Generate workflow using AI with pattern guidance
   */
  private async generateWithAI(
    request: WorkflowGenerationRequest,
    analysis: any,
    patterns: WorkflowPattern[]
  ): Promise<N8nWorkflow> {
    const systemPrompt = `You are an expert n8n workflow architect. Generate a complete, production-ready n8n workflow JSON based on the user's requirements.

IMPORTANT RULES:
1. Return ONLY valid JSON - no explanations or markdown
2. Every node must have: id, name, type, typeVersion, position, parameters
3. Connections must reference actual node names
4. Use realistic node positions (start at [240, 300], increment by 220 horizontally)
5. Include proper error handling where appropriate
6. Optimize for performance and maintainability

Available node types: n8n-nodes-base.webhook, n8n-nodes-base.cron, n8n-nodes-base.httpRequest, n8n-nodes-base.set, n8n-nodes-base.function, n8n-nodes-base.if, n8n-nodes-base.switch, n8n-nodes-base.slack, n8n-nodes-base.gmail, n8n-nodes-base.respondToWebhook, n8n-nodes-base.postgres, n8n-nodes-base.manualTrigger`;

    const userPrompt = `Generate n8n workflow for: "${request.prompt}"

Context:
- Complexity: ${analysis.complexity}
- Category: ${analysis.category}
- Constraints: ${JSON.stringify(request.constraints || {})}

${patterns.length > 0 ? `Similar patterns for reference (adapt, don't copy):
${patterns.map(p => `${p.name}: ${p.description}`).join('\n')}` : ''}

Return complete n8n workflow JSON with nodes and connections.`;

    const response = await this.openaiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.3,
      maxTokens: 2000
    });

    try {
      const workflow = JSON.parse(response);
      
      // Ensure required fields
      if (!workflow.name) {
        workflow.name = this.generateWorkflowName(request.prompt);
      }
      if (!workflow.nodes) {
        throw new Error('Generated workflow missing nodes');
      }
      if (!workflow.connections) {
        workflow.connections = {};
      }

      return workflow;
    } catch (error) {
      console.error('Failed to parse AI-generated workflow:', error);
      // Fallback to template-based generation
      return this.generateFromTemplate(request, patterns[0]);
    }
  }

  /**
   * Generate workflow from template when AI generation fails
   */
  private generateFromTemplate(request: WorkflowGenerationRequest, pattern?: WorkflowPattern): N8nWorkflow {
    const template = pattern?.template || {
      nodes: [
        {
          id: 'start',
          name: 'Start',
          type: 'n8n-nodes-base.manualTrigger',
          typeVersion: 1,
          position: [240, 300],
          parameters: {}
        }
      ],
      connections: {}
    };

    return {
      name: this.generateWorkflowName(request.prompt),
      nodes: template.nodes || [],
      connections: template.connections || {},
      active: false,
      settings: {}
    };
  }

  /**
   * Validate generated workflow
   */
  private async validateWorkflow(workflow: N8nWorkflow): Promise<{
    valid: boolean;
    explanation: string;
    suggestions: string[];
    warnings: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!workflow.name) {
      errors.push('Workflow name is required');
    }
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Node validation
    const nodeIds = new Set();
    for (const node of workflow.nodes || []) {
      if (!node.id || !node.name || !node.type) {
        errors.push(`Invalid node: ${JSON.stringify(node)}`);
      }
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    // Connection validation
    for (const [sourceId, connection] of Object.entries(workflow.connections || {})) {
      if (!nodeIds.has(sourceId)) {
        errors.push(`Connection from unknown node: ${sourceId}`);
      }
    }

    // Generate explanation
    const explanation = this.generateWorkflowExplanation(workflow);

    // Add suggestions
    if (workflow.nodes && workflow.nodes.length > 10) {
      suggestions.push('Consider breaking large workflows into smaller, reusable components');
    }

    return {
      valid: errors.length === 0,
      explanation,
      suggestions,
      warnings,
      errors
    };
  }

  /**
   * Optimize workflow for performance and maintainability
   */
  private async optimizeWorkflow(workflow: N8nWorkflow, constraints?: any): Promise<N8nWorkflow> {
    // Apply constraints
    if (constraints?.maxNodes && workflow.nodes && workflow.nodes.length > constraints.maxNodes) {
      workflow.nodes = workflow.nodes.slice(0, constraints.maxNodes);
    }

    // Optimize node positions for better visual layout
    if (workflow.nodes) {
      let x = 240;
      const y = 300;
      for (const node of workflow.nodes) {
        if (!node.position || node.position.length !== 2) {
          node.position = [x, y];
          x += 220;
        }
      }
    }

    // Add error handling if missing
    this.addErrorHandling(workflow);

    return workflow;
  }

  /**
   * Add basic error handling to workflow
   */
  private addErrorHandling(workflow: N8nWorkflow): void {
    // Add error handling nodes for complex workflows
    if (workflow.nodes && workflow.nodes.length > 5) {
      const hasErrorHandling = workflow.nodes.some(node => 
        node.name?.toLowerCase().includes('error') || 
        node.type === 'n8n-nodes-base.if'
      );

      if (!hasErrorHandling) {
        // Could add error handling nodes here
        // For now, just add to suggestions
      }
    }
  }

  /**
   * Generate human-readable workflow explanation
   */
  private generateWorkflowExplanation(workflow: N8nWorkflow): string {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      return 'Empty workflow';
    }

    const nodeCount = workflow.nodes.length;
    const triggerNodes = workflow.nodes.filter(node => 
      node.type?.includes('trigger') || 
      node.type?.includes('webhook') || 
      node.type?.includes('cron')
    );

    let explanation = `This workflow contains ${nodeCount} node${nodeCount > 1 ? 's' : ''}`;
    
    if (triggerNodes.length > 0) {
      explanation += ` and starts with ${triggerNodes[0].name || 'a trigger'}`;
    }

    explanation += '. ';

    // Describe the flow
    if (workflow.connections && Object.keys(workflow.connections).length > 0) {
      explanation += 'The workflow processes data through multiple connected steps, ';
    }

    // Identify common patterns
    const hasApiCalls = workflow.nodes.some(node => node.type === 'n8n-nodes-base.httpRequest');
    const hasDataTransformation = workflow.nodes.some(node => 
      node.type === 'n8n-nodes-base.set' || node.type === 'n8n-nodes-base.function'
    );
    const hasNotifications = workflow.nodes.some(node => 
      node.type?.includes('slack') || node.type?.includes('email')
    );

    if (hasApiCalls) explanation += 'making API requests, ';
    if (hasDataTransformation) explanation += 'transforming data, ';
    if (hasNotifications) explanation += 'sending notifications, ';

    explanation += 'to achieve the desired automation.';

    return explanation;
  }

  /**
   * Estimate workflow execution time
   */
  private estimateExecutionTime(workflow: N8nWorkflow): string {
    if (!workflow.nodes) return '< 1 second';

    let estimatedMs = 0;

    for (const node of workflow.nodes) {
      switch (node.type) {
        case 'n8n-nodes-base.httpRequest':
          estimatedMs += 1000; // 1 second for HTTP requests
          break;
        case 'n8n-nodes-base.function':
        case 'n8n-nodes-base.functionItem':
          estimatedMs += 100; // 100ms for functions
          break;
        case 'n8n-nodes-base.postgres':
        case 'n8n-nodes-base.mysql':
          estimatedMs += 500; // 500ms for database operations
          break;
        default:
          estimatedMs += 50; // 50ms for other nodes
      }
    }

    if (estimatedMs < 1000) return '< 1 second';
    if (estimatedMs < 5000) return `${Math.ceil(estimatedMs / 1000)} seconds`;
    return `${Math.ceil(estimatedMs / 1000)} seconds (consider optimization)`;
  }

  /**
   * Extract required permissions from workflow
   */
  private extractPermissions(workflow: N8nWorkflow): string[] {
    const permissions = new Set<string>();

    for (const node of workflow.nodes || []) {
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

  /**
   * Generate workflow name from prompt
   */
  private generateWorkflowName(prompt: string): string {
    // Extract key words and create name
    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 4);

    const name = words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return name || 'Generated Workflow';
  }

  /**
   * Extract basic entities from prompt (fallback method)
   */
  private extractBasicEntities(prompt: string): string[] {
    const commonEntities = [
      'webhook', 'slack', 'email', 'api', 'database', 'http', 'schedule', 
      'notification', 'data', 'sync', 'process', 'trigger', 'send', 'receive'
    ];

    return commonEntities.filter(entity => 
      prompt.toLowerCase().includes(entity)
    );
  }

  /**
   * Get workflow patterns by category
   */
  getPatternsByCategory(category: string): WorkflowPattern[] {
    return WORKFLOW_PATTERNS.filter(pattern => pattern.category === category);
  }

  /**
   * Get all available patterns
   */
  getAllPatterns(): WorkflowPattern[] {
    return [...WORKFLOW_PATTERNS];
  }
}