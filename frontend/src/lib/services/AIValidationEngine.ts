/**
 * AI-Powered Validation Engine - MVP Implementation
 * 
 * This service provides comprehensive validation for workflow specifications:
 * 1. Workflow feasibility assessment using AI and rule-based validation
 * 2. Technical requirement validation against n8n capabilities  
 * 3. Performance and scalability analysis
 * 4. Security and best practices checking
 * 5. Integration validation and credential requirements
 */

import { openAIService } from './OpenAIService';
import { RequirementSpec } from './AIProcessingEngine';
import { N8nWorkflow } from './WorkflowGenerationEngine';

export interface ValidationResult {
  isValid: boolean;
  feasibilityScore: number; // 0-100
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  recommendations: string[];
  requiredCredentials: CredentialRequirement[];
  performanceAnalysis: PerformanceAnalysis;
  securityAnalysis: SecurityAnalysis;
}

export interface ValidationIssue {
  severity: 'critical' | 'major' | 'minor';
  category: 'feasibility' | 'performance' | 'security' | 'configuration';
  message: string;
  suggestion?: string;
  blockingGeneration: boolean;
}

export interface ValidationWarning {
  category: 'performance' | 'best_practice' | 'maintenance' | 'usability';
  message: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface CredentialRequirement {
  service: string;
  type: string;
  required: boolean;
  description: string;
  setupInstructions?: string;
}

export interface PerformanceAnalysis {
  estimatedExecutionTime: string;
  rateLimitRisks: string[];
  scalabilityScore: number; // 0-100
  bottleneckNodes: string[];
  optimizationSuggestions: string[];
}

export interface SecurityAnalysis {
  securityScore: number; // 0-100
  dataExposureRisks: string[];
  credentialRisks: string[];
  complianceIssues: string[];
  securityRecommendations: string[];
}

export interface N8nNodeCapability {
  type: string;
  available: boolean;
  version?: string;
  limitations?: string[];
  alternativeNodes?: string[];
}

export class AIValidationEngine {
  // N8n node availability database (simplified for MVP)
  private readonly N8N_NODES = {
    'trigger': {
      'webhook': { available: true, limitations: ['HTTP only', 'No authentication built-in'] },
      'cron': { available: true, limitations: ['Max 1000 executions/month on free plan'] },
      'manual': { available: true, limitations: [] },
      'email': { available: true, limitations: ['POP3/IMAP only'] }
    },
    'action': {
      'http_request': { available: true, limitations: ['5s default timeout'] },
      'email_send': { available: true, limitations: ['Rate limiting applies'] },
      'slack': { available: true, limitations: ['OAuth required'] },
      'discord': { available: true, limitations: ['Webhook or bot token required'] },
      'google_sheets': { available: true, limitations: ['OAuth required'] },
      'airtable': { available: true, limitations: ['API key required'] }
    },
    'processing': {
      'set': { available: true, limitations: [] },
      'if': { available: true, limitations: ['Simple conditions only'] },
      'switch': { available: true, limitations: [] },
      'code': { available: true, limitations: ['JavaScript only', '10s execution limit'] },
      'function': { available: true, limitations: ['JavaScript only'] }
    }
  };

  private readonly FEASIBILITY_ASSESSMENT_PROMPT = `Assess the technical feasibility of this workflow specification for n8n:

SPECIFICATION: {specification}

Analyze these aspects:

1. **Node Availability**: Are all required n8n nodes available?
2. **Integration Complexity**: Rate the difficulty of connecting these services (1-10)
3. **Data Flow Viability**: Is the data transformation realistic?
4. **Authentication Requirements**: What credentials and setup are needed?
5. **Rate Limits & Constraints**: What service limitations could affect this workflow?
6. **Error Scenarios**: What could go wrong and how severe would it be?

For each aspect, provide:
- Feasibility rating (1-10)
- Specific concerns or issues
- Alternative approaches if problems exist
- Implementation difficulty estimate

Return structured JSON:
{
  "feasibility_score": 85,
  "node_availability": {
    "score": 9,
    "missing_nodes": [],
    "alternative_nodes": {}
  },
  "integration_complexity": {
    "score": 7,
    "complex_integrations": ["service1", "service2"],
    "auth_requirements": ["oauth2", "api_key"]
  },
  "data_flow": {
    "score": 8,
    "transformation_issues": [],
    "data_format_concerns": []
  },
  "constraints": {
    "rate_limits": ["service limits", "n8n limits"],
    "technical_limitations": ["timeouts", "payload size"]
  },
  "risk_assessment": {
    "high_risk_areas": ["area1", "area2"],
    "mitigation_strategies": ["strategy1", "strategy2"]
  }
}`;

