// Specialized agent for n8n workflow design and node architecture
import { BaseAgent } from './BaseAgent';
import { AgentConfig, AgentContext, WorkflowSpec, N8nNode, N8nConnection } from './types';

export class WorkflowDesignerAgent extends BaseAgent {
  private nodeLibrary: Map<string, any> = new Map();
  private designPatterns: Map<string, any> = new Map();

  constructor(context: AgentContext) {
    const config: AgentConfig = {
      id: 'workflow-designer',
      name: 'Workflow Designer',
      type: 'specialist',
      capabilities: [
        {
          name: 'node_architecture',
          description: 'Design n8n node structures and connections',
          inputs: ['workflow_requirements', 'user_preferences'],
          outputs: ['node_configuration', 'connection_map'],
          dependencies: [],
          reliability: 0.92
        },
        {
          name: 'flow_optimization',
          description: 'Optimize workflow performance and efficiency',
          inputs: ['workflow_design', 'performance_requirements'],
          outputs: ['optimized_workflow', 'performance_metrics'],
          dependencies: ['node_architecture'],
          reliability: 0.88
        },
        {
          name: 'pattern_recognition',
          description: 'Apply proven workflow patterns and best practices',
          inputs: ['use_case', 'industry_context'],
          outputs: ['recommended_patterns', 'implementation_guide'],
          dependencies: [],
          reliability: 0.90
        }
      ],
      model: 'gpt-4',
      temperature: 0.2,
      maxTokens: 3000,
      systemPrompt: '',  // Will be set after super() call
      tools: ['node_generation', 'connection_mapping', 'pattern_matching', 'optimization'],
      fallbackAgent: undefined
    };

    super(config, context);
    
    // Now set the system prompt after super() has been called
    this.config.systemPrompt = this.getSystemPrompt();
    this.initializeNodeLibrary();
    this.initializeDesignPatterns();
  }

  private getSystemPrompt(): string {
    return `You are the Workflow Designer Agent for Clixen, specialized in creating optimal n8n workflow architectures.

Your expertise includes:
1. N8N NODE MASTERY: Deep knowledge of all n8n node types, configurations, and capabilities
2. WORKFLOW PATTERNS: Implementation of proven automation patterns and best practices
3. PERFORMANCE OPTIMIZATION: Designing efficient, scalable workflows
4. ERROR HANDLING: Robust error handling and retry mechanisms
5. SECURITY: Secure credential management and data protection

Core n8n concepts you must master:
- Trigger nodes (Webhook, Schedule, Manual, Email, etc.)
- Action nodes (HTTP Request, Set, Code, etc.)
- Logic nodes (IF, Switch, Merge, Split)
- Integration nodes (APIs, databases, cloud services)
- Data transformation and manipulation
- Error handling and branching
- Credential and authentication management

Design principles:
- Keep workflows simple and maintainable
- Use descriptive node names and documentation
- Implement proper error handling at each step
- Optimize for performance and resource usage
- Follow security best practices
- Plan for monitoring and debugging

Your responses should include:
- Detailed node configurations with all required parameters
- Clear connection mappings between nodes
- Comprehensive error handling strategies
- Performance considerations and optimizations
- Security recommendations for sensitive operations

Always validate that your designs are technically implementable in n8n.`;
  }

  private initializeNodeLibrary(): void {
    // Core n8n nodes with their configurations
    this.nodeLibrary.set('webhook', {
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      defaultParams: {
        httpMethod: 'POST',
        path: '',
        responseMode: 'responseNode'
      },
      requiredParams: ['path'],
      optionalParams: ['httpMethod', 'responseMode', 'options']
    });

    this.nodeLibrary.set('http-request', {
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 3,
      defaultParams: {
        method: 'GET',
        url: '',
        options: {}
      },
      requiredParams: ['url'],
      optionalParams: ['method', 'headers', 'body', 'authentication']
    });

    this.nodeLibrary.set('set', {
      type: 'n8n-nodes-base.set',
      typeVersion: 1,
      defaultParams: {
        values: {
          string: [],
          number: [],
          boolean: []
        }
      },
      requiredParams: ['values'],
      optionalParams: []
    });

    this.nodeLibrary.set('if', {
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      defaultParams: {
        conditions: {
          string: []
        }
      },
      requiredParams: ['conditions'],
      optionalParams: []
    });

    this.nodeLibrary.set('code', {
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      defaultParams: {
        mode: 'runOnceForAllItems',
        jsCode: ''
      },
      requiredParams: ['jsCode'],
      optionalParams: ['mode']
    });

    this.nodeLibrary.set('schedule', {
      type: 'n8n-nodes-base.cron',
      typeVersion: 1,
      defaultParams: {
        rule: {
          interval: []
        }
      },
      requiredParams: ['rule'],
      optionalParams: []
    });

    // Add more nodes as needed
  }

