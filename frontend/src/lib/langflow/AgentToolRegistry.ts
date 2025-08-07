/**
 * Agent Tool Registry
 * Converts Clixen backend agents into Langflow-compatible tools
 */

import { 
  AgentToolDefinition, 
  AgentToolInput, 
  AgentToolOutput,
  LangflowNode,
  LangflowTemplate
} from './types';

// Import existing agents
import {
  DatabaseArchitectAgent,
  APIServerAgent,
  AuthenticationAgent,
  N8NIntegrationAgent,
  AIProcessingAgent,
  TestingAgent,
  DevOpsAgent
} from '../../backend/agents';

export class AgentToolRegistry {
  private static instance: AgentToolRegistry;
  private toolDefinitions: Map<string, AgentToolDefinition> = new Map();
  private agentInstances: Map<string, any> = new Map();

  private constructor() {
    this.initializeAgentTools();
  }

  public static getInstance(): AgentToolRegistry {
    if (!AgentToolRegistry.instance) {
      AgentToolRegistry.instance = new AgentToolRegistry();
    }
    return AgentToolRegistry.instance;
  }

  private initializeAgentTools(): void {
    // Database Agent Tools
    this.registerDatabaseAgentTools();
    
    // API Agent Tools
    this.registerAPIAgentTools();
    
    // Authentication Agent Tools
    this.registerAuthAgentTools();
    
    // n8n Integration Agent Tools
    this.registerN8NAgentTools();
    
    // AI Processing Agent Tools
    this.registerAIAgentTools();
    
    // Testing Agent Tools
    this.registerTestingAgentTools();
    
    // DevOps Agent Tools
    this.registerDevOpsAgentTools();

    console.log(`✅ AgentToolRegistry initialized with ${this.toolDefinitions.size} tools`);
  }

  private registerDatabaseAgentTools(): void {
    const dbAgent = new DatabaseArchitectAgent();
    this.agentInstances.set('database', dbAgent);

    // Database Schema Design Tool
    this.registerTool({
      id: 'database-schema-design',
      name: 'database_schema_design',
      displayName: 'Database Schema Design',
      description: 'Design and create database schemas with proper relationships, indexes, and constraints',
      category: 'database',
      icon: '🗄️',
      color: '#10B981',
      capabilities: ['schema_design', 'relationship_mapping', 'constraint_validation'],
      requirements: ['supabase_connection'],
      complexity: 'high',
      estimatedExecutionTime: 120,
      langflowNodeType: 'DatabaseSchemaDesign',
      inputs: [
        {
          name: 'requirements',
          type: 'string',
          required: true,
          description: 'Database requirements in natural language',
          placeholder: 'I need a user management system with profiles and authentication'
        },
        {
          name: 'existing_schema',
          type: 'object',
          required: false,
          description: 'Existing database schema to extend or modify'
        }
      ],
      outputs: [
        {
          name: 'schema',
          type: 'object',
          description: 'Generated database schema with tables, columns, and relationships'
        },
        {
          name: 'migration_sql',
          type: 'string',
          description: 'SQL migration script to create the schema'
        }
      ]
    });

    // Database Migration Tool
    this.registerTool({
      id: 'database-migration',
      name: 'database_migration',
      displayName: 'Database Migration',
      description: 'Execute database migrations safely with rollback capabilities',
      category: 'database',
      icon: '⚡',
      color: '#10B981',
      capabilities: ['migration_execution', 'rollback_support', 'validation'],
      requirements: ['database_connection', 'migration_script'],
      complexity: 'medium',
      estimatedExecutionTime: 60,
      langflowNodeType: 'DatabaseMigration',
      inputs: [
        {
          name: 'migration_script',
          type: 'string',
          required: true,
          description: 'SQL migration script to execute'
        },
        {
          name: 'rollback_script',
          type: 'string',
          required: false,
          description: 'SQL rollback script for safe reversal'
        }
      ],
      outputs: [
        {
          name: 'success',
          type: 'boolean',
          description: 'Whether migration executed successfully'
        },
        {
          name: 'result',
          type: 'object',
          description: 'Migration execution results and metadata'
        }
      ]
    });
  }