  private readonly PERFORMANCE_ANALYSIS_PROMPT = `Analyze the performance characteristics of this n8n workflow:

WORKFLOW: {workflow}

Evaluate:

1. **Execution Time**: Estimate total runtime for typical data volumes
2. **Bottlenecks**: Identify nodes that could slow down execution
3. **Scalability**: How will this perform with increased load?
4. **Resource Usage**: Memory and processing requirements
5. **Rate Limiting**: Which services impose limits that could affect performance?

Provide specific recommendations for optimization.

Return JSON:
{
  "estimated_execution_time": "2-5 seconds",
  "bottleneck_nodes": ["HTTP Request to slow API"],
  "scalability_score": 75,
  "rate_limit_risks": ["API has 1000 calls/hour limit"],
  "optimization_suggestions": [
    "Add caching for repeated API calls",
    "Implement batch processing for large datasets"
  ]
}`;

  private readonly SECURITY_ANALYSIS_PROMPT = `Perform security analysis of this n8n workflow:

WORKFLOW: {workflow}

Assess:

1. **Data Exposure**: What sensitive data flows through the workflow?
2. **Credential Security**: How are API keys and tokens handled?
3. **Access Control**: Who can trigger or modify this workflow?
4. **Data Retention**: How long is sensitive data stored?
5. **Compliance**: GDPR, HIPAA, or other regulatory concerns?

Identify risks and provide security recommendations.

Return JSON:
{
  "security_score": 80,
  "data_exposure_risks": ["Customer email addresses in logs"],
  "credential_risks": ["API keys visible in node configuration"],
  "compliance_issues": ["No data retention policy"],
  "security_recommendations": [
    "Use environment variables for credentials",
    "Implement data masking for sensitive fields"
  ]
}`;

