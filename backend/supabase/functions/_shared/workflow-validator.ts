// =====================================================
// Workflow Validator for 99% Reliability
// Ensures generated workflows are valid and MVP-compatible
// =====================================================

// MVP-compatible nodes whitelist
export const MVP_COMPATIBLE_NODES = {
  triggers: [
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.scheduleTrigger',
    'n8n-nodes-base.manualTrigger',
    'n8n-nodes-base.errorTrigger',
    'n8n-nodes-base.interval',
  ],
  
  dataProcessing: [
    'n8n-nodes-base.set',
    'n8n-nodes-base.function',
    'n8n-nodes-base.code',
    'n8n-nodes-base.if',
    'n8n-nodes-base.switch',
    'n8n-nodes-base.merge',
    'n8n-nodes-base.splitInBatches',
    'n8n-nodes-base.itemLists',
    'n8n-nodes-base.aggregate',
    'n8n-nodes-base.limit',
    'n8n-nodes-base.sort',
    'n8n-nodes-base.removeDuplicates',
  ],
  
  communication: [
    'n8n-nodes-base.httpRequest',
    'n8n-nodes-base.emailSend',
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.respondToWebhook',
    'n8n-nodes-base.mqtt',
    'n8n-nodes-base.redis',
  ],
  
  filesAndData: [
    'n8n-nodes-base.readBinaryFile',
    'n8n-nodes-base.writeBinaryFile',
    'n8n-nodes-base.moveBinaryData',
    'n8n-nodes-base.csv',
    'n8n-nodes-base.xml',
    'n8n-nodes-base.html',
    'n8n-nodes-base.markdown',
    'n8n-nodes-base.spreadsheetFile',
  ],
  
  utilities: [
    'n8n-nodes-base.crypto',
    'n8n-nodes-base.dateTime',
    'n8n-nodes-base.wait',
    'n8n-nodes-base.noOp',
    'n8n-nodes-base.stopAndError',
  ],
  
  ai: [
    'n8n-nodes-base.openAi',
    '@n8n/n8n-nodes-langchain.openAi',
    'n8n-nodes-firecrawl',
  ],
  
  databases: [
    'n8n-nodes-base.postgres',
    'n8n-nodes-base.redis',
    'n8n-nodes-base.supabase',
  ]
};

// Explicitly blocked nodes (require per-user OAuth)
export const BLOCKED_NODES = [
  'n8n-nodes-base.googleSheets',
  'n8n-nodes-base.gmail',
  'n8n-nodes-base.googleDrive',
  'n8n-nodes-base.slack',
  'n8n-nodes-base.discord',
  'n8n-nodes-base.twitter',
  'n8n-nodes-base.github',
  'n8n-nodes-base.notion',
  'n8n-nodes-base.airtable',
  'n8n-nodes-base.hubspot',
  'n8n-nodes-base.salesforce',
  'n8n-nodes-base.microsoftTeams',
  'n8n-nodes-base.zoom',
];

export interface ValidationError {
  type: string;
  message: string;
  node?: string;
  parameter?: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  score: number;
  suggestions: string[];
}

export interface NodeSchema {
  type: string;
  required: string[];
  parameters: Record<string, ParameterSchema>;
}

export interface ParameterSchema {
  type: string;
  required: boolean;
  default?: any;
  options?: any[];
}

export class WorkflowValidator {
  private allAllowedNodes: string[];
  
  constructor() {
    this.allAllowedNodes = Object.values(MVP_COMPATIBLE_NODES).flat();
  }
  
