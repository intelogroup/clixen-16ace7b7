/**
 * Langflow Workflow Templates
 * Pre-built workflows that empower our agents with advanced coding capabilities
 */

export interface LangflowWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'development' | 'testing' | 'optimization' | 'debugging' | 'documentation';
  agents: string[];
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTime: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  workflow: any;
}

/**
 * Database Development Workflow Templates
 */
export const DATABASE_WORKFLOWS: LangflowWorkflowTemplate[] = [
  {
    id: 'db-schema-from-requirements',
    name: 'Database Schema from Requirements',
    description: 'Generates complete database schema with tables, indexes, and RLS policies',
    category: 'development',
    agents: ['database', 'auth'],
    complexity: 'medium',
    estimatedTime: '10-15 minutes',
    inputs: {
      requirements: 'string',
      existingSchema: 'object?',
      compliance: 'string[]'
    },
    outputs: {
      schema: 'sql',
      migrations: 'sql[]',
      rlsPolicies: 'sql[]',
      documentation: 'markdown'
    },
    workflow: {
      nodes: [
        {
          id: 'requirements-analysis',
          type: 'ai-analyst',
          config: {
            prompt: 'Analyze requirements and identify entities, relationships, and constraints',
            model: 'gpt-4'
          }
        },
        {
          id: 'schema-generation',
          type: 'code-generator',
          config: {
            language: 'sql',
            template: 'postgresql-schema',
            bestPractices: true
          }
        },
        {
          id: 'rls-policies',
          type: 'security-generator',
          config: {
            framework: 'supabase-rls',
            compliance: ['gdpr', 'hipaa']
          }
        },
        {
          id: 'validation',
          type: 'validator',
          config: {
            checks: ['syntax', 'constraints', 'performance']
          }
        }
      ],
      connections: [
        { from: 'requirements-analysis', to: 'schema-generation' },
        { from: 'schema-generation', to: 'rls-policies' },
        { from: 'rls-policies', to: 'validation' }
      ]
    }
  },
  {
    id: 'db-optimization-workflow',
    name: 'Database Query Optimization',
    description: 'Analyzes and optimizes database queries for performance',
    category: 'optimization',
    agents: ['database'],
    complexity: 'medium',
    estimatedTime: '5-10 minutes',
    inputs: {
      queries: 'string[]',
      performanceMetrics: 'object',
      targetDb: 'string'
    },
    outputs: {
      optimizedQueries: 'sql[]',
      indexSuggestions: 'sql[]',
      performanceReport: 'object'
    },
    workflow: {
      nodes: [
        {
          id: 'query-analysis',
          type: 'performance-analyzer',
          config: {
            database: 'postgresql',
            metrics: ['execution-time', 'index-usage', 'scan-cost']
          }
        },
        {
          id: 'optimization',
          type: 'query-optimizer',
          config: {
            strategies: ['index-optimization', 'query-rewriting', 'join-optimization']
          }
        },
        {
          id: 'validation',
          type: 'performance-validator',
          config: {
            benchmarkImprovement: 0.3
          }
        }
      ]
    }
  }
];

/**
 * API Development Workflow Templates
 */
