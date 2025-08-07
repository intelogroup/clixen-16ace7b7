/**
 * Comprehensive Multi-Stage Workflow Validation Pipeline
 * 
 * Implements thorough validation with automated error correction and optimization suggestions
 */

import type { N8nWorkflow } from '../n8n';
import { OpenAIService } from '../services/OpenAIService';

export interface ValidationStage {
  name: string;
  description: string;
  required: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationError {
  stage: string;
  type: 'error' | 'warning' | 'suggestion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  code: string;
  message: string;
  nodeId?: string;
  nodeName?: string;
  autoFixAvailable?: boolean;
  fixDescription?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100 quality score
  confidence: number; // 0-100 confidence in validation
  complexity: 'simple' | 'medium' | 'complex';
  
  stages: {
    [stageName: string]: {
      passed: boolean;
      errors: ValidationError[];
      warnings: ValidationError[];
      suggestions: ValidationError[];
      executionTime: number;
    };
  };
  
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalSuggestions: number;
    criticalIssues: number;
    autoFixableIssues: number;
  };
  
  performance: {
    estimatedExecutionTime: string;
    resourceUsage: 'low' | 'medium' | 'high';
    scalabilityRating: number; // 1-10
  };
  
  security: {
    securityScore: number; // 0-100
    vulnerabilities: ValidationError[];
    recommendations: string[];
  };
  
  optimization: {
    suggestions: ValidationError[];
    potentialImprovements: string[];
    alternativeApproaches: string[];
  };
}

export interface AutoFixResult {
  applied: boolean;
  fixedErrors: string[];
  modifiedNodes: string[];
  description: string;
  backupWorkflow?: N8nWorkflow;
}

// Validation stages configuration
const VALIDATION_STAGES: ValidationStage[] = [
  {
    name: 'structure',
    description: 'Basic workflow structure and required fields',
    required: true,
    priority: 'critical'
  },
  {
    name: 'nodes',
    description: 'Individual node validation and configuration',
    required: true,
    priority: 'critical'
  },
  {
    name: 'connections',
    description: 'Node connections and data flow validation',
    required: true,
    priority: 'high'
  },
  {
    name: 'logic',
    description: 'Workflow logic and execution flow analysis',
    required: true,
    priority: 'high'
  },
  {
    name: 'performance',
    description: 'Performance analysis and optimization suggestions',
    required: false,
    priority: 'medium'
  },
  {
    name: 'security',
    description: 'Security vulnerability assessment',
    required: true,
    priority: 'high'
  },
  {
    name: 'best_practices',
    description: 'n8n best practices and pattern recommendations',
    required: false,
    priority: 'low'
  }
];

// Known n8n node types and their validation rules
const NODE_VALIDATION_RULES = {
  'n8n-nodes-base.webhook': {
    requiredParams: ['path'],
    optionalParams: ['httpMethod', 'responseMode', 'options'],
    securityChecks: ['pathValidation', 'methodRestriction'],
    performanceNotes: ['Consider rate limiting for production webhooks']
  },
  'n8n-nodes-base.httpRequest': {
    requiredParams: ['url'],
    optionalParams: ['requestMethod', 'headers', 'body', 'authentication'],
    securityChecks: ['urlValidation', 'headersSanitization', 'authenticationRequired'],
    performanceNotes: ['Add timeout configuration', 'Consider retry logic']
  },
  'n8n-nodes-base.function': {
    requiredParams: ['functionCode'],
    optionalParams: [],
    securityChecks: ['codeInjection', 'sensitiveDataExposure'],
    performanceNotes: ['Avoid complex loops', 'Consider memory usage']
  },
  'n8n-nodes-base.set': {
    requiredParams: ['values'],
    optionalParams: ['options'],
    securityChecks: ['dataValidation'],
    performanceNotes: ['Minimize data transformation overhead']
  },
  'n8n-nodes-base.if': {
    requiredParams: ['conditions'],
    optionalParams: ['combineOperation'],
    securityChecks: ['conditionValidation'],
    performanceNotes: ['Optimize condition order for performance']
  }
};