  /**
   * Validate requirement specification comprehensively
   */
  async validateRequirementSpec(specification: RequirementSpec): Promise<ValidationResult> {
    console.log('[AIValidationEngine] Validating requirement specification');

    try {
      // Parallel validation tasks
      const [
        feasibilityResult,
        nodeValidation,
        credentialAnalysis,
        performanceEstimate
      ] = await Promise.all([
        this.assessFeasibility(specification),
        this.validateNodeAvailability(specification),
        this.analyzeCredentialRequirements(specification),
        this.estimatePerformance(specification)
      ]);

      // Combine results
      const issues: ValidationIssue[] = [];
      const warnings: ValidationWarning[] = [];
      const recommendations: string[] = [];

      // Process feasibility results
      if (feasibilityResult.feasibility_score < 60) {
        issues.push({
          severity: 'critical',
          category: 'feasibility',
          message: 'Low feasibility score indicates significant implementation challenges',
          blockingGeneration: true
        });
      }

      // Process node validation
      nodeValidation.missingNodes.forEach(node => {
        if (nodeValidation.alternativeNodes[node]) {
          warnings.push({
            category: 'best_practice',
            message: `Node '${node}' not available, consider using '${nodeValidation.alternativeNodes[node]}'`,
            impact: 'medium',
            suggestion: `Replace ${node} with ${nodeValidation.alternativeNodes[node]}`
          });
        } else {
          issues.push({
            severity: 'critical',
            category: 'feasibility',
            message: `Required node '${node}' is not available in n8n`,
            blockingGeneration: true
          });
        }
      });

      // Add general recommendations
      recommendations.push(
        'Test the workflow thoroughly before deploying to production',
        'Set up monitoring and alerting for the workflow',
        'Review and rotate credentials regularly'
      );

      if (feasibilityResult.risk_assessment?.mitigation_strategies) {
        recommendations.push(...feasibilityResult.risk_assessment.mitigation_strategies);
      }

      // Create security analysis (simplified for requirement spec)
      const securityAnalysis: SecurityAnalysis = {
        securityScore: 85,
        dataExposureRisks: specification.integrations
          .filter(integration => this.isDataSensitiveIntegration(integration))
          .map(integration => `${integration} may handle sensitive data`),
        credentialRisks: [`${credentialAnalysis.length} credential(s) required - ensure secure storage`],
        complianceIssues: [],
        securityRecommendations: [
          'Use environment variables for all credentials',
          'Implement proper error handling to avoid data leaks',
          'Review data retention policies for integrated services'
        ]
      };

      return {
        isValid: issues.filter(i => i.blockingGeneration).length === 0,
        feasibilityScore: feasibilityResult.feasibility_score || 70,
        issues,
        warnings,
        recommendations,
        requiredCredentials: credentialAnalysis,
        performanceAnalysis: performanceEstimate,
        securityAnalysis
      };

    } catch (error) {
      console.error('[AIValidationEngine] Error validating specification:', error);
      
      return {
        isValid: false,
        feasibilityScore: 0,
        issues: [{
          severity: 'critical',
          category: 'feasibility',
          message: 'Failed to validate specification due to processing error',
          blockingGeneration: true
        }],
        warnings: [],
        recommendations: ['Please try again or contact support'],
        requiredCredentials: [],
        performanceAnalysis: {
          estimatedExecutionTime: 'unknown',
          rateLimitRisks: [],
          scalabilityScore: 0,
          bottleneckNodes: [],
          optimizationSuggestions: []
        },
        securityAnalysis: {
          securityScore: 0,
          dataExposureRisks: [],
          credentialRisks: [],
          complianceIssues: [],
          securityRecommendations: []
        }
      };
    }
  }

  /**
   * Validate generated n8n workflow
   */
  async validateWorkflow(workflow: N8nWorkflow): Promise<ValidationResult> {
    console.log('[AIValidationEngine] Validating n8n workflow');

    try {
      // Parallel validation tasks
      const [
        structuralValidation,
        performanceAnalysis,
        securityAnalysis
      ] = await Promise.all([
        this.validateWorkflowStructure(workflow),
        this.analyzeWorkflowPerformance(workflow),
        this.analyzeWorkflowSecurity(workflow)
      ]);

      const issues: ValidationIssue[] = [];
      const warnings: ValidationWarning[] = [];
      const recommendations: string[] = [];

      // Process structural validation
      structuralValidation.errors.forEach(error => {
        issues.push({
          severity: 'critical',
          category: 'configuration',
          message: error,
          blockingGeneration: true
        });
      });

      structuralValidation.warnings.forEach(warning => {
        warnings.push({
          category: 'best_practice',
          message: warning,
          impact: 'low',
          suggestion: 'Review workflow configuration'
        });
      });

      // Process performance analysis
      if (performanceAnalysis.scalabilityScore < 60) {
        warnings.push({
          category: 'performance',
          message: 'Workflow may have scalability issues',
          impact: 'high',
          suggestion: 'Consider optimization strategies'
        });
      }

      // Process security analysis
      if (securityAnalysis.securityScore < 70) {
        issues.push({
          severity: 'major',
          category: 'security',
          message: 'Workflow has significant security concerns',
          suggestion: 'Review security recommendations',
          blockingGeneration: false
        });
      }

      // Extract credentials
      const requiredCredentials = this.extractWorkflowCredentials(workflow);

      recommendations.push(
        'Test workflow execution with sample data',
        'Set up error handling and monitoring',
        'Review performance under expected load',
        ...performanceAnalysis.optimizationSuggestions,
        ...securityAnalysis.securityRecommendations
      );

      return {
        isValid: issues.filter(i => i.blockingGeneration).length === 0,
        feasibilityScore: Math.min(
          structuralValidation.validationScore,
          performanceAnalysis.scalabilityScore,
          securityAnalysis.securityScore
        ),
        issues,
        warnings,
        recommendations,
        requiredCredentials,
        performanceAnalysis,
        securityAnalysis
      };

    } catch (error) {
      console.error('[AIValidationEngine] Error validating workflow:', error);
      
      return {
        isValid: false,
        feasibilityScore: 0,
        issues: [{
          severity: 'critical',
          category: 'configuration',
          message: 'Failed to validate workflow structure',
          blockingGeneration: true
        }],
        warnings: [],
        recommendations: [],
        requiredCredentials: [],
        performanceAnalysis: {
          estimatedExecutionTime: 'unknown',
          rateLimitRisks: [],
          scalabilityScore: 0,
          bottleneckNodes: [],
          optimizationSuggestions: []
        },
        securityAnalysis: {
          securityScore: 0,
          dataExposureRisks: [],
          credentialRisks: [],
          complianceIssues: [],
          securityRecommendations: []
        }
      };
    }
  }

