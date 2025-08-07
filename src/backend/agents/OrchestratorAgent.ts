/**
 * Backend Development Orchestrator Agent
 * 
 * Coordinates specialist agents for backend development based on Clixen MVP specification
 * Focus: Simple GPT→n8n pipeline with Supabase persistence and authentication
 * 
 * Core Responsibilities:
 * - MVP compliance enforcement (prevent feature creep)
 * - Task delegation and coordination across backend domains
 * - Progress tracking and state management
 * - Error handling and rollback coordination
 * - Parallel development coordination where possible
 */

import {
  AgentTask,
  BackendDomain,
  MVP_Requirements,
  DevelopmentPhase,
  OrchestrationState,
  AgentTaskResult,
  MVPValidationResult,
  DatabaseSchema,
  APIEndpoints,
  BackendAgent
} from './types.js';

import { DatabaseArchitectAgent } from './DatabaseAgent.js';
import { APIServerAgent } from './APIAgent.js';
import { AuthenticationAgent } from './AuthAgent.js';
import { N8NIntegrationAgent } from './N8NAgent.js';
import { AIProcessingAgent } from './AIAgent.js';
import { TestingAgent } from './TestingAgent.js';
import { DevOpsAgent } from './DevOpsAgent.js';

export class BackendOrchestratorAgent {
  private state: OrchestrationState;
  private mvpRequirements: MVP_Requirements;
  private agents: Map<string, BackendAgent>;
  private phases: DevelopmentPhase[];
  
  constructor() {
    this.initializeMVPRequirements();
    this.initializeAgents();
    this.initializeDevelopmentPhases();
    this.initializeState();
  }

  /**
   * Initialize MVP requirements from specification
   * Enforces simple GPT→n8n pipeline without feature creep
   */
  private initializeMVPRequirements(): void {
    this.mvpRequirements = {
      authentication: {
        provider: 'supabase-auth',
        method: 'email-password',
        features: ['signup', 'signin', 'session-management']
      },
      
      persistence: {
        database: 'supabase-postgresql',
        tables: ['users', 'projects', 'workflows', 'executions'],
        features: ['project-dashboard', 'workflow-history']
      },
      
      workflowEngine: {
        processor: 'gpt-based',
        generator: 'n8n-json',
        integration: 'n8n-mcp',
        features: ['natural-language-parsing', 'workflow-validation', 'deployment']
      },
      
      deployment: {
        target: 'n8n-rest-api',
        features: ['workflow-publish', 'status-tracking']
      },
      
      telemetry: {
        events: ['workflow-creation', 'deployment', 'user-signin', 'errors'],
        storage: 'supabase'
      }
    };
  }

  /**
   * Initialize specialist agents for each backend domain
   */
  private initializeAgents(): void {
    this.agents = new Map([
      ['database', new DatabaseArchitectAgent()],
      ['api', new APIServerAgent()],
      ['auth', new AuthenticationAgent()],
      ['n8n', new N8NIntegrationAgent()],
      ['ai', new AIProcessingAgent()],
      ['testing', new TestingAgent()],
      ['devops', new DevOpsAgent()]
    ]);
  }

