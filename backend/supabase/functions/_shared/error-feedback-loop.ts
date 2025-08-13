// =====================================================
// Error Feedback Loop for Self-Correction
// Captures n8n errors and automatically fixes workflows
// =====================================================

import { smartWorkflowGenerator } from './smart-workflow-generator.ts';
import { workflowValidator } from './workflow-validator.ts';

export interface ErrorPattern {
  errorType: string;
  errorMessage: string;
  nodeType?: string;
  parameter?: string;
  frequency: number;
  lastSeen: Date;
  autoFixAvailable: boolean;
  fixStrategy: string;
}

export interface DeploymentError {
  workflowId?: string;
  error: string;
  httpStatus?: number;
  nodeErrors?: string[];
  timestamp: Date;
  userIntent?: string;
  workflowJson?: any;
}

export interface FixResult {
  success: boolean;
  fixedWorkflow?: any;
  appliedFixes: string[];
  remainingErrors: string[];
  confidence: number;
}

/**
 * Error Feedback Loop System
 * Learns from failures and automatically fixes common issues
 */
export class ErrorFeedbackLoop {
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private commonFixes: Map<string, (workflow: any, error: string) => any> = new Map();

  constructor() {
    this.loadCommonErrorPatterns();
    this.setupAutoFixStrategies();
  }

  /**
   * Process deployment error and attempt auto-fix
   */
  async processDeploymentError(
    deploymentError: DeploymentError,
    originalWorkflow: any,
    userIntent?: string
  ): Promise<FixResult> {
    console.log(`[ErrorFeedback] Processing deployment error: ${deploymentError.error}`);

    // Record the error pattern
    this.recordErrorPattern(deploymentError);

    // Analyze the error
    const errorAnalysis = this.analyzeError(deploymentError.error);
    
    // Attempt multiple fix strategies
    const fixResult = await this.attemptAutoFix(
      originalWorkflow,
      deploymentError,
      errorAnalysis,
      userIntent
    );

    // Learn from the fix attempt
    this.learnFromFixAttempt(deploymentError, fixResult);

    return fixResult;
  }

  /**
   * Attempt automatic fixes using multiple strategies
   */
  private async attemptAutoFix(
    workflow: any,
    error: DeploymentError,
    errorAnalysis: any,
    userIntent?: string
  ): Promise<FixResult> {
    let currentWorkflow = JSON.parse(JSON.stringify(workflow));
    const appliedFixes: string[] = [];
    const remainingErrors: string[] = [];
    let confidence = 0.5;

    // Strategy 1: Apply known fixes
    const knownFixResult = this.applyKnownFixes(currentWorkflow, error.error);
    if (knownFixResult.applied) {
      currentWorkflow = knownFixResult.workflow;
      appliedFixes.push(...knownFixResult.fixes);
      confidence += 0.2;
    }

    // Strategy 2: Node-specific fixes
    const nodeFixResult = await this.applyNodeSpecificFixes(currentWorkflow, error);
    if (nodeFixResult.applied) {
      currentWorkflow = nodeFixResult.workflow;
      appliedFixes.push(...nodeFixResult.fixes);
      confidence += 0.2;
    }

    // Strategy 3: Structural fixes
    const structuralFixResult = this.applyStructuralFixes(currentWorkflow, error);
    if (structuralFixResult.applied) {
      currentWorkflow = structuralFixResult.workflow;
      appliedFixes.push(...structuralFixResult.fixes);
      confidence += 0.1;
    }

    // Strategy 4: AI-powered fix (last resort)
    if (appliedFixes.length === 0 && userIntent) {
      const aiFixResult = await this.attemptAIFix(currentWorkflow, error, userIntent);
      if (aiFixResult.applied) {
        currentWorkflow = aiFixResult.workflow;
        appliedFixes.push(...aiFixResult.fixes);
        confidence += 0.1;
      }
    }

    // Validate the fixed workflow
    const validation = await workflowValidator.validateWorkflow(currentWorkflow);
    
    if (!validation.valid) {
      remainingErrors.push(...validation.errors.map(e => e.message));
      confidence = Math.max(0.1, confidence - 0.2);
    }

    return {
      success: validation.valid && appliedFixes.length > 0,
      fixedWorkflow: currentWorkflow,
      appliedFixes,
      remainingErrors,
      confidence: Math.min(0.9, confidence)
    };
  }

