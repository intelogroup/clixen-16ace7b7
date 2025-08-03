// Lead orchestrator agent for conversation management and task delegation
import { BaseAgent } from './BaseAgent';
import { AgentConfig, AgentContext, WorkflowRequirement, WorkflowPhase, AgentMessage } from './types';
import { n8nValidator } from './N8nValidator';

export class OrchestratorAgent extends BaseAgent {
  private specialists: Map<string, BaseAgent> = new Map();
  private currentPhase: WorkflowPhase = 'understanding';
  private phaseStartTime: number = Date.now();
  private conversationMode: 'greeting' | 'scoping' | 'validating' | 'creating' = 'greeting';
  private scopingData: any = {
    trigger: null,
    dataSources: [],
    actions: [],
    conditions: [],
    output: null,
    frequency: null
  };
  private scopingQuestions = {
    trigger: [
      "What triggers this workflow? For example: a new form submission, a scheduled time, webhook, or manual trigger?",
      "When should this automation start?"
    ],
    dataSources: [
      "What data sources do you need to connect? (like Google Sheets, databases, APIs, email)",
      "Where is your data coming from?"
    ],
    actions: [
      "What actions should the workflow perform? (send emails, update databases, create files, etc.)",
      "What do you want to happen with the data?"
    ],
    conditions: [
      "Are there any conditions or filters? Should it only run for specific items?",
      "Do you need any if/then logic?"
    ],
    output: [
      "Where should the results go? (Email, Slack, database, file)",
      "How would you like the output formatted?"
    ],
    frequency: [
      "How often will this workflow run? (Every time triggered, daily, weekly)",
      "Any scheduling requirements?"
    ]
  };

  constructor(context: AgentContext) {
    const config: AgentConfig = {
      id: 'orchestrator',
      name: 'Lead Orchestrator',
      type: 'orchestrator',
      capabilities: [
        {
          name: 'conversation_management',
          description: 'Manage user conversations and understand requirements',
          inputs: ['user_message', 'conversation_history'],
          outputs: ['structured_requirements', 'next_actions'],
          dependencies: [],
          reliability: 0.95
        },
        {
          name: 'task_delegation',
          description: 'Delegate tasks to specialist agents',
          inputs: ['workflow_requirements', 'agent_capabilities'],
          outputs: ['task_assignments', 'execution_plan'],
          dependencies: ['specialist_agents'],
          reliability: 0.90
        },
        {
          name: 'quality_assurance',
          description: 'Validate outputs and ensure quality',
          inputs: ['agent_outputs', 'validation_criteria'],
          outputs: ['quality_assessment', 'improvement_suggestions'],
          dependencies: [],
          reliability: 0.88
        }
      ],
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 2000,
      systemPrompt: '',  // Will be set after super() call
      tools: ['conversation_analysis', 'requirement_extraction', 'task_planning', 'quality_assessment'],
      fallbackAgent: undefined
    };

    super(config, context);
    
    // Now set the system prompt after super() has been called
    this.config.systemPrompt = this.getSystemPrompt();
  }

  private getSystemPrompt(): string {
    return `You are a friendly and helpful workflow automation assistant for Clixen, an AI-powered n8n platform.

Your primary responsibilities:
1. GREET users naturally and understand what they want to automate
2. GUIDE them through scoping their workflow with friendly questions
3. VALIDATE feasibility before proceeding with creation
4. COORDINATE the workflow creation process from start to finish
5. ENSURE quality and validate all outputs before deployment
6. MAINTAIN a conversational, helpful tone throughout

Key principles:
- Always prioritize user experience and clarity
- Break down complex problems into manageable tasks
- Validate requirements before proceeding to implementation
- Coordinate parallel work when possible to maximize efficiency
- Provide regular progress updates and ask clarifying questions
- Ensure security, reliability, and best practices in all workflows

Available specialist agents:
- WorkflowDesigner: Creates n8n node structures and flow logic
- IntegrationSpecialist: Handles API connections and authentication
- TestingAgent: Validates workflows and ensures reliability
- DeploymentAgent: Deploys workflows to n8n and manages activation
- MonitorAgent: Tracks performance and health monitoring

Your responses should be:
- Natural and conversational
- Focused on automation and workflows only
- Progressive - don't overwhelm with all questions at once
- Clear about what's possible with n8n
- Encouraging and helpful

Remember: You're the primary interface between the user and the technical implementation.`;
  }