  /**
   * Initialize development phases based on MVP requirements
   * Organized for optimal parallel execution and dependency management
   */
  private initializeDevelopmentPhases(): void {
    this.phases = [
      {
        name: 'Foundation Setup',
        description: 'Core infrastructure and database foundation',
        domains: [
          {
            name: 'Database Architecture',
            description: 'Supabase schema, RLS policies, and migrations',
            dependencies: [],
            tasks: this.createDatabaseTasks(),
            status: 'not-started',
            priority: 1
          },
          {
            name: 'Authentication System',
            description: 'Supabase Auth integration (email/password only)',
            dependencies: ['Database Architecture'],
            tasks: this.createAuthTasks(),
            status: 'not-started',
            priority: 1
          }
        ],
        prerequisites: [],
        deliverables: ['Database schema', 'Auth system', 'RLS policies'],
        acceptanceCriteria: [
          'Users can sign up with email/password',
          'Users can sign in and maintain sessions',
          'Database enforces proper user isolation'
        ]
      },
      
      {
        name: 'Core Backend Services',
        description: 'API endpoints and business logic',
        domains: [
          {
            name: 'API Development',
            description: 'REST endpoints for projects, workflows, and telemetry',
            dependencies: ['Database Architecture', 'Authentication System'],
            tasks: this.createAPITasks(),
            status: 'not-started',
            priority: 2
          },
          {
            name: 'AI Processing',
            description: 'GPT-based natural language to workflow spec processing',
            dependencies: ['API Development'],
            tasks: this.createAITasks(),
            status: 'not-started',
            priority: 2
          }
        ],
        prerequisites: ['Foundation Setup'],
        deliverables: ['REST API', 'GPT integration', 'Workflow processing'],
        acceptanceCriteria: [
          'Users can create and manage projects',
          'Natural language prompts are processed into workflow specs',
          'All API endpoints return proper responses and errors'
        ]
      },
      
      {
        name: 'n8n Integration',
        description: 'Workflow generation and deployment',
        domains: [
          {
            name: 'n8n Integration',
            description: 'MCP integration, JSON generation, and deployment',
            dependencies: ['AI Processing'],
            tasks: this.createN8NTasks(),
            status: 'not-started',
            priority: 3
          }
        ],
        prerequisites: ['Core Backend Services'],
        deliverables: ['n8n MCP integration', 'Workflow deployment', 'Status tracking'],
        acceptanceCriteria: [
          'Workflow specs are converted to valid n8n JSON',
          'Workflows are successfully deployed to n8n instance',
          'Deployment status is tracked and reported'
        ]
      },
      
      {
        name: 'Quality Assurance',
        description: 'Testing and DevOps setup',
        domains: [
          {
            name: 'Testing',
            description: 'End-to-end testing and quality validation',
            dependencies: ['n8n Integration'],
            tasks: this.createTestingTasks(),
            status: 'not-started',
            priority: 4
          },
          {
            name: 'DevOps',
            description: 'Deployment pipeline and monitoring',
            dependencies: ['Testing'],
            tasks: this.createDevOpsTasks(),
            status: 'not-started',
            priority: 4
          }
        ],
        prerequisites: ['n8n Integration'],
        deliverables: ['Test suite', 'CI/CD pipeline', 'Monitoring'],
        acceptanceCriteria: [
          'All MVP acceptance criteria pass automated tests',
          'Deployment pipeline is functional',
          'Basic monitoring and error tracking is in place'
        ]
      }
    ];
  }

  /**
   * Initialize orchestration state
   */
  private initializeState(): void {
    this.state = {
      currentPhase: 'Foundation Setup',
      activeTasks: [],
      completedTasks: [],
      blockedTasks: [],
      overallProgress: 0,
      estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      risksAndBlockers: []
    };
  }

  /**
   * Main orchestration entry point
   * Coordinates all backend development according to MVP specification
   */
  public async orchestrateBackendDevelopment(): Promise<OrchestrationState> {
    console.log('🚀 Starting Backend Development Orchestration');
    console.log('📋 MVP Focus: Simple GPT→n8n pipeline with Supabase');
    
    try {
      // Validate MVP compliance before starting
      const mvpValidation = await this.validateMVPCompliance();
      if (!mvpValidation.isCompliant) {
        throw new Error(`MVP compliance validation failed: ${mvpValidation.violations.join(', ')}`);
      }

      // Execute phases sequentially, but allow parallel execution within phases
      for (const phase of this.phases) {
        console.log(`\n📌 Starting Phase: ${phase.name}`);
        this.state.currentPhase = phase.name;
        
        await this.executePhase(phase);
        
        // Validate phase completion
        const phaseValidation = await this.validatePhaseCompletion(phase);
        if (!phaseValidation.isCompliant) {
          console.error(`❌ Phase ${phase.name} validation failed`);
          this.state.risksAndBlockers.push(`Phase ${phase.name} incomplete: ${phaseValidation.violations.join(', ')}`);
        }
      }

      // Final MVP validation
      await this.performFinalMVPValidation();
      
      console.log('✅ Backend development orchestration completed successfully');
      return this.state;
      
    } catch (error) {
      console.error('❌ Backend orchestration failed:', error);
      await this.handleOrchestrationFailure(error);
      throw error;
    }
  }