  // Private validation methods

  private async assessFeasibility(specification: RequirementSpec): Promise<any> {
    try {
      const prompt = this.FEASIBILITY_ASSESSMENT_PROMPT.replace(
        '{specification}',
        JSON.stringify(specification)
      );

      const response = await openAIService.simpleRequest(prompt, '', {
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.3
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('[AIValidationEngine] Error assessing feasibility:', error);
      return { feasibility_score: 50 };
    }
  }

  private validateNodeAvailability(specification: RequirementSpec): {
    availableNodes: string[];
    missingNodes: string[];
    alternativeNodes: Record<string, string>;
  } {
    const requiredNodes = [
      specification.trigger.type,
      ...specification.actions.map(action => action.type)
    ];

    const missingNodes: string[] = [];
    const alternativeNodes: Record<string, string> = {};
    const availableNodes: string[] = [];

    requiredNodes.forEach(nodeType => {
      if (this.isNodeAvailable(nodeType)) {
        availableNodes.push(nodeType);
      } else {
        missingNodes.push(nodeType);
        const alternative = this.getAlternativeNode(nodeType);
        if (alternative) {
          alternativeNodes[nodeType] = alternative;
        }
      }
    });

    return {
      availableNodes,
      missingNodes,
      alternativeNodes
    };
  }

  private analyzeCredentialRequirements(specification: RequirementSpec): CredentialRequirement[] {
    const credentials: CredentialRequirement[] = [];
    
    specification.integrations.forEach(integration => {
      const credentialInfo = this.getCredentialRequirements(integration);
      if (credentialInfo) {
        credentials.push(credentialInfo);
      }
    });

    return credentials;
  }

  private async estimatePerformance(specification: RequirementSpec): Promise<PerformanceAnalysis> {
    // Simple performance estimation based on complexity
    const complexity = specification.complexity;
    const nodeCount = 1 + specification.actions.length;
    
    let executionTime = '1-3 seconds';
    let scalabilityScore = 90;
    
    if (complexity === 'complex' || nodeCount > 5) {
      executionTime = '5-15 seconds';
      scalabilityScore = 60;
    } else if (complexity === 'moderate' || nodeCount > 3) {
      executionTime = '2-8 seconds';
      scalabilityScore = 75;
    }

    const rateLimitRisks = specification.integrations
      .filter(integration => this.hasRateLimits(integration))
      .map(integration => `${integration} has rate limiting that may affect performance`);

    return {
      estimatedExecutionTime: executionTime,
      rateLimitRisks,
      scalabilityScore,
      bottleneckNodes: specification.actions
        .filter(action => this.isSlowNode(action.type))
        .map(action => action.type),
      optimizationSuggestions: [
        'Consider caching for frequently accessed data',
        'Use batch processing for large datasets',
        'Implement timeout handling for external APIs'
      ]
    };
  }

  private validateWorkflowStructure(workflow: N8nWorkflow): {
    validationScore: number;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    if (!workflow.name) errors.push('Workflow name is required');
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push('Workflow must have nodes array');
    }
    if (!workflow.connections) errors.push('Workflow must have connections object');

    // Node validation
    if (workflow.nodes) {
      if (workflow.nodes.length === 0) {
        errors.push('Workflow must have at least one node');
      }

      workflow.nodes.forEach((node, index) => {
        if (!node.id) errors.push(`Node ${index} missing ID`);
        if (!node.name) warnings.push(`Node ${index} missing name`);
        if (!node.type) errors.push(`Node ${index} missing type`);
        if (!node.position) warnings.push(`Node ${index} missing position`);
      });

      // Check for trigger nodes
      const hasTrigger = workflow.nodes.some(node => 
        node.type.includes('trigger') || 
        node.type.includes('webhook') ||
        node.type.includes('cron') ||
        node.type === 'n8n-nodes-base.manualTrigger'
      );

      if (!hasTrigger) {
        warnings.push('Workflow should have at least one trigger node');
      }
    }

    // Connection validation
    if (workflow.connections && workflow.nodes) {
      const nodeNames = workflow.nodes.map(n => n.name);
      Object.keys(workflow.connections).forEach(nodeName => {
        if (!nodeNames.includes(nodeName)) {
          errors.push(`Connection references non-existent node: ${nodeName}`);
        }
      });
    }

    const validationScore = Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5));