  /**
   * Main validation method
   */
  async validateWorkflow(workflow: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const suggestions: string[] = [];
    
    // 1. Validate basic structure
    const structureValidation = this.validateStructure(workflow);
    errors.push(...structureValidation.errors);
    
    // 2. Validate nodes
    if (workflow.nodes) {
      for (const node of workflow.nodes) {
        const nodeValidation = this.validateNode(node);
        errors.push(...nodeValidation.errors);
        warnings.push(...nodeValidation.warnings);
      }
    }
    
    // 3. Validate connections
    if (workflow.connections) {
      const connectionValidation = this.validateConnections(workflow);
      errors.push(...connectionValidation.errors);
      warnings.push(...connectionValidation.warnings);
    }
    
    // 4. Check for workflow completeness
    const completenessCheck = this.checkCompleteness(workflow);
    warnings.push(...completenessCheck.warnings);
    suggestions.push(...completenessCheck.suggestions);
    
    // 5. Calculate reliability score
    const score = this.calculateReliabilityScore(errors, warnings);
    
    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors: errors.filter(e => e.severity === 'error'),
      warnings: [...errors.filter(e => e.severity === 'warning'), ...warnings],
      score,
      suggestions
    };
  }
  
  /**
   * Validate workflow structure
   */
  private validateStructure(workflow: any): { errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    
    if (!workflow || typeof workflow !== 'object') {
      errors.push({
        type: 'INVALID_STRUCTURE',
        message: 'Workflow must be a valid object',
        severity: 'error'
      });
      return { errors };
    }
    
    // Check required fields
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push({
        type: 'MISSING_NODES',
        message: 'Workflow must have a nodes array',
        severity: 'error'
      });
    }
    
    if (!workflow.connections || typeof workflow.connections !== 'object') {
      errors.push({
        type: 'MISSING_CONNECTIONS',
        message: 'Workflow must have a connections object',
        severity: 'error'
      });
    }
    
    // Check for at least one trigger node
    if (workflow.nodes && !this.hasTriggerNode(workflow.nodes)) {
      errors.push({
        type: 'NO_TRIGGER',
        message: 'Workflow must have at least one trigger node',
        severity: 'error'
      });
    }
    
    return { errors };
  }
  
  /**
   * Validate individual node
   */
  private validateNode(node: any): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Check if node has required fields
    if (!node.id || !node.name || !node.type) {
      errors.push({
        type: 'INCOMPLETE_NODE',
        message: `Node missing required fields (id, name, or type)`,
        node: node.name || 'unknown',
        severity: 'error'
      });
      return { errors, warnings };
    }
    
    // Check if node type is blocked
    if (BLOCKED_NODES.includes(node.type)) {
      errors.push({
        type: 'BLOCKED_NODE',
        message: `Node type '${node.type}' requires OAuth and is not supported in MVP`,
        node: node.name,
        severity: 'error'
      });
      
      // Suggest alternative
      const alternative = this.suggestAlternative(node.type);
      if (alternative) {
        warnings.push({
          type: 'ALTERNATIVE_AVAILABLE',
          message: `Consider using '${alternative}' instead of '${node.type}'`,
          node: node.name,
          severity: 'warning'
        });
      }
    }
    
    // Check if node type is allowed
    if (!BLOCKED_NODES.includes(node.type) && !this.allAllowedNodes.includes(node.type)) {
      warnings.push({
        type: 'UNKNOWN_NODE',
        message: `Node type '${node.type}' is not in the verified list`,
        node: node.name,
        severity: 'warning'
      });
    }
    
    // Validate node parameters based on type
    const paramValidation = this.validateNodeParameters(node);
    errors.push(...paramValidation.errors);
    warnings.push(...paramValidation.warnings);
    
    // Check position
    if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
      warnings.push({
        type: 'MISSING_POSITION',
        message: 'Node should have a position array [x, y]',
        node: node.name,
        severity: 'warning'
      });
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate node parameters
   */
  private validateNodeParameters(node: any): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Type-specific parameter validation
    switch (node.type) {
      case 'n8n-nodes-base.webhook':
        if (!node.parameters?.path && !node.parameters?.httpMethod) {
          warnings.push({
            type: 'MISSING_WEBHOOK_CONFIG',
            message: 'Webhook node should have path and httpMethod',
            node: node.name,
            severity: 'warning'
          });
        }
        break;
        
      case 'n8n-nodes-base.httpRequest':
        if (!node.parameters?.url) {
          errors.push({
            type: 'MISSING_URL',
            message: 'HTTP Request node requires a URL',
            node: node.name,
            parameter: 'url',
            severity: 'error'
          });
        }
        break;
        
      case 'n8n-nodes-base.emailSend':
        if (!node.parameters?.toEmail) {
          errors.push({
            type: 'MISSING_EMAIL',
            message: 'Email Send node requires toEmail parameter',
            node: node.name,
            parameter: 'toEmail',
            severity: 'error'
          });
        }
        break;
        
      case 'n8n-nodes-base.code':
      case 'n8n-nodes-base.function':
        if (!node.parameters?.jsCode && !node.parameters?.functionCode) {
          errors.push({
            type: 'MISSING_CODE',
            message: 'Code node requires jsCode or functionCode',
            node: node.name,
            parameter: 'jsCode',
            severity: 'error'
          });
        }
        break;
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate connections
   */
  private validateConnections(workflow: any): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    const nodeNames = new Set(workflow.nodes?.map((n: any) => n.name) || []);
    
    for (const [sourceName, connections] of Object.entries(workflow.connections || {})) {
      // Check if source node exists
      if (!nodeNames.has(sourceName)) {
        errors.push({
          type: 'INVALID_CONNECTION_SOURCE',
          message: `Connection source '${sourceName}' does not exist`,
          severity: 'error'
        });
        continue;
      }
      
      // Check connection structure
      if (!connections || typeof connections !== 'object') {
        errors.push({
          type: 'INVALID_CONNECTION_STRUCTURE',
          message: `Invalid connection structure for '${sourceName}'`,
          severity: 'error'
        });
        continue;
      }
      
      // Check main connections
      const mainConnections = (connections as any).main;
      if (mainConnections && Array.isArray(mainConnections)) {
        for (const connectionGroup of mainConnections) {
          if (Array.isArray(connectionGroup)) {
            for (const connection of connectionGroup) {
              if (!connection.node || !nodeNames.has(connection.node)) {
                errors.push({
                  type: 'INVALID_CONNECTION_TARGET',
                  message: `Connection target '${connection.node}' does not exist`,
                  node: sourceName,
                  severity: 'error'
                });
              }
            }
          }
        }
      }
    }
    
    // Check for orphaned nodes
    const connectedNodes = new Set<string>();
    connectedNodes.add(this.findTriggerNode(workflow.nodes)?.name || '');
    
    for (const connections of Object.values(workflow.connections || {})) {
      const mainConnections = (connections as any).main;
      if (mainConnections && Array.isArray(mainConnections)) {
        for (const connectionGroup of mainConnections) {
          if (Array.isArray(connectionGroup)) {
            for (const connection of connectionGroup) {
              connectedNodes.add(connection.node);
            }
          }
        }
      }
    }
    
    for (const node of workflow.nodes || []) {
      if (!connectedNodes.has(node.name) && !this.isTriggerNode(node)) {
        warnings.push({
          type: 'ORPHANED_NODE',
          message: `Node '${node.name}' is not connected`,
          node: node.name,
          severity: 'warning'
        });
      }
    }
    
    return { errors, warnings };
  }
  
  /**
   * Check workflow completeness
   */
  private checkCompleteness(workflow: any): { warnings: ValidationError[]; suggestions: string[] } {
    const warnings: ValidationError[] = [];
    const suggestions: string[] = [];
    
    // Check if workflow has a meaningful flow
    if (workflow.nodes?.length < 2) {
      warnings.push({
        type: 'TOO_SIMPLE',
        message: 'Workflow has less than 2 nodes',
        severity: 'warning'
      });
      suggestions.push('Consider adding more nodes to create a meaningful workflow');
    }
    
    // Check if workflow has output
    const hasOutput = workflow.nodes?.some((n: any) => 
      ['n8n-nodes-base.respondToWebhook', 'n8n-nodes-base.emailSend', 
       'n8n-nodes-base.httpRequest', 'n8n-nodes-base.writeBinaryFile'].includes(n.type)
    );
    
    if (!hasOutput) {
      warnings.push({
        type: 'NO_OUTPUT',
        message: 'Workflow has no apparent output action',
        severity: 'warning'
      });
      suggestions.push('Add an output node like Email Send, HTTP Request, or Respond to Webhook');
    }
    
    return { warnings, suggestions };
  }
  
  /**
   * Helper methods
   */
  private hasTriggerNode(nodes: any[]): boolean {
    return nodes.some(node => this.isTriggerNode(node));
  }
  
  private isTriggerNode(node: any): boolean {
    return MVP_COMPATIBLE_NODES.triggers.includes(node.type);
  }
  
  private findTriggerNode(nodes: any[]): any {
    return nodes?.find(node => this.isTriggerNode(node));
  }
  
  private suggestAlternative(blockedNodeType: string): string | null {
    const alternatives: Record<string, string> = {
      'n8n-nodes-base.googleSheets': 'n8n-nodes-base.spreadsheetFile',
      'n8n-nodes-base.gmail': 'n8n-nodes-base.emailSend',
      'n8n-nodes-base.slack': 'n8n-nodes-base.httpRequest (with webhook URL)',
      'n8n-nodes-base.discord': 'n8n-nodes-base.httpRequest (with webhook URL)',
      'n8n-nodes-base.github': 'n8n-nodes-base.httpRequest (with API)',
      'n8n-nodes-base.notion': 'n8n-nodes-base.httpRequest (with API)',
    };
    
    return alternatives[blockedNodeType] || null;
  }
  
  private calculateReliabilityScore(errors: ValidationError[], warnings: ValidationError[]): number {
    let score = 100;
    
    // Deduct points for errors
    const criticalErrors = errors.filter(e => e.severity === 'error');
    score -= criticalErrors.length * 20;
    
    // Deduct points for warnings
    const warningCount = warnings.filter(w => w.severity === 'warning');
    score -= warningCount.length * 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Auto-fix common issues
   */
  async autoFixWorkflow(workflow: any, errors: ValidationError[]): Promise<any> {
    const fixed = JSON.parse(JSON.stringify(workflow)); // Deep clone
    
    for (const error of errors) {
      switch (error.type) {
        case 'BLOCKED_NODE':
          // Replace blocked node with alternative
          const node = fixed.nodes.find((n: any) => n.name === error.node);
          if (node) {
            const alternative = this.createAlternativeNode(node);
            if (alternative) {
              const index = fixed.nodes.indexOf(node);
              fixed.nodes[index] = alternative;
            }
          }
          break;
          
        case 'MISSING_URL':
          // Add placeholder URL
          const httpNode = fixed.nodes.find((n: any) => n.name === error.node);
          if (httpNode) {
            httpNode.parameters = httpNode.parameters || {};
            httpNode.parameters.url = 'https://api.example.com/endpoint';
          }
          break;
          
        case 'MISSING_EMAIL':
          // Add placeholder email
          const emailNode = fixed.nodes.find((n: any) => n.name === error.node);
          if (emailNode) {
            emailNode.parameters = emailNode.parameters || {};
            emailNode.parameters.toEmail = '={{$json["email"]}}';
          }
          break;
          
        case 'NO_TRIGGER':
          // Add manual trigger
          fixed.nodes.unshift({
            id: 'manual_trigger',
            name: 'Manual Trigger',
            type: 'n8n-nodes-base.manualTrigger',
            position: [250, 300],
            parameters: {}
          });
          break;
          
        case 'INVALID_CONNECTION_TARGET':
          // Remove invalid connection
          for (const [source, connections] of Object.entries(fixed.connections || {})) {
            const conn = connections as any;
            if (conn.main && Array.isArray(conn.main)) {
              conn.main = conn.main.map((group: any[]) => 
                group.filter(c => 
                  fixed.nodes.some((n: any) => n.name === c.node)
                )
              );
            }
          }
          break;
      }
    }
    
    return fixed;
  }
  
  private createAlternativeNode(blockedNode: any): any | null {
    const alternatives: Record<string, any> = {
      'n8n-nodes-base.googleSheets': {
        ...blockedNode,
        type: 'n8n-nodes-base.spreadsheetFile',
        parameters: {
          operation: 'read',
          fileFormat: 'csv'
        }
      },
      'n8n-nodes-base.gmail': {
        ...blockedNode,
        type: 'n8n-nodes-base.emailSend',
        parameters: {
          fromEmail: '{{$credentials.smtp.user}}',
          toEmail: blockedNode.parameters?.toEmail || '={{$json["email"]}}',
          subject: blockedNode.parameters?.subject || 'Notification from n8n',
          text: blockedNode.parameters?.message || '={{$json["message"]}}'
        }
      },
      'n8n-nodes-base.slack': {
        ...blockedNode,
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          url: '={{$credentials.slack.webhookUrl}}',
          method: 'POST',
          bodyParametersJson: JSON.stringify({
            text: blockedNode.parameters?.text || 'Message from n8n'
          }),
          options: {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        }
      }
    };
    
    return alternatives[blockedNode.type] || null;
  }
}

// Export singleton instance
export const workflowValidator = new WorkflowValidator();