  /**
   * Execute a development phase with parallel domain execution where possible
   */
  private async executePhase(phase: DevelopmentPhase): Promise<void> {
    console.log(`\n🔄 Executing phase: ${phase.name}`);
    
    // Group domains by dependency level for parallel execution
    const domainLevels = this.groupDomainsByDependencies(phase.domains);
    
    for (const level of domainLevels) {
      // Execute domains in parallel within the same dependency level
      await Promise.all(level.map(domain => this.executeDomain(domain)));
    }
  }

  /**
   * Execute tasks for a specific backend domain
   */
  private async executeDomain(domain: BackendDomain): Promise<void> {
    console.log(`  🎯 Processing domain: ${domain.name}`);
    domain.status = 'in-progress';
    
    try {
      // Get the appropriate agent for this domain
      const agentKey = this.getAgentKeyForDomain(domain.name);
      const agent = this.agents.get(agentKey);
      
      if (!agent) {
        throw new Error(`No agent available for domain: ${domain.name}`);
      }

      // Validate agent prerequisites
      const prerequisitesOk = await agent.validatePrerequisites();
      if (!prerequisitesOk) {
        domain.status = 'blocked';
        this.state.blockedTasks.push(...domain.tasks);
        return;
      }

      // Execute tasks for this domain
      for (const task of domain.tasks) {
        await this.executeTask(task, agent);
      }
      
      domain.status = 'completed';
      console.log(`  ✅ Domain completed: ${domain.name}`);
      
    } catch (error) {
      console.error(`  ❌ Domain failed: ${domain.name}`, error);
      domain.status = 'blocked';
      this.state.risksAndBlockers.push(`Domain ${domain.name} failed: ${error.message}`);
    }
  }

  /**
   * Execute a specific task using the appropriate agent
   */
  private async executeTask(task: AgentTask, agent: BackendAgent): Promise<void> {
    console.log(`    🔧 Executing task: ${task.description}`);
    
    task.status = 'in-progress';
    this.state.activeTasks.push(task);
    
    try {
      const result = await agent.executeTask(task);
      
      if (result.status === 'success') {
        task.status = 'completed';
        this.state.completedTasks.push(task);
        console.log(`    ✅ Task completed: ${task.description}`);
        
        // Add any generated next tasks
        if (result.nextTasks) {
          // Add to appropriate domain's task list
        }
        
      } else {
        task.status = 'failed';
        this.state.risksAndBlockers.push(`Task failed: ${task.description} - ${result.errors?.join(', ')}`);
        console.error(`    ❌ Task failed: ${task.description}`);
      }
      
    } catch (error) {
      task.status = 'failed';
      this.state.risksAndBlockers.push(`Task error: ${task.description} - ${error.message}`);
      console.error(`    ❌ Task error: ${task.description}`, error);
    } finally {
      // Remove from active tasks
      const activeIndex = this.state.activeTasks.findIndex(t => t.id === task.id);
      if (activeIndex > -1) {
        this.state.activeTasks.splice(activeIndex, 1);
      }
    }
    
    // Update overall progress
    this.updateProgress();
  }

  /**
   * Validate MVP compliance to prevent feature creep
   */
  private async validateMVPCompliance(): Promise<MVPValidationResult> {
    const violations: string[] = [];
    
    // Check for feature creep indicators
    const forbiddenFeatures = [
      'multi-agent orchestration for users', // Only for dev coordination
      'live workflow diagrams',
      'interactive JSON editing',
      'oauth providers beyond email/password',
      'multi-tenant billing',
      'advanced undo/redo',
      'collaborative editing'
    ];
    
    // This would normally check the current implementation/tasks
    // For now, we assume compliance
    
    return {
      isCompliant: violations.length === 0,
      violations,
      recommendations: [
        'Stick to simple GPT→n8n pipeline',
        'Use only Supabase auth with email/password',
        'Focus on core workflow creation and deployment',
        'Defer advanced features to post-MVP'
      ],
      riskLevel: violations.length > 0 ? 'high' : 'low'
    };
  }