export class ComprehensiveWorkflowValidator {
  private openaiService: OpenAIService;
  private validationHistory: Map<string, ValidationResult> = new Map();

  constructor(openaiService?: OpenAIService) {
    this.openaiService = openaiService || new OpenAIService();
  }

  /**
   * Perform comprehensive multi-stage validation
   */
  async validateWorkflow(workflow: N8nWorkflow, options: {
    enableAutoFix?: boolean;
    skipStages?: string[];
    strictMode?: boolean;
    includeAIAnalysis?: boolean;
  } = {}): Promise<ValidationResult> {
    const startTime = Date.now();
    
    console.log('🔍 Starting comprehensive workflow validation...');

    const result: ValidationResult = {
      valid: true,
      score: 100,
      confidence: 100,
      complexity: 'simple',
      stages: {},
      summary: {
        totalErrors: 0,
        totalWarnings: 0,
        totalSuggestions: 0,
        criticalIssues: 0,
        autoFixableIssues: 0
      },
      performance: {
        estimatedExecutionTime: '',
        resourceUsage: 'low',
        scalabilityRating: 8
      },
      security: {
        securityScore: 100,
        vulnerabilities: [],
        recommendations: []
      },
      optimization: {
        suggestions: [],
        potentialImprovements: [],
        alternativeApproaches: []
      }
    };

    // Run each validation stage
    for (const stage of VALIDATION_STAGES) {
      if (options.skipStages?.includes(stage.name)) {
        continue;
      }

      const stageStartTime = Date.now();
      const stageResult = await this.runValidationStage(workflow, stage, options);
      const stageEndTime = Date.now();

      result.stages[stage.name] = {
        ...stageResult,
        executionTime: stageEndTime - stageStartTime
      };

      // Update summary
      result.summary.totalErrors += stageResult.errors.length;
      result.summary.totalWarnings += stageResult.warnings.length;
      result.summary.totalSuggestions += stageResult.suggestions.length;
      result.summary.criticalIssues += stageResult.errors.filter(e => e.severity === 'critical').length;
      result.summary.autoFixableIssues += stageResult.errors.filter(e => e.autoFixAvailable).length;

      // Update overall validation status
      if (!stageResult.passed && stage.required) {
        result.valid = false;
      }
    }

    // Calculate final scores
    result.score = this.calculateQualityScore(result);
    result.confidence = this.calculateConfidenceScore(result);
    result.complexity = this.determineComplexity(workflow);

    // AI-powered analysis if enabled
    if (options.includeAIAnalysis && this.openaiService) {
      try {
        const aiAnalysis = await this.performAIAnalysis(workflow, result);
        this.integrateAIAnalysis(result, aiAnalysis);
      } catch (error) {
        console.warn('AI analysis failed:', error);
      }
    }

    // Performance analysis
    result.performance = this.analyzePerformance(workflow);

    // Security analysis
    result.security = this.analyzeSecu_rity(workflow, result);

    // Optimization analysis
    result.optimization = this.analyzeOptimizations(workflow, result);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Validation completed in ${totalTime}ms`);

    // Store in history for learning
    this.validationHistory.set(workflow.name || 'unnamed', result);

    return result;
  }

  /**
   * Run individual validation stage
   */
  private async runValidationStage(
    workflow: N8nWorkflow,
    stage: ValidationStage,
    options: any
  ): Promise<{
    passed: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    suggestions: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const suggestions: ValidationError[] = [];

    switch (stage.name) {
      case 'structure':
        this.validateStructure(workflow, errors, warnings, suggestions);
        break;
      case 'nodes':
        this.validateNodes(workflow, errors, warnings, suggestions);
        break;
      case 'connections':
        this.validateConnections(workflow, errors, warnings, suggestions);
        break;
      case 'logic':
        this.validateLogic(workflow, errors, warnings, suggestions);
        break;
      case 'performance':
        this.validatePerformance(workflow, errors, warnings, suggestions);
        break;
      case 'security':
        this.validateSecurity(workflow, errors, warnings, suggestions);
        break;
      case 'best_practices':
        this.validateBestPractices(workflow, errors, warnings, suggestions);
        break;
    }

    return {
      passed: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate basic workflow structure
   */
  private validateStructure(
    workflow: N8nWorkflow,
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ): void {
    // Check required fields
    if (!workflow.name || typeof workflow.name !== 'string') {
      errors.push({
        stage: 'structure',
        type: 'error',
        severity: 'critical',
        code: 'MISSING_NAME',
        message: 'Workflow name is required and must be a string',
        autoFixAvailable: true,
        fixDescription: 'Generate a default workflow name'
      });
    }

    if (workflow.name && workflow.name.length > 255) {
      errors.push({
        stage: 'structure',
        type: 'error',
        severity: 'medium',
        code: 'NAME_TOO_LONG',
        message: 'Workflow name cannot exceed 255 characters',
        autoFixAvailable: true,
        fixDescription: 'Truncate workflow name to 255 characters'
      });
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push({
        stage: 'structure',
        type: 'error',
        severity: 'critical',
        code: 'MISSING_NODES',
        message: 'Workflow must have a nodes array',
        autoFixAvailable: false
      });
      return;
    }

    if (workflow.nodes.length === 0) {
      errors.push({
        stage: 'structure',
        type: 'error',
        severity: 'critical',
        code: 'EMPTY_WORKFLOW',
        message: 'Workflow must have at least one node',
        autoFixAvailable: true,
        fixDescription: 'Add a manual trigger node'
      });
    }

    // Performance warnings
    if (workflow.nodes.length > 20) {
      warnings.push({
        stage: 'structure',
        type: 'warning',
        severity: 'medium',
        code: 'LARGE_WORKFLOW',
        message: 'Large workflow detected. Consider breaking into smaller components',
        suggestion: 'Split complex workflows into smaller, reusable sub-workflows'
      });
    }

    if (workflow.nodes.length > 50) {
      errors.push({
        stage: 'structure',
        type: 'error',
        severity: 'high',
        code: 'WORKFLOW_TOO_LARGE',
        message: 'Workflow exceeds recommended maximum of 50 nodes',
        suggestion: 'Break workflow into multiple smaller workflows'
      });
    }
  }

  /**
   * Validate individual nodes
   */
  private validateNodes(
    workflow: N8nWorkflow,
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ): void {
    const nodeIds = new Set<string>();
    let hasTrigger = false;

    for (const node of workflow.nodes || []) {
      // Check required node fields
      if (!node.id) {
        errors.push({
          stage: 'nodes',
          type: 'error',
          severity: 'critical',
          code: 'MISSING_NODE_ID',
          message: `Node missing ID: ${node.name || 'unknown'}`,
          nodeName: node.name,
          autoFixAvailable: true,
          fixDescription: 'Generate unique node ID'
        });
        continue;
      }

      if (!node.name) {
        errors.push({
          stage: 'nodes',
          type: 'error',
          severity: 'critical',
          code: 'MISSING_NODE_NAME',
          message: `Node missing name: ${node.id}`,
          nodeId: node.id,
          autoFixAvailable: true,
          fixDescription: 'Generate node name based on type'
        });
      }

      if (!node.type) {
        errors.push({
          stage: 'nodes',
          type: 'error',
          severity: 'critical',
          code: 'MISSING_NODE_TYPE',
          message: `Node missing type: ${node.name || node.id}`,
          nodeId: node.id,
          nodeName: node.name
        });
        continue;
      }

      // Check for duplicate IDs
      if (nodeIds.has(node.id)) {
        errors.push({
          stage: 'nodes',
          type: 'error',
          severity: 'critical',
          code: 'DUPLICATE_NODE_ID',
          message: `Duplicate node ID: ${node.id}`,
          nodeId: node.id,
          autoFixAvailable: true,
          fixDescription: 'Generate unique node ID'
        });
      }
      nodeIds.add(node.id);

      // Validate node type and parameters
      const validationRule = NODE_VALIDATION_RULES[node.type as keyof typeof NODE_VALIDATION_RULES];
      if (validationRule) {
        this.validateNodeParameters(node, validationRule, errors, warnings, suggestions);
      } else {
        warnings.push({
          stage: 'nodes',
          type: 'warning',
          severity: 'low',
          code: 'UNKNOWN_NODE_TYPE',
          message: `Unknown or uncommon node type: ${node.type}`,
          nodeId: node.id,
          nodeName: node.name,
          suggestion: 'Verify node type is supported in your n8n version'
        });
      }

      // Check for trigger nodes
      if (this.isTriggerNode(node.type)) {
        hasTrigger = true;
      }

      // Validate position
      if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
        warnings.push({
          stage: 'nodes',
          type: 'warning',
          severity: 'low',
          code: 'INVALID_POSITION',
          message: `Node ${node.name} has invalid position coordinates`,
          nodeId: node.id,
          nodeName: node.name,
          autoFixAvailable: true,
          fixDescription: 'Generate valid position coordinates'
        });
      }
    }

    // Check for trigger node
    if (!hasTrigger) {
      warnings.push({
        stage: 'nodes',
        type: 'warning',
        severity: 'medium',
        code: 'NO_TRIGGER',
        message: 'Workflow should have at least one trigger node for automatic execution',
        suggestion: 'Add a webhook, cron, or manual trigger node'
      });
    }
  }

  /**
   * Validate node parameters based on type
   */
  private validateNodeParameters(
    node: any,
    rule: any,
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ): void {
    if (!node.parameters) {
      warnings.push({
        stage: 'nodes',
        type: 'warning',
        severity: 'medium',
        code: 'NO_PARAMETERS',
        message: `Node ${node.name} has no parameters configured`,
        nodeId: node.id,
        nodeName: node.name
      });
      return;
    }

    // Check required parameters
    for (const requiredParam of rule.requiredParams || []) {
      if (!node.parameters[requiredParam]) {
        errors.push({
          stage: 'nodes',
          type: 'error',
          severity: 'high',
          code: 'MISSING_REQUIRED_PARAM',
          message: `${node.type} node ${node.name} missing required parameter: ${requiredParam}`,
          nodeId: node.id,
          nodeName: node.name,
          autoFixAvailable: false
        });
      }
    }

    // Type-specific validation
    this.validateNodeTypeSpecific(node, errors, warnings, suggestions);
  }

  /**
   * Type-specific node validation
   */
  private validateNodeTypeSpecific(
    node: any,
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ): void {
    switch (node.type) {
      case 'n8n-nodes-base.httpRequest':
        if (node.parameters.url) {
          try {
            new URL(node.parameters.url);
          } catch {
            errors.push({
              stage: 'nodes',
              type: 'error',
              severity: 'high',
              code: 'INVALID_URL',
              message: `HTTP Request node ${node.name} has invalid URL format`,
              nodeId: node.id,
              nodeName: node.name
            });
          }
        }
        break;

      case 'n8n-nodes-base.function':
      case 'n8n-nodes-base.functionItem':
        if (node.parameters.functionCode) {
          try {
            new Function(node.parameters.functionCode);
          } catch (error) {
            errors.push({
              stage: 'nodes',
              type: 'error',
              severity: 'high',
              code: 'INVALID_FUNCTION_CODE',
              message: `Function node ${node.name} has invalid JavaScript: ${error.message}`,
              nodeId: node.id,
              nodeName: node.name
            });
          }
        }
        break;

      case 'n8n-nodes-base.webhook':
        if (node.parameters.path && node.parameters.path.includes(' ')) {
          warnings.push({
            stage: 'nodes',
            type: 'warning',
            severity: 'medium',
            code: 'WEBHOOK_PATH_SPACES',
            message: `Webhook node ${node.name} path contains spaces`,
            nodeId: node.id,
            nodeName: node.name,
            suggestion: 'Use hyphens or underscores instead of spaces in webhook paths'
          });
        }
        break;
    }
  }

  /**
   * Validate node connections
   */
  private validateConnections(
    workflow: N8nWorkflow,
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ): void {
    const nodeIds = new Set((workflow.nodes || []).map(node => node.id));
    const connections = workflow.connections || {};

    for (const [sourceNodeId, connection] of Object.entries(connections)) {
      if (!nodeIds.has(sourceNodeId)) {
        errors.push({
          stage: 'connections',
          type: 'error',
          severity: 'critical',
          code: 'INVALID_SOURCE_CONNECTION',
          message: `Connection from unknown node: ${sourceNodeId}`,
          nodeId: sourceNodeId
        });
        continue;
      }

      if (connection.main && Array.isArray(connection.main)) {
        for (const outputConnections of connection.main) {
          if (Array.isArray(outputConnections)) {
            for (const targetConnection of outputConnections) {
              if (!nodeIds.has(targetConnection.node)) {
                errors.push({
                  stage: 'connections',
                  type: 'error',
                  severity: 'critical',
                  code: 'INVALID_TARGET_CONNECTION',
                  message: `Connection to unknown node: ${targetConnection.node} from ${sourceNodeId}`,
                  nodeId: targetConnection.node
                });
              }
            }
          }
        }
      }
    }

    // Check for unreachable nodes
    const reachableNodes = this.findReachableNodes(workflow.nodes || [], connections);
    const unreachableNodes = (workflow.nodes || []).filter(node => !reachableNodes.has(node.id));
    
    if (unreachableNodes.length > 0) {
      warnings.push({
        stage: 'connections',
        type: 'warning',
        severity: 'medium',
        code: 'UNREACHABLE_NODES',
        message: `Unreachable nodes found: ${unreachableNodes.map(n => n.name).join(', ')}`,
        suggestion: 'Connect unreachable nodes to the workflow or remove them'
      });
    }
  }

  /**
   * Validate workflow logic and flow
   */
  private validateLogic(
    workflow: N8nWorkflow,
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ): void {
    // Check for circular dependencies
    if (this.hasCircularDependencies(workflow.nodes || [], workflow.connections || {})) {
      errors.push({
        stage: 'logic',
        type: 'error',
        severity: 'critical',
        code: 'CIRCULAR_DEPENDENCY',
        message: 'Circular dependencies detected in workflow',
        suggestion: 'Remove circular connections between nodes'
      });
    }

    // Check for logical inconsistencies
    const conditionalNodes = (workflow.nodes || []).filter(node => 
      node.type === 'n8n-nodes-base.if' || node.type === 'n8n-nodes-base.switch'
    );

    for (const node of conditionalNodes) {
      const connections = workflow.connections?.[node.id];
      if (connections?.main && connections.main.length < 2) {
        warnings.push({
          stage: 'logic',
          type: 'warning',
          severity: 'medium',
          code: 'INCOMPLETE_CONDITIONAL',
          message: `Conditional node ${node.name} should have branches for different outcomes`,
          nodeId: node.id,
          nodeName: node.name
        });
      }
    }
  }

  /**
   * Validate performance characteristics
   */
  private validatePerformance(
    workflow: N8nWorkflow,
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ): void {
    const nodes = workflow.nodes || [];

    // Check for performance bottlenecks
    const httpNodes = nodes.filter(node => node.type === 'n8n-nodes-base.httpRequest');
    if (httpNodes.length > 10) {
      warnings.push({
        stage: 'performance',
        type: 'warning',
        severity: 'medium',
        code: 'MANY_HTTP_REQUESTS',
        message: 'High number of HTTP requests may impact performance',
        suggestion: 'Consider batching requests or using pagination'
      });
    }

    // Check for complex function nodes
    const functionNodes = nodes.filter(node => 
      node.type === 'n8n-nodes-base.function' || node.type === 'n8n-nodes-base.functionItem'
    );

    for (const node of functionNodes) {
      const code = node.parameters?.functionCode || '';
      if (code.includes('for') && code.includes('while')) {
        warnings.push({
          stage: 'performance',
          type: 'warning',
          severity: 'medium',
          code: 'COMPLEX_FUNCTION_CODE',
          message: `Function node ${node.name} contains nested loops`,
          nodeId: node.id,
          nodeName: node.name,
          suggestion: 'Optimize function code to avoid performance issues'
        });
      }
    }
  }

  /**
   * Validate security aspects
   */
  private validateSecurity(
    workflow: N8nWorkflow,
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ): void {
    const nodes = workflow.nodes || [];

    for (const node of nodes) {
      // Check for hardcoded credentials
      const paramStr = JSON.stringify(node.parameters || {});
      if (paramStr.includes('password') || paramStr.includes('token') || paramStr.includes('secret')) {
        warnings.push({
          stage: 'security',
          type: 'warning',
          severity: 'high',
          code: 'POTENTIAL_HARDCODED_CREDENTIALS',
          message: `Node ${node.name} may contain hardcoded credentials`,
          nodeId: node.id,
          nodeName: node.name,
          suggestion: 'Use credential stores instead of hardcoding sensitive data'
        });
      }

      // Check webhook security
      if (node.type === 'n8n-nodes-base.webhook') {
        if (!node.parameters?.authentication) {
          warnings.push({
            stage: 'security',
            type: 'warning',
            severity: 'medium',
            code: 'WEBHOOK_NO_AUTH',
            message: `Webhook node ${node.name} has no authentication configured`,
            nodeId: node.id,
            nodeName: node.name,
            suggestion: 'Configure authentication for production webhooks'
          });
        }
      }

      // Check HTTP request security
      if (node.type === 'n8n-nodes-base.httpRequest') {
        const url = node.parameters?.url || '';
        if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
          warnings.push({
            stage: 'security',
            type: 'warning',
            severity: 'medium',
            code: 'HTTP_NOT_HTTPS',
            message: `HTTP Request node ${node.name} uses insecure HTTP protocol`,
            nodeId: node.id,
            nodeName: node.name,
            suggestion: 'Use HTTPS for external API calls'
          });
        }
      }
    }
  }

  /**
   * Validate against n8n best practices
   */
  private validateBestPractices(
    workflow: N8nWorkflow,
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ): void {
    const nodes = workflow.nodes || [];

    // Check naming conventions
    for (const node of nodes) {
      if (node.name && node.name === node.type) {
        suggestions.push({
          stage: 'best_practices',
          type: 'suggestion',
          severity: 'low',
          code: 'GENERIC_NODE_NAME',
          message: `Consider giving node ${node.name} a more descriptive name`,
          nodeId: node.id,
          nodeName: node.name,
          suggestion: 'Use descriptive names that explain what the node does'
        });
      }
    }

    // Check for error handling
    const hasErrorHandling = nodes.some(node => 
      node.name?.toLowerCase().includes('error') ||
      node.type === 'n8n-nodes-base.if' ||
      node.parameters?.continueOnFail
    );

    if (!hasErrorHandling && nodes.length > 3) {
      suggestions.push({
        stage: 'best_practices',
        type: 'suggestion',
        severity: 'low',
        code: 'NO_ERROR_HANDLING',
        message: 'Consider adding error handling for robust workflows',
        suggestion: 'Add conditional nodes or enable "Continue on Fail" for critical nodes'
      });
    }

    // Check for documentation
    const hasDocumentation = nodes.some(node => 
      node.notes || (node.parameters?.description && node.parameters.description.length > 10)
    );

    if (!hasDocumentation && nodes.length > 5) {
      suggestions.push({
        stage: 'best_practices',
        type: 'suggestion',
        severity: 'low',
        code: 'NO_DOCUMENTATION',
        message: 'Add notes or descriptions to document complex workflow logic',
        suggestion: 'Use node notes to explain business logic and complex operations'
      });
    }
  }

  /**
   * Perform AI-powered analysis of the workflow
   */
  private async performAIAnalysis(workflow: N8nWorkflow, validationResult: ValidationResult): Promise<any> {
    const prompt = `Analyze this n8n workflow and provide insights:

Workflow: ${JSON.stringify(workflow, null, 2)}

Current validation issues: ${JSON.stringify({
  errors: validationResult.summary.totalErrors,
  warnings: validationResult.summary.totalWarnings,
  complexity: validationResult.complexity
})}

Please provide:
1. Overall workflow assessment
2. Potential improvements
3. Alternative approaches
4. Performance optimizations
5. Security recommendations

Respond with JSON only.`;

    try {
      const response = await this.openaiService.chat([
        { role: 'system', content: 'You are an expert n8n workflow analyst. Provide detailed analysis in JSON format.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.2,
        maxTokens: 1000
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return null;
    }
  }

  /**
   * Integrate AI analysis into validation results
   */
  private integrateAIAnalysis(result: ValidationResult, aiAnalysis: any): void {
    if (!aiAnalysis) return;

    if (aiAnalysis.improvements) {
      result.optimization.potentialImprovements.push(...aiAnalysis.improvements);
    }

    if (aiAnalysis.alternatives) {
      result.optimization.alternativeApproaches.push(...aiAnalysis.alternatives);
    }

    if (aiAnalysis.security) {
      result.security.recommendations.push(...aiAnalysis.security);
    }
  }

  /**
   * Auto-fix common issues
   */
  async autoFixWorkflow(workflow: N8nWorkflow, validationResult: ValidationResult): Promise<{
    fixedWorkflow: N8nWorkflow;
    appliedFixes: AutoFixResult[];
  }> {
    const fixedWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone
    const appliedFixes: AutoFixResult[] = [];

    // Fix missing workflow name
    if (!fixedWorkflow.name) {
      fixedWorkflow.name = this.generateWorkflowName(fixedWorkflow);
      appliedFixes.push({
        applied: true,
        fixedErrors: ['MISSING_NAME'],
        modifiedNodes: [],
        description: 'Generated workflow name'
      });
    }

    // Fix missing node IDs
    for (const node of fixedWorkflow.nodes || []) {
      if (!node.id) {
        node.id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        appliedFixes.push({
          applied: true,
          fixedErrors: ['MISSING_NODE_ID'],
          modifiedNodes: [node.name || node.id],
          description: `Generated ID for node ${node.name}`
        });
      }

      if (!node.name) {
        node.name = this.generateNodeName(node.type);
        appliedFixes.push({
          applied: true,
          fixedErrors: ['MISSING_NODE_NAME'],
          modifiedNodes: [node.id],
          description: `Generated name for node ${node.id}`
        });
      }

      // Fix positions
      if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
        const index = (fixedWorkflow.nodes || []).indexOf(node);
        node.position = [240 + index * 220, 300];
        appliedFixes.push({
          applied: true,
          fixedErrors: ['INVALID_POSITION'],
          modifiedNodes: [node.id],
          description: `Generated position for node ${node.name}`
        });
      }
    }

    return { fixedWorkflow, appliedFixes };
  }

  // Helper methods
  private calculateQualityScore(result: ValidationResult): number {
    let score = 100;
    score -= result.summary.criticalIssues * 25;
    score -= result.summary.totalErrors * 10;
    score -= result.summary.totalWarnings * 2;
    return Math.max(0, score);
  }

  private calculateConfidenceScore(result: ValidationResult): number {
    const totalChecks = Object.keys(result.stages).length * 10; // Rough estimate
    const failedChecks = result.summary.totalErrors + (result.summary.totalWarnings * 0.5);
    return Math.max(0, Math.min(100, 100 - (failedChecks / totalChecks) * 100));
  }

  private determineComplexity(workflow: N8nWorkflow): 'simple' | 'medium' | 'complex' {
    const nodeCount = workflow.nodes?.length || 0;
    const connectionCount = Object.keys(workflow.connections || {}).length;

    if (nodeCount <= 3 && connectionCount <= 2) return 'simple';
    if (nodeCount <= 10 && connectionCount <= 8) return 'medium';
    return 'complex';
  }

  private analyzePerformance(workflow: N8nWorkflow): ValidationResult['performance'] {
    const nodes = workflow.nodes || [];
    let estimatedMs = 0;
    let resourceUsage: 'low' | 'medium' | 'high' = 'low';

    for (const node of nodes) {
      switch (node.type) {
        case 'n8n-nodes-base.httpRequest':
          estimatedMs += 1000;
          break;
        case 'n8n-nodes-base.function':
          estimatedMs += 100;
          resourceUsage = 'medium';
          break;
        case 'n8n-nodes-base.postgres':
          estimatedMs += 500;
          break;
        default:
          estimatedMs += 50;
      }
    }

    if (nodes.length > 15) resourceUsage = 'high';

    return {
      estimatedExecutionTime: estimatedMs < 1000 ? '< 1 second' : `${Math.ceil(estimatedMs / 1000)} seconds`,
      resourceUsage,
      scalabilityRating: Math.max(1, Math.min(10, 10 - Math.floor(nodes.length / 5)))
    };
  }

  private analyzeSecu_rity(workflow: N8nWorkflow, result: ValidationResult): ValidationResult['security'] {
    let score = 100;
    const vulnerabilities = result.stages.security?.errors.filter(e => e.severity === 'high') || [];
    const recommendations: string[] = [];

    score -= vulnerabilities.length * 15;

    if (workflow.nodes?.some(n => n.type === 'n8n-nodes-base.webhook')) {
      recommendations.push('Configure webhook authentication for production use');
    }

    if (workflow.nodes?.some(n => n.type === 'n8n-nodes-base.httpRequest')) {
      recommendations.push('Use HTTPS for all external API calls');
    }

    return {
      securityScore: Math.max(0, score),
      vulnerabilities,
      recommendations
    };
  }

  private analyzeOptimizations(workflow: N8nWorkflow, result: ValidationResult): ValidationResult['optimization'] {
    const suggestions: ValidationError[] = [];
    const potentialImprovements: string[] = [];
    const alternativeApproaches: string[] = [];

    const nodes = workflow.nodes || [];

    if (nodes.length > 10) {
      potentialImprovements.push('Break large workflow into smaller, reusable components');
    }

    const httpNodes = nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');
    if (httpNodes.length > 5) {
      potentialImprovements.push('Consider batching HTTP requests or using n8n\'s HTTP Request batch node');
    }

    if (!nodes.some(n => n.type?.includes('trigger'))) {
      alternativeApproaches.push('Add automated triggers instead of manual execution');
    }

    return { suggestions, potentialImprovements, alternativeApproaches };
  }

  private isTriggerNode(nodeType: string): boolean {
    return nodeType?.includes('trigger') || 
           nodeType?.includes('webhook') || 
           nodeType?.includes('cron') ||
           nodeType === 'n8n-nodes-base.manualTrigger';
  }

  private findReachableNodes(nodes: any[], connections: any): Set<string> {
    const reachable = new Set<string>();
    const triggerNodes = nodes.filter(node => this.isTriggerNode(node.type));
    
    const queue = triggerNodes.map(node => node.id);
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;
      
      reachable.add(nodeId);
      
      const connection = connections[nodeId];
      if (connection?.main) {
        for (const outputConnections of connection.main) {
          if (Array.isArray(outputConnections)) {
            for (const target of outputConnections) {
              if (!reachable.has(target.node)) {
                queue.push(target.node);
              }
            }
          }
        }
      }
    }

    return reachable;
  }

  private hasCircularDependencies(nodes: any[], connections: any): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const connection = connections[nodeId];
      if (connection?.main) {
        for (const outputConnections of connection.main) {
          if (Array.isArray(outputConnections)) {
            for (const target of outputConnections) {
              if (dfs(target.node)) return true;
            }
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  private generateWorkflowName(workflow: N8nWorkflow): string {
    const nodes = workflow.nodes || [];
    if (nodes.length === 0) return 'Empty Workflow';

    const triggerNode = nodes.find(node => this.isTriggerNode(node.type));
    const actionNodes = nodes.filter(node => !this.isTriggerNode(node.type));

    if (triggerNode && actionNodes.length > 0) {
      const triggerType = triggerNode.type.split('.').pop() || 'trigger';
      const actionType = actionNodes[0].type.split('.').pop() || 'action';
      return `${triggerType} to ${actionType}`.replace(/([A-Z])/g, ' $1').trim();
    }

    return `Generated Workflow ${Date.now()}`;
  }

  private generateNodeName(nodeType: string): string {
    const typeMap: Record<string, string> = {
      'n8n-nodes-base.webhook': 'Webhook',
      'n8n-nodes-base.httpRequest': 'HTTP Request',
      'n8n-nodes-base.function': 'Function',
      'n8n-nodes-base.set': 'Set',
      'n8n-nodes-base.if': 'IF',
      'n8n-nodes-base.switch': 'Switch',
      'n8n-nodes-base.cron': 'Schedule'
    };

    return typeMap[nodeType] || nodeType.split('.').pop() || 'Node';
  }
}