  /**
   * Apply known fixes for common error patterns
   */
  private applyKnownFixes(workflow: any, errorMessage: string): { applied: boolean; workflow: any; fixes: string[] } {
    const fixes: string[] = [];
    let modified = JSON.parse(JSON.stringify(workflow));
    let applied = false;

    // Fix 1: Missing required parameters
    if (errorMessage.includes('missing required parameter') || errorMessage.includes('required field')) {
      for (const node of modified.nodes) {
        if (node.type === 'n8n-nodes-base.httpRequest' && !node.parameters?.url) {
          node.parameters = node.parameters || {};
          node.parameters.url = 'https://api.example.com/placeholder';
          fixes.push(`Added placeholder URL to ${node.name}`);
          applied = true;
        }
        
        if (node.type === 'n8n-nodes-base.emailSend' && !node.parameters?.toEmail) {
          node.parameters = node.parameters || {};
          node.parameters.toEmail = 'admin@example.com';
          fixes.push(`Added placeholder email to ${node.name}`);
          applied = true;
        }
      }
    }

    // Fix 2: Invalid node connections
    if (errorMessage.includes('invalid connection') || errorMessage.includes('node not found')) {
      const nodeNames = new Set(modified.nodes.map((n: any) => n.name));
      
      for (const [sourceName, connections] of Object.entries(modified.connections || {})) {
        if (!nodeNames.has(sourceName)) {
          delete modified.connections[sourceName];
          fixes.push(`Removed invalid connection from ${sourceName}`);
          applied = true;
        } else {
          const conn = connections as any;
          if (conn.main && Array.isArray(conn.main)) {
            conn.main = conn.main.map((group: any[]) => 
              group.filter(c => nodeNames.has(c.node))
            );
          }
        }
      }
    }

    // Fix 3: Duplicate node IDs
    if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
      const seenIds = new Set();
      for (const node of modified.nodes) {
        if (seenIds.has(node.id)) {
          node.id = `${node.id}_${Date.now().toString().slice(-4)}`;
          fixes.push(`Fixed duplicate ID for ${node.name}`);
          applied = true;
        }
        seenIds.add(node.id);
      }
    }