export const API_WORKFLOWS: LangflowWorkflowTemplate[] = [
  {
    id: 'api-from-schema',
    name: 'REST API from Database Schema',
    description: 'Generates complete REST API endpoints from database schema',
    category: 'development',
    agents: ['api', 'auth', 'testing'],
    complexity: 'complex',
    estimatedTime: '20-30 minutes',
    inputs: {
      schema: 'object',
      endpoints: 'string[]',
      authRequirements: 'object'
    },
    outputs: {
      apiCode: 'typescript',
      middleware: 'typescript',
      tests: 'typescript',
      documentation: 'openapi'
    },
    workflow: {
      nodes: [
        {
          id: 'endpoint-planning',
          type: 'api-planner',
          config: {
            restConventions: true,
            authStrategy: 'jwt',
            validationStrategy: 'zod'
          }
        },
        {
          id: 'code-generation',
          type: 'api-generator',
          config: {
            framework: 'supabase-edge-functions',
            language: 'typescript',
            patterns: ['repository', 'service']
          }
        },
        {
          id: 'auth-integration',
          type: 'auth-integrator',
          config: {
            provider: 'supabase-auth',
            rbac: true,
            rls: true
          }
        },
        {
          id: 'test-generation',
          type: 'test-generator',
          config: {
            framework: 'jest',
            coverage: ['unit', 'integration'],
            mocking: true
          }
        },
        {
          id: 'documentation',
          type: 'doc-generator',
          config: {
            format: 'openapi',
            examples: true,
            errorCodes: true
          }
        }
      ]
    }
  },
  {
    id: 'api-performance-optimization',
    name: 'API Performance Optimization',
    description: 'Optimizes API endpoints for performance and scalability',
    category: 'optimization',
    agents: ['api', 'devops'],
    complexity: 'medium',
    estimatedTime: '15-20 minutes',
    inputs: {
      apiCode: 'string',
      performanceMetrics: 'object',
      scalingRequirements: 'object'
    },
    outputs: {
      optimizedCode: 'typescript',
      cachingStrategy: 'object',
      monitoringSetup: 'typescript'
    },
    workflow: {
      nodes: [
        {
          id: 'performance-analysis',
          type: 'performance-analyzer',
          config: {
            metrics: ['response-time', 'throughput', 'memory-usage'],
            profiling: true
          }
        },
        {
          id: 'optimization',
          type: 'code-optimizer',
          config: {
            strategies: ['caching', 'query-optimization', 'async-processing'],
            framework: 'supabase'
          }
        },
        {
          id: 'monitoring-setup',
          type: 'monitoring-generator',
          config: {
            metrics: ['custom-metrics', 'error-tracking', 'performance'],
            alerting: true
          }
        }
      ]
    }
  }
];

/**
 * Security Workflow Templates
 */
export const SECURITY_WORKFLOWS: LangflowWorkflowTemplate[] = [
  {
    id: 'security-audit-workflow',
    name: 'Comprehensive Security Audit',
    description: 'Performs complete security audit of code and generates fixes',
    category: 'debugging',
    agents: ['auth', 'testing'],
    complexity: 'complex',
    estimatedTime: '30-45 minutes',
    inputs: {
      codebase: 'object',
      complianceRequirements: 'string[]',
      threatModel: 'object'
    },
    outputs: {
      vulnerabilities: 'object[]',
      fixes: 'string[]',
      securityTests: 'typescript',
      complianceReport: 'object'
    },
    workflow: {
      nodes: [
        {
          id: 'static-analysis',
          type: 'security-scanner',
          config: {
            tools: ['eslint-security', 'semgrep', 'custom-rules'],
            owaspTop10: true
          }
        },
        {
          id: 'vulnerability-assessment',
          type: 'vulnerability-analyzer',
          config: {
            severity: ['critical', 'high', 'medium'],
            categories: ['injection', 'xss', 'csrf', 'auth']
          }
        },
        {
          id: 'fix-generation',
          type: 'security-fixer',
          config: {
            autoFix: ['low-risk'],
            manualReview: ['high-risk'],
            bestPractices: true
          }
        },
        {
          id: 'security-tests',
          type: 'security-test-generator',
          config: {
            framework: 'jest',
            testTypes: ['auth-bypass', 'injection', 'xss'],
            penetrationTests: true
          }
        }
      ]
    }
  },
  {
    id: 'auth-system-generator',
    name: 'Authentication System Generator',
    description: 'Generates complete authentication system with best practices',
    category: 'development',
    agents: ['auth', 'api', 'database'],
    complexity: 'complex',
    estimatedTime: '25-35 minutes',
    inputs: {
      authStrategy: 'string',
      userRoles: 'string[]',
      features: 'string[]'
    },
    outputs: {
      authMiddleware: 'typescript',
      userManagement: 'typescript',
      rlsPolicies: 'sql',
      authTests: 'typescript'
    },
    workflow: {
      nodes: [
        {
          id: 'auth-planning',
          type: 'auth-planner',
          config: {
            provider: 'supabase-auth',
            features: ['mfa', 'social-login', 'rbac'],
            security: 'enterprise'
          }
        },
        {
          id: 'middleware-generation',
          type: 'middleware-generator',
          config: {
            framework: 'supabase-edge-functions',
            validation: 'jwt',
            rateLimit: true
          }
        },
        {
          id: 'rls-generation',
          type: 'rls-generator',
          config: {
            database: 'postgresql',
            granular: true,
            audit: true
          }
        },
        {
          id: 'test-generation',
          type: 'auth-test-generator',
          config: {
            scenarios: ['login', 'logout', 'token-refresh', 'unauthorized'],
            security: ['brute-force', 'token-manipulation']
          }
        }
      ]
    }
  }
];