  private registerAPIAgentTools(): void {
    const apiAgent = new APIServerAgent();
    this.agentInstances.set('api', apiAgent);

    // API Endpoint Generator
    this.registerTool({
      id: 'api-endpoint-generator',
      name: 'api_endpoint_generator',
      displayName: 'API Endpoint Generator',
      description: 'Generate REST API endpoints with proper validation, error handling, and documentation',
      category: 'api',
      icon: '🌐',
      color: '#3B82F6',
      capabilities: ['endpoint_generation', 'validation', 'documentation'],
      requirements: ['api_specification'],
      complexity: 'medium',
      estimatedExecutionTime: 90,
      langflowNodeType: 'APIEndpointGenerator',
      inputs: [
        {
          name: 'specification',
          type: 'string',
          required: true,
          description: 'API endpoint specification in natural language',
          placeholder: 'Create a user profile API with CRUD operations'
        },
        {
          name: 'authentication_type',
          type: 'string',
          required: false,
          description: 'Authentication method (jwt, oauth, api_key, none)',
          defaultValue: 'jwt'
        }
      ],
      outputs: [
        {
          name: 'endpoints',
          type: 'array',
          description: 'Generated API endpoint definitions'
        },
        {
          name: 'openapi_spec',
          type: 'object',
          description: 'OpenAPI specification for the generated endpoints'
        }
      ]
    });

    // API Integration Tool
    this.registerTool({
      id: 'api-integration',
      name: 'api_integration',
      displayName: 'API Integration',
      description: 'Integrate with external APIs with proper error handling and rate limiting',
      category: 'api',
      icon: '🔗',
      color: '#3B82F6',
      capabilities: ['external_integration', 'rate_limiting', 'error_handling'],
      requirements: ['api_credentials'],
      complexity: 'medium',
      estimatedExecutionTime: 45,
      langflowNodeType: 'APIIntegration',
      inputs: [
        {
          name: 'api_url',
          type: 'string',
          required: true,
          description: 'External API endpoint URL'
        },
        {
          name: 'method',
          type: 'string',
          required: true,
          description: 'HTTP method (GET, POST, PUT, DELETE)',
          defaultValue: 'GET'
        },
        {
          name: 'headers',
          type: 'object',
          required: false,
          description: 'Request headers including authentication'
        },
        {
          name: 'payload',
          type: 'object',
          required: false,
          description: 'Request payload for POST/PUT operations'
        }
      ],
      outputs: [
        {
          name: 'response',
          type: 'object',
          description: 'API response data'
        },
        {
          name: 'status_code',
          type: 'number',
          description: 'HTTP response status code'
        }
      ]
    });
  }

  private registerAuthAgentTools(): void {
    const authAgent = new AuthenticationAgent();
    this.agentInstances.set('auth', authAgent);

    // Authentication Setup Tool
    this.registerTool({
      id: 'auth-setup',
      name: 'auth_setup',
      displayName: 'Authentication Setup',
      description: 'Set up comprehensive authentication system with multiple providers',
      category: 'auth',
      icon: '🔐',
      color: '#8B5CF6',
      capabilities: ['multi_provider', 'session_management', 'security_policies'],
      requirements: ['auth_provider_config'],
      complexity: 'high',
      estimatedExecutionTime: 150,
      langflowNodeType: 'AuthSetup',
      inputs: [
        {
          name: 'providers',
          type: 'array',
          required: true,
          description: 'Authentication providers to enable (email, google, github, etc.)'
        },
        {
          name: 'security_policies',
          type: 'object',
          required: false,
          description: 'Security policies like password requirements, MFA, etc.'
        }
      ],
      outputs: [
        {
          name: 'auth_config',
          type: 'object',
          description: 'Authentication configuration and setup details'
        },
        {
          name: 'integration_code',
          type: 'string',
          description: 'Code snippets for frontend integration'
        }
      ]
    });
  }