    return {
      validationScore,
      errors,
      warnings
    };
  }

  private async analyzeWorkflowPerformance(workflow: N8nWorkflow): Promise<PerformanceAnalysis> {
    try {
      const prompt = this.PERFORMANCE_ANALYSIS_PROMPT.replace(
        '{workflow}',
        JSON.stringify({
          name: workflow.name,
          nodeCount: workflow.nodes.length,
          nodeTypes: workflow.nodes.map(n => n.type)
        })
      );

      const response = await openAIService.simpleRequest(prompt, '', {
        model: 'gpt-3.5-turbo',
        maxTokens: 600,
        temperature: 0.4
      });

      const analysis = JSON.parse(response);
      
      return {
        estimatedExecutionTime: analysis.estimated_execution_time || '2-5 seconds',
        rateLimitRisks: analysis.rate_limit_risks || [],
        scalabilityScore: analysis.scalability_score || 75,
        bottleneckNodes: analysis.bottleneck_nodes || [],
        optimizationSuggestions: analysis.optimization_suggestions || []
      };
      
    } catch (error) {
      console.error('[AIValidationEngine] Error analyzing performance:', error);
      
      return {
        estimatedExecutionTime: '2-5 seconds',
        rateLimitRisks: [],
        scalabilityScore: 70,
        bottleneckNodes: [],
        optimizationSuggestions: ['Add error handling', 'Implement timeouts']
      };
    }
  }

  private async analyzeWorkflowSecurity(workflow: N8nWorkflow): Promise<SecurityAnalysis> {
    try {
      const prompt = this.SECURITY_ANALYSIS_PROMPT.replace(
        '{workflow}',
        JSON.stringify({
          name: workflow.name,
          nodes: workflow.nodes.map(n => ({
            type: n.type,
            hasCredentials: !!n.credentials
          }))
        })
      );

      const response = await openAIService.simpleRequest(prompt, '', {
        model: 'gpt-4',
        maxTokens: 600,
        temperature: 0.3
      });

      const analysis = JSON.parse(response);
      
      return {
        securityScore: analysis.security_score || 80,
        dataExposureRisks: analysis.data_exposure_risks || [],
        credentialRisks: analysis.credential_risks || [],
        complianceIssues: analysis.compliance_issues || [],
        securityRecommendations: analysis.security_recommendations || []
      };
      
    } catch (error) {
      console.error('[AIValidationEngine] Error analyzing security:', error);
      
      return {
        securityScore: 70,
        dataExposureRisks: [],
        credentialRisks: ['Review credential storage'],
        complianceIssues: [],
        securityRecommendations: [
          'Use environment variables for credentials',
          'Implement proper error handling'
        ]
      };
    }
  }