/**
 * Testing Workflow Templates
 */
export const TESTING_WORKFLOWS: LangflowWorkflowTemplate[] = [
  {
    id: 'comprehensive-test-suite',
    name: 'Comprehensive Test Suite Generator',
    description: 'Generates complete test suite with unit, integration, and E2E tests',
    category: 'testing',
    agents: ['testing', 'api', 'database'],
    complexity: 'complex',
    estimatedTime: '35-50 minutes',
    inputs: {
      codebase: 'object',
      requirements: 'object',
      testStrategy: 'object'
    },
    outputs: {
      unitTests: 'typescript',
      integrationTests: 'typescript',
      e2eTests: 'typescript',
      testConfig: 'object',
      coverage: 'object'
    },
    workflow: {
      nodes: [
        {
          id: 'test-planning',
          type: 'test-planner',
          config: {
            coverage: 90,
            frameworks: ['jest', 'playwright'],
            strategies: ['tdd', 'bdd']
          }
        },
        {
          id: 'unit-test-generation',
          type: 'unit-test-generator',
          config: {
            framework: 'jest',
            mocking: 'comprehensive',
            edgeCases: true
          }
        },
        {
          id: 'integration-test-generation',
          type: 'integration-test-generator',
          config: {
            database: true,
            apis: true,
            realServices: false
          }
        },
        {
          id: 'e2e-test-generation',
          type: 'e2e-test-generator',
          config: {
            framework: 'playwright',
            userJourneys: true,
            crossBrowser: true
          }
        },
        {
          id: 'test-optimization',
          type: 'test-optimizer',
          config: {
            parallel: true,
            performance: true,
            reliability: true
          }
        }
      ]
    }
  },
  {
    id: 'performance-test-suite',
    name: 'Performance Test Suite Generator',
    description: 'Generates performance and load tests for APIs and workflows',
    category: 'testing',
    agents: ['testing', 'devops'],
    complexity: 'medium',
    estimatedTime: '20-30 minutes',
    inputs: {
      endpoints: 'string[]',
      performanceTargets: 'object',
      loadScenarios: 'object'
    },
    outputs: {
      loadTests: 'typescript',
      stressTests: 'typescript',
      performanceMetrics: 'object',
      monitoring: 'typescript'
    },
    workflow: {
      nodes: [
        {
          id: 'performance-planning',
          type: 'performance-planner',
          config: {
            tools: ['k6', 'artillery'],
            scenarios: ['load', 'stress', 'spike'],
            metrics: ['response-time', 'throughput', 'errors']
          }
        },
        {
          id: 'load-test-generation',
          type: 'load-test-generator',
          config: {
            tool: 'k6',
            rampUp: true,
            realistic: true
          }
        },
        {
          id: 'monitoring-integration',
          type: 'monitoring-integrator',
          config: {
            realTime: true,
            alerting: true,
            dashboards: true
          }
        }
      ]
    }
  }
];

/**
 * n8n Workflow Templates
 */