  async processTask(task: any): Promise<any> {
    const { action, input } = task;

    switch (action) {
      case 'greet_user':
        return await this.greetUser(input.isReturningUser);
      
      case 'analyze_user_message':
        return await this.analyzeUserMessage(input.message, input.conversationHistory);
      
      case 'handle_conversation':
        return await this.handleNaturalConversation(input.message, input.conversationHistory);
      
      case 'scope_workflow':
        return await this.scopeWorkflow(input.message);
      
      case 'create_workflow':
        return await this.createWorkflowFromScope();
      
      case 'extract_requirements':
        return await this.extractRequirements(input.userInput);
      
      case 'plan_workflow':
        return await this.planWorkflow(input.requirements);
      
      case 'delegate_tasks':
        return await this.delegateTasks(input.plan);
      
      case 'validate_output':
        return await this.validateOutput(input.agentOutput, input.criteria);
      
      case 'progress_update':
        return await this.provideProgressUpdate();
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  validateInput(input: any): boolean {
    if (!input || typeof input !== 'object') return false;
    return true;
  }

  getCapabilities(): string[] {
    return this.config.capabilities.map(cap => cap.name);
  }

  // Natural conversation methods
  async greetUser(isReturningUser: boolean = false): Promise<{
    message: string;
    suggestions: string[];
    mode: string;
  }> {
    const greetings = {
      new: [
        "Hi! I'm your workflow automation assistant. I can help you connect apps and automate repetitive tasks. What would you like to automate today?",
        "Hello! I'm here to help you create n8n workflows that save time. What process are you looking to automate?",
        "Hi there! I specialize in workflow automation. Tell me about a task you'd like to automate, and I'll help you build it!"
      ],
      returning: [
        "Welcome back! Ready to create another automation?",
        "Good to see you again! What would you like to automate today?",
        "Hello again! Let's build another workflow. What's on your automation wishlist?"
      ]
    };

    const suggestions = [
      "Send Slack notifications for new form submissions",
      "Sync Google Sheets with a database",
      "Process emails automatically",
      "Generate reports from multiple sources",
      "Update CRM when deals close",
      "Backup files to cloud storage"
    ];

    const greeting = isReturningUser 
      ? greetings.returning[Math.floor(Math.random() * greetings.returning.length)]
      : greetings.new[Math.floor(Math.random() * greetings.new.length)];

    this.conversationMode = 'greeting';
    
    return {
      message: greeting,
      suggestions: suggestions.slice(0, 4),
      mode: 'greeting'
    };
  }

  async handleNaturalConversation(message: string, conversationHistory: any[] = []): Promise<{
    response: string;
    questions: string[];
    mode: string;
    needsMoreInfo: boolean;
    canProceed: boolean;
  }> {
    // Handle different conversation modes
    if (this.conversationMode === 'greeting') {
      // Check if user is just greeting or actually describing a workflow
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon)/)) {
        return {
          response: "Hello! I'm here to help you automate workflows. What task would you like to automate? For example, you could automate sending emails, updating spreadsheets, or syncing data between apps.",
          questions: [],
          mode: 'greeting',
          needsMoreInfo: true,
          canProceed: false
        };
      } else {
        // User is describing a workflow, move to scoping
        this.conversationMode = 'scoping';
        return await this.scopeWorkflow(message);
      }
    }

    if (this.conversationMode === 'scoping') {
      return await this.scopeWorkflow(message);
    }