  private extractWorkflowCredentials(workflow: N8nWorkflow): CredentialRequirement[] {
    const credentials: CredentialRequirement[] = [];
    const credentialTypes = new Set<string>();

    workflow.nodes.forEach(node => {
      if (node.credentials) {
        Object.values(node.credentials).forEach(credType => {
          if (typeof credType === 'string' && !credentialTypes.has(credType)) {
            credentialTypes.add(credType);
            credentials.push({
              service: this.getServiceFromCredentialType(credType),
              type: credType,
              required: true,
              description: `Authentication for ${this.getServiceFromCredentialType(credType)}`
            });
          }
        });
      }
    });

    return credentials;
  }

  // Helper methods

  private isNodeAvailable(nodeType: string): boolean {
    // Simplified check - in real implementation would check against n8n API
    const commonNodes = [
      'webhook', 'cron', 'manual', 'http_request', 'email_send',
      'slack', 'set', 'if', 'code', 'function'
    ];
    return commonNodes.includes(nodeType.toLowerCase());
  }

  private getAlternativeNode(nodeType: string): string | null {
    const alternatives: Record<string, string> = {
      'sms': 'http_request',
      'ftp': 'http_request',
      'database': 'code'
    };
    return alternatives[nodeType.toLowerCase()] || null;
  }

  private getCredentialRequirements(integration: string): CredentialRequirement | null {
    const credentialMap: Record<string, CredentialRequirement> = {
      'slack': {
        service: 'Slack',
        type: 'slackOAuth2Api',
        required: true,
        description: 'OAuth2 authentication for Slack integration',
        setupInstructions: 'Create a Slack app and configure OAuth2 scopes'
      },
      'google_sheets': {
        service: 'Google Sheets',
        type: 'googleOAuth2Api',
        required: true,
        description: 'OAuth2 authentication for Google Sheets',
        setupInstructions: 'Create Google Cloud project and enable Sheets API'
      },
      'github': {
        service: 'GitHub',
        type: 'githubOAuth2Api',
        required: true,
        description: 'OAuth2 or token authentication for GitHub',
        setupInstructions: 'Generate personal access token or configure OAuth2'
      }
    };

    return credentialMap[integration.toLowerCase()] || null;
  }

  private hasRateLimits(integration: string): boolean {
    const limitedServices = ['slack', 'twitter', 'github', 'google_sheets', 'stripe'];
    return limitedServices.includes(integration.toLowerCase());
  }

  private isSlowNode(nodeType: string): boolean {
    const slowNodes = ['http_request', 'email_send', 'ftp'];
    return slowNodes.includes(nodeType.toLowerCase());
  }

  private isDataSensitiveIntegration(integration: string): boolean {
    const sensitiveIntegrations = ['email', 'database', 'crm', 'payment'];
    return sensitiveIntegrations.some(sensitive => 
      integration.toLowerCase().includes(sensitive)
    );
  }

  private getServiceFromCredentialType(credType: string): string {
    const serviceMap: Record<string, string> = {
      'slackOAuth2Api': 'Slack',
      'googleOAuth2Api': 'Google',
      'githubOAuth2Api': 'GitHub',
      'stripeApi': 'Stripe',
      'airtableApi': 'Airtable'
    };
    return serviceMap[credType] || credType;
  }
}

// Export singleton instance
export const aiValidationEngine = new AIValidationEngine();