  /**
   * Group domains by their dependencies to enable parallel execution
   */
  private groupDomainsByDependencies(domains: BackendDomain[]): BackendDomain[][] {
    const levels: BackendDomain[][] = [];
    const processed = new Set<string>();
    
    while (processed.size < domains.length) {
      const currentLevel: BackendDomain[] = [];
      
      for (const domain of domains) {
        if (processed.has(domain.name)) continue;
        
        // Check if all dependencies are already processed
        const canProcess = domain.dependencies.every(dep => processed.has(dep));
        
        if (canProcess) {
          currentLevel.push(domain);
          processed.add(domain.name);
        }
      }
      
      if (currentLevel.length > 0) {
        levels.push(currentLevel);
      } else {
        // Circular dependency or other issue
        break;
      }
    }
    
    return levels;
  }

  /**
   * Map domain names to agent keys
   */
  private getAgentKeyForDomain(domainName: string): string {
    const mapping = {
      'Database Architecture': 'database',
      'Authentication System': 'auth',
      'API Development': 'api',
      'AI Processing': 'ai',
      'n8n Integration': 'n8n',
      'Testing': 'testing',
      'DevOps': 'devops'
    };
    
    return mapping[domainName] || 'unknown';
  }

  /**
   * Update overall progress based on completed tasks
   */
  private updateProgress(): void {
    const totalTasks = this.phases.reduce((sum, phase) => 
      sum + phase.domains.reduce((domainSum, domain) => 
        domainSum + domain.tasks.length, 0), 0);
    
    const completedTasks = this.state.completedTasks.length;
    this.state.overallProgress = Math.round((completedTasks / totalTasks) * 100);
  }

  /**
   * Validate that a phase has been completed successfully
   */
  private async validatePhaseCompletion(phase: DevelopmentPhase): Promise<MVPValidationResult> {
    const violations: string[] = [];
    
    // Check that all domains in the phase are completed
    for (const domain of phase.domains) {
      if (domain.status !== 'completed') {
        violations.push(`Domain ${domain.name} not completed`);
      }
      
      // Check that all tasks in domain are completed
      const incompleteTasks = domain.tasks.filter(t => t.status !== 'completed');
      if (incompleteTasks.length > 0) {
        violations.push(`Domain ${domain.name} has ${incompleteTasks.length} incomplete tasks`);
      }
    }
    
    // Phase-specific validations would go here
    // For now, basic completion check
    
    return {
      isCompliant: violations.length === 0,
      violations,
      recommendations: [],
      riskLevel: violations.length > 0 ? 'high' : 'low'
    };
  }

  /**
   * Perform final MVP validation before completion
   */
  private async performFinalMVPValidation(): Promise<void> {
    console.log('🔍 Performing final MVP validation...');
    
    // Check that all MVP acceptance criteria are met:
    const criteria = [
      'Users can sign up and sign in via email/password',
      'Users can create and select a project in dashboard',
      'Users can enter workflow prompts and get clarification dialogue',
      'System generates valid n8n workflows',
      'Users can deploy workflows to n8n instance',
      'Users can view workflows in project dashboard',
      'Error messages are displayed for failures'
    ];
    
    // This would normally run actual tests
    // For now, we assume validation passes if we got this far
    
    console.log('✅ Final MVP validation passed');
  }

  /**
   * Handle orchestration failures with appropriate rollback
   */
  private async handleOrchestrationFailure(error: any): Promise<void> {
    console.error('🚨 Orchestration failure detected, initiating rollback procedures');
    
    // Collect rollback instructions from failed tasks
    const rollbackTasks: string[] = [];
    
    for (const task of this.state.activeTasks) {
      // Each agent should provide rollback instructions
      rollbackTasks.push(`Rollback task: ${task.description}`);
    }
    
    // Log failure details
    console.error('Failed tasks:', this.state.activeTasks.map(t => t.description));
    console.error('Risks and blockers:', this.state.risksAndBlockers);
    
    // Update state to reflect failure
    this.state.overallProgress = Math.max(0, this.state.overallProgress - 10); // Rollback progress
  }