    return { applied, workflow: modified, fixes };
  }

  /**
   * Apply node-specific fixes
   */
  private async applyNodeSpecificFixes(workflow: any, error: DeploymentError): Promise<{ applied: boolean; workflow: any; fixes: string[] }> {
    const fixes: string[] = [];
    let modified = JSON.parse(JSON.stringify(workflow));
    let applied = false;

    for (const node of modified.nodes) {
      switch (node.type) {
        case 'n8n-nodes-base.webhook':
          if (!node.parameters?.path) {
            node.parameters = node.parameters || {};
            node.parameters.path = `webhook-${Date.now().toString().slice(-6)}`;
            node.parameters.httpMethod = node.parameters.httpMethod || 'POST';
            fixes.push(`Fixed webhook configuration for ${node.name}`);
            applied = true;
          }
          break;

        case 'n8n-nodes-base.scheduleTrigger':
          if (!node.parameters?.rule) {
            node.parameters = node.parameters || {};
            node.parameters.rule = {
              interval: [{ field: 'minutes', minutesInterval: 10 }]
            };
            fixes.push(`Fixed schedule configuration for ${node.name}`);
            applied = true;
          }
          break;

        case 'n8n-nodes-base.code':
        case 'n8n-nodes-base.function':
          if (!node.parameters?.jsCode && !node.parameters?.functionCode) {
            node.parameters = node.parameters || {};
            node.parameters.jsCode = `
              // Simple data processing
              const items = $input.all();
              return items.map(item => ({
                json: {
                  processed: true,
                  timestamp: new Date().toISOString(),
                  ...item.json
                }
              }));
            `;
            fixes.push(`Added default code to ${node.name}`);
            applied = true;
          }
          break;
      }
    }

    return { applied, workflow: modified, fixes };
  }

  /**
   * Apply structural fixes to workflow
   */
  private applyStructuralFixes(workflow: any, error: DeploymentError): { applied: boolean; workflow: any; fixes: string[] } {
    const fixes: string[] = [];
    let modified = JSON.parse(JSON.stringify(workflow));
    let applied = false;

    // Ensure workflow has required structure
    if (!modified.name) {
      modified.name = `Workflow ${Date.now()}`;
      fixes.push('Added workflow name');
      applied = true;
    }

    if (!modified.nodes || !Array.isArray(modified.nodes)) {
      modified.nodes = [];
      fixes.push('Fixed nodes array');
      applied = true;
    }

    if (!modified.connections || typeof modified.connections !== 'object') {
      modified.connections = {};
      fixes.push('Fixed connections object');
      applied = true;
    }

    // Ensure at least one trigger node
    const hasTrigger = modified.nodes.some((n: any) => 
      ['n8n-nodes-base.webhook', 'n8n-nodes-base.manualTrigger', 'n8n-nodes-base.scheduleTrigger'].includes(n.type)
    );

    if (!hasTrigger && modified.nodes.length > 0) {
      const triggerNode = {
        id: 'manual_trigger_auto',
        name: 'Manual Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        position: [200, 300],
        parameters: {}
      };
      modified.nodes.unshift(triggerNode);
      fixes.push('Added missing trigger node');
      applied = true;
    }

    return { applied, workflow: modified, fixes };
  }

  /**
   * AI-powered fix attempt (last resort)
   */
  private async attemptAIFix(workflow: any, error: DeploymentError, userIntent: string): Promise<{ applied: boolean; workflow: any; fixes: string[] }> {
    // This would use OpenAI to analyze the error and suggest fixes
    // For now, return a simple fallback
    console.log('[ErrorFeedback] AI fix not implemented yet, using simple fallback');
    
    return {
      applied: false,
      workflow,
      fixes: []
    };
  }

  /**
   * Record error patterns for learning
   */
  private recordErrorPattern(error: DeploymentError): void {
    const errorKey = this.extractErrorKey(error.error);
    
    const existing = this.errorPatterns.get(errorKey);
    if (existing) {
      existing.frequency++;
      existing.lastSeen = new Date();
    } else {
      this.errorPatterns.set(errorKey, {
        errorType: this.categorizeError(error.error),
        errorMessage: error.error,
        frequency: 1,
        lastSeen: new Date(),
        autoFixAvailable: this.hasAutoFix(error.error),
        fixStrategy: this.getFixStrategy(error.error)
      });
    }

    console.log(`[ErrorFeedback] Recorded error pattern: ${errorKey} (frequency: ${this.errorPatterns.get(errorKey)?.frequency})`);
  }

  /**
   * Learn from fix attempts
   */
  private learnFromFixAttempt(error: DeploymentError, fixResult: FixResult): void {
    const errorKey = this.extractErrorKey(error.error);
    const pattern = this.errorPatterns.get(errorKey);
    
    if (pattern) {
      // Update fix availability based on success
      pattern.autoFixAvailable = fixResult.success;
      
      if (fixResult.success && fixResult.appliedFixes.length > 0) {
        pattern.fixStrategy = fixResult.appliedFixes.join('; ');
      }
    }

    console.log(`[ErrorFeedback] Learned from fix attempt: ${fixResult.success ? 'SUCCESS' : 'FAILED'} (${fixResult.appliedFixes.length} fixes applied)`);
  }

  /**
   * Load common error patterns
   */
  private loadCommonErrorPatterns(): void {
    const commonPatterns: ErrorPattern[] = [
      {
        errorType: 'MISSING_PARAMETER',
        errorMessage: 'missing required parameter',
        frequency: 25,
        lastSeen: new Date(),
        autoFixAvailable: true,
        fixStrategy: 'Add placeholder values for required parameters'
      },
      {
        errorType: 'INVALID_CONNECTION',
        errorMessage: 'invalid connection',
        frequency: 18,
        lastSeen: new Date(),
        autoFixAvailable: true,
        fixStrategy: 'Remove connections to non-existent nodes'
      },
      {
        errorType: 'DUPLICATE_ID',
        errorMessage: 'duplicate node id',
        frequency: 12,
        lastSeen: new Date(),
        autoFixAvailable: true,
        fixStrategy: 'Generate unique node IDs'
      },
      {
        errorType: 'MALFORMED_JSON',
        errorMessage: 'invalid json',
        frequency: 22,
        lastSeen: new Date(),
        autoFixAvailable: true,
        fixStrategy: 'Fix JSON structure and syntax'
      }
    ];

    for (const pattern of commonPatterns) {
      this.errorPatterns.set(this.extractErrorKey(pattern.errorMessage), pattern);
    }

    console.log(`[ErrorFeedback] Loaded ${commonPatterns.length} common error patterns`);
  }

  /**
   * Setup auto-fix strategies
   */
  private setupAutoFixStrategies(): void {
    // This would contain more sophisticated fix strategies
    console.log('[ErrorFeedback] Auto-fix strategies initialized');
  }

  /**
   * Helper methods
   */
  private extractErrorKey(errorMessage: string): string {
    // Extract key parts of error message for pattern matching
    return errorMessage.toLowerCase()
      .replace(/['"]/g, '')
      .replace(/\d+/g, 'N')
      .substring(0, 50);
  }

  private categorizeError(errorMessage: string): string {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('missing') || msg.includes('required')) return 'MISSING_PARAMETER';
    if (msg.includes('connection') || msg.includes('node not found')) return 'INVALID_CONNECTION';
    if (msg.includes('duplicate') || msg.includes('unique')) return 'DUPLICATE_ID';
    if (msg.includes('json') || msg.includes('parse')) return 'MALFORMED_JSON';
    if (msg.includes('auth') || msg.includes('credential')) return 'AUTHENTICATION';
    if (msg.includes('timeout') || msg.includes('network')) return 'NETWORK';
    
    return 'UNKNOWN';
  }

  private hasAutoFix(errorMessage: string): boolean {
    const category = this.categorizeError(errorMessage);
    return ['MISSING_PARAMETER', 'INVALID_CONNECTION', 'DUPLICATE_ID', 'MALFORMED_JSON'].includes(category);
  }

  private getFixStrategy(errorMessage: string): string {
    const category = this.categorizeError(errorMessage);
    
    const strategies: Record<string, string> = {
      'MISSING_PARAMETER': 'Add default/placeholder values',
      'INVALID_CONNECTION': 'Remove invalid connections',
      'DUPLICATE_ID': 'Generate unique IDs',
      'MALFORMED_JSON': 'Fix JSON structure',
      'AUTHENTICATION': 'Check credentials configuration',
      'NETWORK': 'Retry with timeout handling'
    };

    return strategies[category] || 'Manual investigation required';
  }

  private analyzeError(errorMessage: string): any {
    return {
      category: this.categorizeError(errorMessage),
      severity: this.getErrorSeverity(errorMessage),
      autoFixable: this.hasAutoFix(errorMessage)
    };
  }

  private getErrorSeverity(errorMessage: string): 'low' | 'medium' | 'high' {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('missing') || msg.includes('duplicate')) return 'low';
    if (msg.includes('connection') || msg.includes('json')) return 'medium';
    if (msg.includes('auth') || msg.includes('critical')) return 'high';
    
    return 'medium';
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): any {
    const stats = {
      totalPatterns: this.errorPatterns.size,
      autoFixablePatterns: 0,
      mostFrequentErrors: [],
      categories: new Map()
    };

    for (const pattern of this.errorPatterns.values()) {
      if (pattern.autoFixAvailable) {
        stats.autoFixablePatterns++;
      }

      const category = pattern.errorType;
      stats.categories.set(category, (stats.categories.get(category) || 0) + pattern.frequency);
    }

    // Sort by frequency for most frequent errors
    stats.mostFrequentErrors = Array.from(this.errorPatterns.entries())
      .sort((a, b) => b[1].frequency - a[1].frequency)
      .slice(0, 10)
      .map(([key, pattern]) => ({ error: key, frequency: pattern.frequency }));

    return stats;
  }
}

// Export singleton instance
export const errorFeedbackLoop = new ErrorFeedbackLoop();