  private registerN8NAgentTools(): void {
    const n8nAgent = new N8NIntegrationAgent();
    this.agentInstances.set('n8n', n8nAgent);

    // Workflow Deployment Tool
    this.registerTool({
      id: 'n8n-workflow-deploy',
      name: 'n8n_workflow_deploy',
      displayName: 'n8n Workflow Deployment',
      description: 'Deploy and manage n8n workflows with proper error handling and monitoring',
      category: 'n8n',
      icon: '⚙️',
      color: '#FF6B6B',
      capabilities: ['workflow_deployment', 'health_monitoring', 'rollback'],
      requirements: ['n8n_api_access', 'workflow_definition'],
      complexity: 'medium',
      estimatedExecutionTime: 75,
      langflowNodeType: 'N8NWorkflowDeploy',
      inputs: [
        {
          name: 'workflow_json',
          type: 'object',
          required: true,
          description: 'n8n workflow definition in JSON format'
        },
        {
          name: 'workflow_name',
          type: 'string',
          required: true,
          description: 'Name for the workflow'
        },
        {
          name: 'active',
          type: 'boolean',
          required: false,
          description: 'Whether to activate the workflow immediately',
          defaultValue: true
        }
      ],
      outputs: [
        {
          name: 'workflow_id',
          type: 'string',
          description: 'ID of the deployed workflow'
        },
        {
          name: 'status',
          type: 'string',
          description: 'Deployment status'
        }
      ]
    });
  }

  private registerAIAgentTools(): void {
    const aiAgent = new AIProcessingAgent();
    this.agentInstances.set('ai', aiAgent);

    // AI Model Selection Tool
    this.registerTool({
      id: 'ai-model-selection',
      name: 'ai_model_selection',
      displayName: 'AI Model Selection',
      description: 'Intelligently select the best AI model based on task complexity and requirements',
      category: 'ai',
      icon: '🤖',
      color: '#F59E0B',
      capabilities: ['model_selection', 'cost_optimization', 'performance_analysis'],
      requirements: ['task_specification'],
      complexity: 'low',
      estimatedExecutionTime: 30,
      langflowNodeType: 'AIModelSelection',
      inputs: [
        {
          name: 'task_description',
          type: 'string',
          required: true,
          description: 'Description of the AI task to be performed'
        },
        {
          name: 'complexity_level',
          type: 'string',
          required: false,
          description: 'Expected task complexity (low, medium, high)',
          defaultValue: 'medium'
        }
      ],
      outputs: [
        {
          name: 'recommended_model',
          type: 'string',
          description: 'Recommended AI model for the task'
        },
        {
          name: 'reasoning',
          type: 'string',
          description: 'Explanation for the model selection'
        }
      ]
    });
  }

  private registerTestingAgentTools(): void {
    const testingAgent = new TestingAgent();
    this.agentInstances.set('testing', testingAgent);

    // Automated Testing Tool
    this.registerTool({
      id: 'automated-testing',
      name: 'automated_testing',
      displayName: 'Automated Testing',
      description: 'Generate and execute comprehensive test suites for workflows and APIs',
      category: 'testing',
      icon: '🧪',
      color: '#06B6D4',
      capabilities: ['test_generation', 'execution', 'reporting'],
      requirements: ['test_targets'],
      complexity: 'medium',
      estimatedExecutionTime: 120,
      langflowNodeType: 'AutomatedTesting',
      inputs: [
        {
          name: 'test_targets',
          type: 'array',
          required: true,
          description: 'Components or endpoints to test'
        },
        {
          name: 'test_types',
          type: 'array',
          required: false,
          description: 'Types of tests to generate (unit, integration, e2e)',
          defaultValue: ['unit', 'integration']
        }
      ],
      outputs: [
        {
          name: 'test_results',
          type: 'object',
          description: 'Comprehensive test execution results'
        },
        {
          name: 'coverage_report',
          type: 'object',
          description: 'Code coverage analysis'
        }
      ]
    });
  }