export const N8N_WORKFLOWS: LangflowWorkflowTemplate[] = [
  {
    id: 'nl-to-n8n-workflow',
    name: 'Natural Language to n8n Workflow',
    description: 'Converts natural language descriptions to complete n8n workflows',
    category: 'development',
    agents: ['n8n', 'ai'],
    complexity: 'complex',
    estimatedTime: '15-25 minutes',
    inputs: {
      description: 'string',
      requirements: 'object',
      constraints: 'object'
    },
    outputs: {
      workflow: 'object',
      nodes: 'object[]',
      connections: 'object[]',
      documentation: 'markdown'
    },
    workflow: {
      nodes: [
        {
          id: 'nl-analysis',
          type: 'nl-analyzer',
          config: {
            model: 'gpt-4',
            entityExtraction: true,
            intentClassification: true
          }
        },
        {
          id: 'workflow-planning',
          type: 'workflow-planner',
          config: {
            platform: 'n8n',
            optimization: 'performance',
            errorHandling: true
          }
        },
        {
          id: 'node-generation',
          type: 'n8n-node-generator',
          config: {
            nodeLibrary: 'latest',
            bestPractices: true,
            validation: true
          }
        },
        {
          id: 'workflow-optimization',
          type: 'workflow-optimizer',
          config: {
            performance: true,
            reliability: true,
            maintainability: true
          }
        }
      ]
    }
  },
  {
    id: 'n8n-workflow-testing',
    name: 'n8n Workflow Testing Suite',
    description: 'Generates comprehensive tests for n8n workflows',
    category: 'testing',
    agents: ['n8n', 'testing'],
    complexity: 'medium',
    estimatedTime: '15-20 minutes',
    inputs: {
      workflow: 'object',
      testScenarios: 'object[]',
      dataFixtures: 'object'
    },
    outputs: {
      testWorkflows: 'object[]',
      validationRules: 'object[]',
      mockData: 'object',
      testReports: 'object'
    },
    workflow: {
      nodes: [
        {
          id: 'test-planning',
          type: 'n8n-test-planner',
          config: {
            coverage: 'comprehensive',
            scenarios: ['happy-path', 'error-cases', 'edge-cases'],
            dataValidation: true
          }
        },
        {
          id: 'test-workflow-generation',
          type: 'n8n-test-generator',
          config: {
            framework: 'n8n-testing',
            mocking: true,
            assertions: 'comprehensive'
          }
        },
        {
          id: 'validation-generation',
          type: 'validation-generator',
          config: {
            rules: 'custom',
            schemas: 'json-schema',
            errorHandling: true
          }
        }
      ]
    }
  }
];

/**
 * Complete workflow template library
 */
export const LANGFLOW_WORKFLOW_TEMPLATES = {
  database: DATABASE_WORKFLOWS,
  api: API_WORKFLOWS,
  security: SECURITY_WORKFLOWS,
  testing: TESTING_WORKFLOWS,
  n8n: N8N_WORKFLOWS
};

/**
 * Get all workflow templates
 */
export function getAllWorkflowTemplates(): LangflowWorkflowTemplate[] {
  return Object.values(LANGFLOW_WORKFLOW_TEMPLATES).flat();
}

/**
 * Get workflow templates by category
 */
export function getWorkflowTemplatesByCategory(
  category: 'development' | 'testing' | 'optimization' | 'debugging' | 'documentation'
): LangflowWorkflowTemplate[] {
  return getAllWorkflowTemplates().filter(template => template.category === category);
}

/**
 * Get workflow templates by agent
 */
export function getWorkflowTemplatesByAgent(agentType: string): LangflowWorkflowTemplate[] {
  return getAllWorkflowTemplates().filter(template => 
    template.agents.includes(agentType.toLowerCase())
  );
}

/**
 * Get workflow template by ID
 */
export function getWorkflowTemplateById(id: string): LangflowWorkflowTemplate | undefined {
  return getAllWorkflowTemplates().find(template => template.id === id);
}

/**
 * Search workflow templates
 */
export function searchWorkflowTemplates(query: string): LangflowWorkflowTemplate[] {
  const searchTerm = query.toLowerCase();
  return getAllWorkflowTemplates().filter(template =>
    template.name.toLowerCase().includes(searchTerm) ||
    template.description.toLowerCase().includes(searchTerm) ||
    template.agents.some(agent => agent.toLowerCase().includes(searchTerm))
  );
}