  private initializeDesignPatterns(): void {
    // Common workflow patterns
    this.designPatterns.set('api-to-database', {
      name: 'API to Database',
      description: 'Fetch data from API and store in database',
      nodes: ['webhook', 'http-request', 'set', 'database'],
      pattern: 'trigger -> fetch -> transform -> store'
    });

    this.designPatterns.set('scheduled-sync', {
      name: 'Scheduled Data Sync',
      description: 'Periodically sync data between systems',
      nodes: ['schedule', 'http-request', 'if', 'set', 'database'],
      pattern: 'schedule -> fetch -> check -> transform -> sync'
    });

    this.designPatterns.set('webhook-processor', {
      name: 'Webhook Data Processor',
      description: 'Process incoming webhook data with validation',
      nodes: ['webhook', 'if', 'set', 'http-request', 'response'],
      pattern: 'webhook -> validate -> process -> notify -> respond'
    });

    this.designPatterns.set('multi-api-aggregator', {
      name: 'Multi-API Data Aggregator',
      description: 'Combine data from multiple APIs',
      nodes: ['trigger', 'http-request', 'merge', 'set', 'code'],
      pattern: 'trigger -> [parallel requests] -> merge -> transform -> output'
    });
  }

  async processTask(task: any): Promise<any> {
    const { action, input } = task;

    switch (action) {
      case 'design_workflow':
        return await this.designWorkflow(input.requirements);
      
      case 'generate_nodes':
        return await this.generateNodes(input.workflowSpec);
      
      case 'create_connections':
        return await this.createConnections(input.nodes, input.flowLogic);
      
      case 'optimize_workflow':
        return await this.optimizeWorkflow(input.workflow);
      
      case 'validate_design':
        return await this.validateDesign(input.workflow);
      
      case 'suggest_patterns':
        return await this.suggestPatterns(input.useCase);
      
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

  // Core design methods
  async designWorkflow(requirements: any[]): Promise<WorkflowSpec> {
    this.updateProgress(10);

    const prompt = `Design a complete n8n workflow based on these requirements:

Requirements:
${requirements.map(req => `- ${req.type}: ${req.description} (${req.priority})`).join('\n')}

Create a comprehensive workflow specification including:
1. Appropriate trigger nodes
2. Data processing and transformation nodes
3. Integration nodes for external services
4. Logic and conditional nodes
5. Error handling and retry mechanisms
6. Response and notification nodes

Consider:
- Performance and efficiency
- Security and authentication
- Error handling and resilience
- Maintainability and debugging
- Monitoring and logging

Return a detailed WorkflowSpec JSON object with complete node configurations.`;

    const response = await this.think(prompt, { nodeLibrary: Array.from(this.nodeLibrary.keys()) });
    this.updateProgress(40);

    try {
      const workflowSpec = JSON.parse(response);
      
      // Validate and enhance the specification
      const validatedSpec = await this.validateAndEnhanceSpec(workflowSpec);
      this.updateProgress(70);
      
      // Store in context
      this.context.currentWorkflow = validatedSpec;
      this.updateProgress(100);
      
      return validatedSpec;
    } catch (error) {
      throw new Error(`Failed to design workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateNodes(workflowSpec: WorkflowSpec): Promise<N8nNode[]> {
    this.updateProgress(20);

    const nodes: N8nNode[] = [];
    let positionX = 240;
    let positionY = 300;

    for (const nodeSpec of workflowSpec.nodes) {
      const nodeConfig = this.nodeLibrary.get(nodeSpec.type);
      
      if (!nodeConfig) {
        console.warn(`Unknown node type: ${nodeSpec.type}`);
        continue;
      }

      const node: N8nNode = {
        id: nodeSpec.id,
        name: nodeSpec.name,
        type: nodeConfig.type,
        typeVersion: nodeConfig.typeVersion,
        position: [positionX, positionY],
        parameters: { ...nodeConfig.defaultParams, ...nodeSpec.parameters }
      };

      // Add credentials if needed
      if (nodeSpec.credentials) {
        node.credentials = nodeSpec.credentials;
      }

      nodes.push(node);
      
      // Update position for next node
      positionX += 220;
      if (positionX > 1200) {
        positionX = 240;
        positionY += 200;
      }

      this.updateProgress(20 + (nodes.length / workflowSpec.nodes.length) * 60);
    }

    this.updateProgress(100);
    return nodes;
  }

  async createConnections(nodes: N8nNode[], flowLogic: any): Promise<N8nConnection> {
    this.updateProgress(30);

    const connections: N8nConnection = {};

    // Analyze flow logic and create connections
    const prompt = `Create n8n node connections based on this flow logic:

Nodes:
${nodes.map(node => `- ${node.name} (${node.id}): ${node.type}`).join('\n')}

Flow Logic:
${JSON.stringify(flowLogic, null, 2)}

Generate connection mapping showing how data flows between nodes.
Include error handling paths and conditional branching.

Return as N8nConnection object format.`;

    const response = await this.think(prompt);
    this.updateProgress(70);

    try {
      const connectionSpec = JSON.parse(response);
      
      // Validate connections
      for (const [sourceNode, outputs] of Object.entries(connectionSpec)) {
        const sourceExists = nodes.find(n => n.name === sourceNode);
        if (!sourceExists) continue;

        const outputsTyped = outputs as { main?: any[] };
        for (const output of outputsTyped.main || []) {
          for (const connection of output) {
            const targetExists = nodes.find(n => n.name === connection.node);
            if (targetExists) {
              if (!connections[sourceNode]) {
                connections[sourceNode] = { main: [] };
              }
              if (!connections[sourceNode].main[connection.index || 0]) {
                connections[sourceNode].main[connection.index || 0] = [];
              }
              connections[sourceNode].main[connection.index || 0].push({
                node: connection.node,
                type: connection.type || 'main',
                index: connection.index || 0
              });
            }
          }
        }
      }

      this.updateProgress(100);
      return connections;
    } catch (error) {
      throw new Error(`Failed to create connections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async optimizeWorkflow(workflow: WorkflowSpec): Promise<{
    optimizedWorkflow: WorkflowSpec;
    optimizations: string[];
    performanceGains: number;
  }> {
    this.updateProgress(25);

    const prompt = `Optimize this n8n workflow for performance and efficiency:

Current Workflow:
${JSON.stringify(workflow, null, 2)}

Analyze and optimize for:
1. Execution speed and efficiency
2. Resource usage (memory, CPU)
3. Network requests and API calls
4. Data processing and transformation
5. Error handling and resilience
6. Monitoring and debugging capabilities

Suggest specific optimizations with estimated performance impact.`;

    const response = await this.think(prompt);
    this.updateProgress(70);

    try {
      const optimization = JSON.parse(response);
      
      // Apply optimizations to workflow
      const optimizedWorkflow = this.applyOptimizations(workflow, optimization.changes);
      
      this.updateProgress(100);
      
      return {
        optimizedWorkflow,
        optimizations: optimization.optimizations || [],
        performanceGains: optimization.performanceGains || 0
      };
    } catch (error) {
      throw new Error(`Failed to optimize workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateDesign(workflow: WorkflowSpec): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    this.updateProgress(30);

    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate nodes
    for (const node of workflow.nodes) {
      const nodeConfig = this.nodeLibrary.get(node.type);
      
      if (!nodeConfig) {
        errors.push(`Unknown node type: ${node.type}`);
        continue;
      }

      // Check required parameters
      for (const param of nodeConfig.requiredParams) {
        if (!node.parameters || !(param in node.parameters)) {
          errors.push(`Missing required parameter '${param}' in node '${node.name}'`);
        }
      }

      // Validate parameter values
      if (node.type === 'webhook' && node.parameters.path && !node.parameters.path.startsWith('/')) {
        warnings.push(`Webhook path in '${node.name}' should start with /`);
      }

      if (node.type === 'http-request' && node.parameters.url && !this.isValidUrl(node.parameters.url)) {
        errors.push(`Invalid URL in node '${node.name}': ${node.parameters.url}`);
      }
    }

    this.updateProgress(70);

    // Validate connections
    const nodeNames = new Set(workflow.nodes.map(n => n.name));
    for (const [source, connections] of Object.entries(workflow.connections)) {
      if (!nodeNames.has(source)) {
        errors.push(`Connection source '${source}' does not exist`);
      }

      const connectionsTyped = connections as { main?: any[] };
      for (const outputConnections of connectionsTyped.main || []) {
        for (const conn of outputConnections) {
          if (!nodeNames.has(conn.node)) {
            errors.push(`Connection target '${conn.node}' does not exist`);
          }
        }
      }
    }

    // Performance suggestions
    if (workflow.nodes.length > 10) {
      suggestions.push('Consider breaking down large workflows into smaller sub-workflows');
    }

    const httpNodes = workflow.nodes.filter(n => n.type.includes('http'));
    if (httpNodes.length > 5) {
      suggestions.push('Multiple HTTP requests may impact performance - consider batching or caching');
    }

    this.updateProgress(100);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  async suggestPatterns(useCase: string): Promise<{
    recommendedPatterns: string[];
    implementations: any[];
    rationale: string[];
  }> {
    this.updateProgress(40);

    const prompt = `Suggest appropriate workflow patterns for this use case:

Use Case: "${useCase}"

Available patterns:
${Array.from(this.designPatterns.entries()).map(([key, pattern]) => 
  `- ${key}: ${pattern.description}`
).join('\n')}

Recommend the most suitable patterns and explain why they fit this use case.
Include implementation guidance and considerations.`;

    const response = await this.think(prompt);
    this.updateProgress(100);

    try {
      return JSON.parse(response);
    } catch (error) {
      // Fallback recommendation
      return {
        recommendedPatterns: ['webhook-processor'],
        implementations: [this.designPatterns.get('webhook-processor')],
        rationale: ['General purpose pattern suitable for most automation needs']
      };
    }
  }

  // Helper methods
  private async validateAndEnhanceSpec(spec: any): Promise<WorkflowSpec> {
    // Add IDs if missing
    if (!spec.id) {
      spec.id = `workflow-${Date.now()}`;
    }

    // Ensure all nodes have unique IDs
    if (spec.nodes) {
      spec.nodes = spec.nodes.map((node: any, index: number) => ({
        ...node,
        id: node.id || `node-${index}-${Date.now()}`
      }));
    }

    // Add error handling if missing
    if (!spec.errorHandling) {
      spec.errorHandling = {
        retryAttempts: 3,
        fallbackActions: ['log_error', 'notify_admin'],
        notifications: [],
        logging: {
          level: 'error',
          destinations: ['console'],
          retention: 30
        }
      };
    }

    // Add testing specification
    if (!spec.testing) {
      spec.testing = {
        unitTests: [],
        integrationTests: [],
        performanceTests: [],
        mockData: {}
      };
    }

    return spec as WorkflowSpec;
  }

  private applyOptimizations(workflow: WorkflowSpec, changes: any[]): WorkflowSpec {
    let optimized = { ...workflow };

    for (const change of changes) {
      switch (change.type) {
        case 'merge_nodes':
          optimized = this.mergeNodes(optimized, change.nodeIds);
          break;
        case 'add_caching':
          optimized = this.addCaching(optimized, change.nodeId);
          break;
        case 'batch_requests':
          optimized = this.batchRequests(optimized, change.nodeIds);
          break;
        case 'add_error_handling':
          optimized = this.addErrorHandling(optimized, change.nodeId);
          break;
      }
    }

    return optimized;
  }

  private mergeNodes(workflow: WorkflowSpec, nodeIds: string[]): WorkflowSpec {
    // Implementation for merging redundant nodes
    return workflow;
  }

  private addCaching(workflow: WorkflowSpec, nodeId: string): WorkflowSpec {
    // Implementation for adding caching to expensive operations
    return workflow;
  }

  private batchRequests(workflow: WorkflowSpec, nodeIds: string[]): WorkflowSpec {
    // Implementation for batching HTTP requests
    return workflow;
  }

  private addErrorHandling(workflow: WorkflowSpec, nodeId: string): WorkflowSpec {
    // Implementation for adding error handling to nodes
    return workflow;
  }
}