  private registerDevOpsAgentTools(): void {
    const devopsAgent = new DevOpsAgent();
    this.agentInstances.set('devops', devopsAgent);

    // Deployment Pipeline Tool
    this.registerTool({
      id: 'deployment-pipeline',
      name: 'deployment_pipeline',
      displayName: 'Deployment Pipeline',
      description: 'Set up and manage CI/CD pipelines with proper security and monitoring',
      category: 'devops',
      icon: '🚀',
      color: '#DC2626',
      capabilities: ['pipeline_setup', 'security_scanning', 'monitoring'],
      requirements: ['deployment_config'],
      complexity: 'high',
      estimatedExecutionTime: 180,
      langflowNodeType: 'DeploymentPipeline',
      inputs: [
        {
          name: 'deployment_config',
          type: 'object',
          required: true,
          description: 'Deployment configuration including target environments'
        },
        {
          name: 'security_requirements',
          type: 'object',
          required: false,
          description: 'Security scanning and compliance requirements'
        }
      ],
      outputs: [
        {
          name: 'pipeline_id',
          type: 'string',
          description: 'ID of the created deployment pipeline'
        },
        {
          name: 'status',
          type: 'string',
          description: 'Pipeline setup status'
        }
      ]
    });
  }

  private registerTool(definition: AgentToolDefinition): void {
    this.toolDefinitions.set(definition.id, definition);
  }

  // Public API Methods
  public getAllTools(): AgentToolDefinition[] {
    return Array.from(this.toolDefinitions.values());
  }

  public getToolsByCategory(category: AgentToolDefinition['category']): AgentToolDefinition[] {
    return this.getAllTools().filter(tool => tool.category === category);
  }

  public getTool(id: string): AgentToolDefinition | undefined {
    return this.toolDefinitions.get(id);
  }

  public getAgentInstance(category: string): any {
    return this.agentInstances.get(category);
  }

  public convertToLangflowNode(toolId: string, position: { x: number; y: number }): LangflowNode | null {
    const tool = this.getTool(toolId);
    if (!tool) return null;

    const template: Record<string, LangflowTemplate> = {};
    
    // Convert inputs to Langflow template format
    tool.inputs.forEach(input => {
      template[input.name] = {
        type: input.type,
        required: input.required,
        placeholder: input.placeholder,
        show: true,
        value: input.defaultValue,
        display_name: input.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        advanced: false,
        dynamic: false,
        info: input.description,
        multiline: input.type === 'string' && input.name.includes('description')
      };
    });

    return {
      id: `${toolId}_${Date.now()}`,
      type: tool.langflowNodeType,
      position,
      data: {
        type: tool.langflowNodeType,
        node: {
          base_classes: [tool.category, 'AgentTool'],
          description: tool.description,
          display_name: tool.displayName,
          documentation: `${tool.description}\n\nCapabilities: ${tool.capabilities.join(', ')}\nComplexity: ${tool.complexity}\nEstimated execution time: ${tool.estimatedExecutionTime}s`,
          custom_fields: {
            category: tool.category,
            icon: tool.icon,
            color: tool.color,
            requirements: tool.requirements,
            capabilities: tool.capabilities
          },
          template
        }
      }
    };
  }

  public searchTools(query: string): AgentToolDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTools().filter(tool => 
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.displayName.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.capabilities.some(cap => cap.toLowerCase().includes(lowerQuery))
    );
  }

  public getToolStats(): {
    totalTools: number;
    categoryCounts: Record<string, number>;
    complexityDistribution: Record<string, number>;
    avgExecutionTime: number;
  } {
    const tools = this.getAllTools();
    const categoryCounts: Record<string, number> = {};
    const complexityDistribution: Record<string, number> = {};
    let totalExecutionTime = 0;

    tools.forEach(tool => {
      categoryCounts[tool.category] = (categoryCounts[tool.category] || 0) + 1;
      complexityDistribution[tool.complexity] = (complexityDistribution[tool.complexity] || 0) + 1;
      totalExecutionTime += tool.estimatedExecutionTime;
    });

    return {
      totalTools: tools.length,
      categoryCounts,
      complexityDistribution,
      avgExecutionTime: tools.length > 0 ? totalExecutionTime / tools.length : 0
    };
  }
}

// Export singleton instance
export const agentToolRegistry = AgentToolRegistry.getInstance();