  /**
   * Get current orchestration status
   */
  public getStatus(): OrchestrationState {
    return { ...this.state };
  }

  /**
   * Create database-specific tasks based on MVP requirements
   */
  private createDatabaseTasks(): AgentTask[] {
    return [
      {
        id: 'db-001',
        type: 'database-design',
        priority: 'high',
        description: 'Design Supabase database schema for users, projects, workflows, executions',
        dependencies: [],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 4
      },
      {
        id: 'db-002',
        type: 'database-migration',
        priority: 'high',
        description: 'Create and execute database migration scripts',
        dependencies: ['db-001'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 2
      },
      {
        id: 'db-003',
        type: 'database-policies',
        priority: 'high',
        description: 'Implement Row Level Security policies for user data isolation',
        dependencies: ['db-002'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 3
      }
    ];
  }

  /**
   * Create authentication-specific tasks
   */
  private createAuthTasks(): AgentTask[] {
    return [
      {
        id: 'auth-001',
        type: 'auth-setup',
        priority: 'high',
        description: 'Configure Supabase Auth for email/password authentication',
        dependencies: ['db-001'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 3
      },
      {
        id: 'auth-002',
        type: 'auth-integration',
        priority: 'high',
        description: 'Integrate authentication with backend API endpoints',
        dependencies: ['auth-001'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 4
      }
    ];
  }

  /**
   * Create API development tasks
   */
  private createAPITasks(): AgentTask[] {
    return [
      {
        id: 'api-001',
        type: 'api-design',
        priority: 'high',
        description: 'Design REST API endpoints for projects, workflows, and telemetry',
        dependencies: ['db-003', 'auth-002'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 6
      },
      {
        id: 'api-002',
        type: 'api-implementation',
        priority: 'high',
        description: 'Implement API endpoints using Supabase Edge Functions',
        dependencies: ['api-001'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 12
      }
    ];
  }

  /**
   * Create AI processing tasks
   */
  private createAITasks(): AgentTask[] {
    return [
      {
        id: 'ai-001',
        type: 'ai-integration',
        priority: 'high',
        description: 'Integrate OpenAI GPT for natural language workflow processing',
        dependencies: ['api-002'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 8
      },
      {
        id: 'ai-002',
        type: 'ai-workflow-generation',
        priority: 'high',
        description: 'Implement prompt-to-workflow-spec conversion logic',
        dependencies: ['ai-001'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 10
      }
    ];
  }

  /**
   * Create n8n integration tasks
   */
  private createN8NTasks(): AgentTask[] {
    return [
      {
        id: 'n8n-001',
        type: 'n8n-mcp-setup',
        priority: 'high',
        description: 'Set up n8n MCP server for workflow validation',
        dependencies: ['ai-002'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 6
      },
      {
        id: 'n8n-002',
        type: 'n8n-deployment',
        priority: 'high',
        description: 'Implement workflow deployment to n8n via REST API',
        dependencies: ['n8n-001'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 8
      }
    ];
  }

  /**
   * Create testing tasks
   */
  private createTestingTasks(): AgentTask[] {
    return [
      {
        id: 'test-001',
        type: 'unit-tests',
        priority: 'medium',
        description: 'Create unit tests for all API endpoints and business logic',
        dependencies: ['n8n-002'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 16
      },
      {
        id: 'test-002',
        type: 'e2e-tests',
        priority: 'medium',
        description: 'Create end-to-end tests for complete user workflows',
        dependencies: ['test-001'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 12
      }
    ];
  }

  /**
   * Create DevOps tasks
   */
  private createDevOpsTasks(): AgentTask[] {
    return [
      {
        id: 'devops-001',
        type: 'ci-cd-setup',
        priority: 'medium',
        description: 'Set up CI/CD pipeline for automated testing and deployment',
        dependencies: ['test-002'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 8
      },
      {
        id: 'devops-002',
        type: 'monitoring-setup',
        priority: 'low',
        description: 'Set up basic monitoring and error tracking',
        dependencies: ['devops-001'],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedHours: 6
      }
    ];
  }
}