    // Default response for automation-focused conversation
    return {
      response: "I can help you with that automation. Let me understand your requirements better.",
      questions: this.getNextScopingQuestions(),
      mode: this.conversationMode,
      needsMoreInfo: true,
      canProceed: false
    };
  }

  async scopeWorkflow(message: string): Promise<{
    response: string;
    questions: string[];
    mode: string;
    needsMoreInfo: boolean;
    canProceed: boolean;
    scopeStatus?: any;
  }> {
    // Extract information from user message
    const extractedInfo = await this.extractScopeInfo(message);
    
    // Update scoping data
    Object.keys(extractedInfo).forEach(key => {
      if (extractedInfo[key]) {
        this.scopingData[key] = extractedInfo[key];
      }
    });

    // Check what information is still missing
    const missingInfo = this.getMissingScope();
    
    if (missingInfo.length === 0) {
      // We have all needed information - validate with n8n
      this.conversationMode = 'validating';
      
      // Perform feasibility check with n8n validator
      const validation = await n8nValidator.validateFeasibility(this.scopingData);
      
      if (validation.feasible) {
        // Store the suggested structure for later use
        this.setMemory('workflow_structure', validation.suggestedStructure);
        
        let response = "Excellent! I've validated your workflow with our n8n system. Everything looks good!\n\n";
        response += `📊 **Workflow Summary:**\n`;
        response += `• **Trigger**: ${this.scopingData.trigger}\n`;
        if (this.scopingData.dataSources?.length > 0) {
          response += `• **Data Sources**: ${this.scopingData.dataSources.join(', ')}\n`;
        }
        response += `• **Actions**: ${this.scopingData.actions?.join(', ') || 'Process data'}\n`;
        response += `• **Output**: ${this.scopingData.output}\n`;
        response += `• **Complexity**: ${validation.estimatedComplexity}\n\n`;
        
        if (validation.warnings.length > 0) {
          response += `⚠️ **Notes:**\n${validation.warnings.map(w => `• ${w}`).join('\n')}\n\n`;
        }
        
        response += "Ready to create your workflow! Click the 'Create Workflow' button below to proceed.";
        
        return {
          response,
          questions: [],
          mode: 'validating',
          needsMoreInfo: false,
          canProceed: true,
          scopeStatus: this.scopingData
        };
      } else {
        // Workflow not feasible, suggest alternatives
        let response = "I've checked our n8n capabilities, and there are some challenges with your exact requirements:\n\n";
        
        if (validation.missingCapabilities.length > 0) {
          response += `❌ **Missing Capabilities:**\n`;
          response += validation.missingCapabilities.map(cap => `• ${cap}`).join('\n');
          response += "\n\n";
        }
        
        if (validation.alternativeSolutions.length > 0) {
          response += `💡 **Alternative Solutions:**\n`;
          response += validation.alternativeSolutions.map(alt => `• ${alt}`).join('\n');
          response += "\n\n";
        }
        
        response += "Would you like to modify your requirements or try one of the alternatives?";
        
        // Go back to scoping mode
        this.conversationMode = 'scoping';
        
        return {
          response,
          questions: ["What would you like to change about your workflow?"],
          mode: 'scoping',
          needsMoreInfo: true,
          canProceed: false,
          scopeStatus: this.scopingData
        };
      }
    }

    // Ask for the next piece of missing information
    const nextQuestion = this.getNextScopingQuestion(missingInfo[0]);
    
    return {
      response: `I understand you want to ${this.summarizeCurrentScope()}. ${nextQuestion}`,
      questions: [nextQuestion],
      mode: 'scoping',
      needsMoreInfo: true,
      canProceed: false,
      scopeStatus: this.scopingData
    };
  }

  private async extractScopeInfo(message: string): Promise<any> {
    const prompt = `Extract workflow automation information from this message:
"${message}"

Look for:
- Triggers (webhooks, schedules, form submissions, etc.)
- Data sources (Google Sheets, databases, APIs, files)
- Actions (send email, update database, create file, notify)
- Conditions (if/then logic, filters)
- Output destinations (where results should go)
- Frequency (how often it should run)

Return as JSON with keys: trigger, dataSources, actions, conditions, output, frequency
Only include what's explicitly mentioned.`;

    try {
      const response = await this.think(prompt);
      return JSON.parse(response);
    } catch {
      return {};
    }
  }

  private getMissingScope(): string[] {
    const required = ['trigger', 'actions', 'output'];
    return required.filter(key => !this.scopingData[key]);
  }

  private getNextScopingQuestion(field: string): string {
    const questions = this.scopingQuestions[field as keyof typeof this.scopingQuestions];
    return questions ? questions[0] : "Can you tell me more about your workflow requirements?";
  }

  private getNextScopingQuestions(): string[] {
    const missing = this.getMissingScope();
    return missing.slice(0, 2).map(field => this.getNextScopingQuestion(field));
  }

  private summarizeCurrentScope(): string {
    const parts = [];
    
    if (this.scopingData.trigger) {
      parts.push(`trigger on ${this.scopingData.trigger}`);
    }
    if (this.scopingData.actions && this.scopingData.actions.length > 0) {
      parts.push(`${this.scopingData.actions.join(' and ')}`);
    }
    if (this.scopingData.output) {
      parts.push(`output to ${this.scopingData.output}`);
    }
    
    return parts.join(', ') || "automate your workflow";
  }

  async createWorkflowFromScope(): Promise<{
    success: boolean;
    message: string;
    workflowId?: string;
    phase: string;
  }> {
    try {
      // Get the workflow structure from memory (set during validation)
      const workflowStructure = this.getMemory('workflow_structure');
      
      if (!workflowStructure) {
        // If no structure, generate it now
        const validation = await n8nValidator.validateFeasibility(this.scopingData);
        if (!validation.feasible || !validation.suggestedStructure) {
          return {
            success: false,
            message: "Unable to generate workflow structure. Please try modifying your requirements.",
            phase: 'error'
          };
        }
        this.setMemory('workflow_structure', validation.suggestedStructure);
      }
      
      // Deploy the workflow
      const deploymentResult = await n8nValidator.deployWorkflow(
        this.getMemory('workflow_structure')
      );
      
      if (deploymentResult.success) {
        this.conversationMode = 'completed' as any;
        
        return {
          success: true,
          message: `🎉 Success! Your workflow has been created and deployed to n8n.\n\n` +
                  `**Workflow ID**: ${deploymentResult.workflowId}\n` +
                  `**Status**: Ready to activate\n\n` +
                  `You can now:\n` +
                  `• Test the workflow in n8n\n` +
                  `• Activate it for production use\n` +
                  `• Modify the nodes as needed\n\n` +
                  `Access your workflow at: ${import.meta.env.VITE_N8N_API_URL?.replace('/api/v1', '')}/workflow/${deploymentResult.workflowId}`,
          workflowId: deploymentResult.workflowId,
          phase: 'completed'
        };
      } else {
        return {
          success: false,
          message: `Failed to deploy workflow: ${deploymentResult.error}\n\n` +
                  `This might be due to:\n` +
                  `• n8n server connectivity issues\n` +
                  `• Invalid API credentials\n` +
                  `• Workflow configuration issues\n\n` +
                  `Would you like to try again or modify your requirements?`,
          phase: 'error'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        phase: 'error'
      };
    }
  }

  // Core orchestrator methods
  async analyzeUserMessage(message: string, conversationHistory: any[] = []): Promise<{
    intent: string;
    confidence: number;
    requirements: string[];
    questions: string[];
    nextAction: string;
  }> {
    this.updateProgress(10);

    const prompt = `Analyze this user message for workflow automation intent:

Message: "${message}"

Previous conversation context:
${conversationHistory.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Determine:
1. Primary intent (create_workflow, modify_workflow, get_status, ask_question, etc.)
2. Confidence level (0-1)
3. Specific requirements or parameters mentioned
4. Questions needed for clarification
5. Recommended next action

Respond in JSON format.`;

    const response = await this.think(prompt);
    this.updateProgress(30);
    
    try {
      return JSON.parse(response);
    } catch (error) {
      // Fallback parsing
      return {
        intent: 'create_workflow',
        confidence: 0.7,
        requirements: [message],
        questions: [],
        nextAction: 'extract_requirements'
      };
    }
  }

  async extractRequirements(userInput: string): Promise<WorkflowRequirement[]> {
    this.updateProgress(20);

    const prompt = `Extract structured workflow requirements from this user input:

"${userInput}"

Identify and structure:
1. Triggers (webhooks, schedules, events)
2. Actions (API calls, data processing, notifications)
3. Conditions (if/then logic, filters)
4. Integrations (external services, APIs)
5. Data transformations
6. Error handling needs
7. Security requirements

Return as a JSON array of WorkflowRequirement objects with:
- id: unique identifier
- type: 'trigger' | 'action' | 'condition' | 'integration'
- description: clear description
- priority: 'high' | 'medium' | 'low'
- parameters: relevant configuration

Be specific and technical while remaining implementable in n8n.`;

    const response = await this.think(prompt);
    this.updateProgress(50);

    try {
      const requirements = JSON.parse(response);
      
      // Add to context
      this.context.userRequirements = requirements.map((req: any) => ({
        ...req,
        status: 'pending'
      }));

      return this.context.userRequirements;
    } catch (error) {
      throw new Error(`Failed to parse requirements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async planWorkflow(requirements: WorkflowRequirement[]): Promise<{
    phases: WorkflowPhase[];
    taskAssignments: { agent: string; tasks: string[]; dependencies: string[] }[];
    estimatedTime: number;
    riskFactors: string[];
  }> {
    this.updateProgress(30);

    const prompt = `Create an execution plan for this workflow based on requirements:

Requirements:
${requirements.map(req => `- ${req.type}: ${req.description} (${req.priority})`).join('\n')}

Plan should include:
1. Execution phases in logical order
2. Task assignments to appropriate specialist agents
3. Dependencies between tasks
4. Estimated completion time
5. Potential risk factors

Available agents:
- WorkflowDesigner: n8n node architecture and flow logic
- IntegrationSpecialist: API connections and authentication  
- TestingAgent: validation and reliability testing
- DeploymentAgent: n8n deployment and activation
- MonitorAgent: performance monitoring

Return detailed JSON plan optimizing for parallel execution where possible.`;

    const response = await this.think(prompt);
    this.updateProgress(60);

    try {
      const plan = JSON.parse(response);
      this.setMemory('execution_plan', plan);
      return plan;
    } catch (error) {
      throw new Error(`Failed to create execution plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delegateTasks(plan: any): Promise<{
    delegatedTasks: { agentId: string; taskId: string; status: string }[];
    totalTasks: number;
    activeTasks: number;
  }> {
    this.updateProgress(40);

    const delegatedTasks: { agentId: string; taskId: string; status: string }[] = [];

    for (const assignment of plan.taskAssignments) {
      const agent = this.specialists.get(assignment.agent);
      
      if (!agent) {
        console.warn(`Agent ${assignment.agent} not available`);
        continue;
      }

      // Send tasks to specialist agents
      for (const task of assignment.tasks) {
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await this.sendMessage({
          toAgent: assignment.agent,
          type: 'task',
          conversationId: this.context.conversationId,
          payload: {
            taskId,
            action: task,
            requirements: this.context.userRequirements,
            dependencies: assignment.dependencies,
            deadline: Date.now() + (plan.estimatedTime * 1000)
          }
        });

        delegatedTasks.push({
          agentId: assignment.agent,
          taskId,
          status: 'assigned'
        });
      }
    }

    this.setMemory('delegated_tasks', delegatedTasks);
    this.updateProgress(70);

    return {
      delegatedTasks,
      totalTasks: delegatedTasks.length,
      activeTasks: delegatedTasks.filter(t => t.status === 'assigned').length
    };
  }

  async validateOutput(agentOutput: any, criteria: string[]): Promise<{
    isValid: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    this.updateProgress(80);

    const prompt = `Validate this agent output against quality criteria:

Output:
${JSON.stringify(agentOutput, null, 2)}

Validation criteria:
${criteria.map(c => `- ${c}`).join('\n')}

Assess:
1. Completeness (all requirements addressed)
2. Technical accuracy (valid n8n configuration)
3. Security considerations (proper authentication, error handling)
4. Performance implications (efficiency, scalability)
5. User experience (clear naming, descriptions)

Return validation results with score (0-100), specific issues, and improvement suggestions.`;

    const response = await this.think(prompt);
    this.updateProgress(90);

    try {
      return JSON.parse(response);
    } catch (error) {
      return {
        isValid: false,
        score: 0,
        issues: ['Failed to validate output'],
        suggestions: ['Please review and resubmit']
      };
    }
  }

  async provideProgressUpdate(): Promise<{
    phase: WorkflowPhase;
    overallProgress: number;
    completedTasks: number;
    totalTasks: number;
    agentStatuses: { agentId: string; status: string; progress: number }[];
    nextSteps: string[];
    estimatedCompletion: number;
  }> {
    const delegatedTasks = this.getMemory<any[]>('delegated_tasks') || [];
    const completedTasks = delegatedTasks.filter(t => t.status === 'completed').length;
    const totalTasks = delegatedTasks.length;
    
    const agentStatuses = Array.from(this.specialists.entries()).map(([id, agent]) => ({
      agentId: id,
      status: agent.getState().status,
      progress: agent.getState().progress
    }));

    const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      phase: this.currentPhase,
      overallProgress,
      completedTasks,
      totalTasks,
      agentStatuses,
      nextSteps: this.getNextSteps(),
      estimatedCompletion: this.estimateCompletion()
    };
  }

  private getNextSteps(): string[] {
    switch (this.currentPhase) {
      case 'understanding':
        return ['Analyze user requirements', 'Ask clarifying questions', 'Structure workflow specification'];
      case 'planning':
        return ['Create execution plan', 'Assign tasks to specialists', 'Validate dependencies'];
      case 'designing':
        return ['Design n8n workflow structure', 'Configure integrations', 'Plan error handling'];
      case 'building':
        return ['Generate n8n nodes', 'Set up connections', 'Configure authentication'];
      case 'testing':
        return ['Validate workflow logic', 'Test integrations', 'Performance testing'];
      case 'deploying':
        return ['Deploy to n8n', 'Activate workflow', 'Verify deployment'];
      case 'monitoring':
        return ['Set up monitoring', 'Configure alerts', 'Performance baseline'];
      default:
        return ['Continue processing'];
    }
  }

  private estimateCompletion(): number {
    const phaseProgress = this.getPhaseProgress();
    const remainingTime = this.getRemainingTimeEstimate();
    return Date.now() + remainingTime;
  }

  private getPhaseProgress(): number {
    // Calculate progress within current phase
    const delegatedTasks = this.getMemory<any[]>('delegated_tasks') || [];
    const phaseTasks = delegatedTasks.filter(t => this.isTaskForCurrentPhase(t));
    const completedPhaseTasks = phaseTasks.filter(t => t.status === 'completed');
    
    return phaseTasks.length > 0 ? (completedPhaseTasks.length / phaseTasks.length) * 100 : 0;
  }

  private isTaskForCurrentPhase(task: any): boolean {
    // Logic to determine if task belongs to current phase
    return true; // Simplified for now
  }

  private getRemainingTimeEstimate(): number {
    // Estimate remaining time based on current progress and phase
    const baseTimeMs = 5 * 60 * 1000; // 5 minutes base
    const phaseMultiplier = this.getPhaseMultiplier();
    const progressFactor = (100 - this.getPhaseProgress()) / 100;
    
    return baseTimeMs * phaseMultiplier * progressFactor;
  }

  private getPhaseMultiplier(): number {
    switch (this.currentPhase) {
      case 'understanding': return 1;
      case 'planning': return 1.5;
      case 'designing': return 3;
      case 'building': return 4;
      case 'testing': return 2;
      case 'deploying': return 1.5;
      case 'monitoring': return 1;
      default: return 2;
    }
  }

  // Phase management
  setPhase(phase: WorkflowPhase): void {
    this.currentPhase = phase;
    this.phaseStartTime = Date.now();
    this.updateState({ metadata: { ...this.state.metadata, currentPhase: phase } });
  }

  getCurrentPhase(): WorkflowPhase {
    return this.currentPhase;
  }

  // Specialist agent management
  registerSpecialist(agent: BaseAgent): void {
    this.specialists.set(agent.getState().id, agent);
    
    // Subscribe to specialist messages
    agent.subscribe((message) => {
      this.handleSpecialistMessage(message);
    });
  }

  private async handleSpecialistMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case 'result':
        await this.handleSpecialistResult(message);
        break;
      case 'error':
        await this.handleSpecialistError(message);
        break;
      case 'question':
        await this.handleSpecialistQuestion(message);
        break;
    }
  }

  private async handleSpecialistResult(message: AgentMessage): Promise<void> {
    // Update task status
    const delegatedTasks = this.getMemory<any[]>('delegated_tasks') || [];
    const taskIndex = delegatedTasks.findIndex(t => t.taskId === message.payload.taskId);
    
    if (taskIndex >= 0) {
      delegatedTasks[taskIndex].status = 'completed';
      this.setMemory('delegated_tasks', delegatedTasks);
    }

    // Check if all tasks in current phase are complete
    const phaseComplete = this.checkPhaseCompletion();
    if (phaseComplete) {
      await this.advancePhase();
    }
  }

  private async handleSpecialistError(message: AgentMessage): Promise<void> {
    console.error(`Specialist error from ${message.fromAgent}:`, message.payload);
    
    // Update task status
    const delegatedTasks = this.getMemory<any[]>('delegated_tasks') || [];
    const taskIndex = delegatedTasks.findIndex(t => t.taskId === message.payload.taskId);
    
    if (taskIndex >= 0) {
      delegatedTasks[taskIndex].status = 'failed';
      this.setMemory('delegated_tasks', delegatedTasks);
    }

    // Implement retry logic or fallback
    await this.handleTaskFailure(message.payload);
  }

  private async handleSpecialistQuestion(message: AgentMessage): Promise<void> {
    // Route question to user or provide clarification
    const response = await this.think(`A specialist agent needs clarification: ${message.payload.question}`);
    
    await this.sendMessage({
      toAgent: message.fromAgent,
      type: 'result',
      conversationId: this.context.conversationId,
      payload: { answer: response, questionId: message.payload.questionId }
    });
  }

  private checkPhaseCompletion(): boolean {
    const delegatedTasks = this.getMemory<any[]>('delegated_tasks') || [];
    const phaseTasks = delegatedTasks.filter(t => this.isTaskForCurrentPhase(t));
    const completedTasks = phaseTasks.filter(t => t.status === 'completed');
    
    return phaseTasks.length > 0 && completedTasks.length === phaseTasks.length;
  }

  private async advancePhase(): Promise<void> {
    const phaseOrder: WorkflowPhase[] = [
      'understanding', 'planning', 'designing', 'building', 'testing', 'deploying', 'monitoring', 'completed'
    ];

    const currentIndex = phaseOrder.indexOf(this.currentPhase);
    if (currentIndex < phaseOrder.length - 1) {
      this.setPhase(phaseOrder[currentIndex + 1]);
      
      // Send phase change notification
      await this.sendMessage({
        toAgent: 'broadcast',
        type: 'status',
        conversationId: this.context.conversationId,
        payload: { 
          type: 'phase_change', 
          newPhase: this.currentPhase,
          progress: ((currentIndex + 1) / phaseOrder.length) * 100
        }
      });
    }
  }

  private async handleTaskFailure(failurePayload: any): Promise<void> {
    // Implement retry logic or alternative approaches
    const retryCount = this.getMemory<number>(`retry_${failurePayload.taskId}`) || 0;
    
    if (retryCount < 3) {
      // Retry with different approach
      this.setMemory(`retry_${failurePayload.taskId}`, retryCount + 1);
      
      // Delegate task again with modified parameters
      // Implementation depends on specific failure type
    } else {
      // Escalate to human intervention or use fallback
      await this.sendMessage({
        toAgent: 'broadcast',
        type: 'error',
        conversationId: this.context.conversationId,
        payload: {
          type: 'task_failure',
          taskId: failurePayload.taskId,
          maxRetriesExceeded: true,
          suggestedAction: 'human_intervention'
        }
      });
    }
  }
}