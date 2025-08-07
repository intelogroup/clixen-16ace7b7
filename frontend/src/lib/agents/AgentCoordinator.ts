// Central coordinator for managing multi-agent workflows
import { BaseAgent } from './BaseAgent';
import { OrchestratorAgent } from './OrchestratorAgent';
import { WorkflowDesignerAgent } from './WorkflowDesignerAgent';
import { DeploymentAgent } from './DeploymentAgent';
import { 
  AgentContext, 
  AgentMessage, 
  ConversationState, 
  ChatMessage, 
  WorkflowPhase,
  AgentConfig 
} from './types';

export class AgentCoordinator {
  private agents: Map<string, BaseAgent> = new Map();
  private conversations: Map<string, ConversationState> = new Map();
  private messageQueue: AgentMessage[] = [];
  private isProcessingMessages = false;
  private eventListeners: Map<string, ((event: any) => void)[]> = new Map();

  constructor() {
    this.setupMessageProcessing();
  }

  // Conversation Management
  async startConversation(userId: string, initialMessage: string): Promise<{
    conversationId: string;
    response: string;
    phase: WorkflowPhase;
    agentStatus: any;
  }> {
    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create agent context
    const context: AgentContext = {
      conversationId,
      userId,
      userRequirements: [],
      agentStates: {},
      executionHistory: [],
      validationResults: [],
      sharedMemory: {}
    };

    // Initialize conversation state
    const conversation: ConversationState = {
      id: conversationId,
      userId,
      status: 'active',
      startedAt: Date.now(),
      lastActivity: Date.now(),
      messages: [{
        id: `msg-${Date.now()}`,
        role: 'user',
        content: initialMessage,
        timestamp: Date.now()
      }],
      context,
      activeAgents: [],
      completedTasks: [],
      currentPhase: 'understanding'
    };

    this.conversations.set(conversationId, conversation);

    // Initialize agents for this conversation
    await this.initializeAgents(context);

    // Process initial message
    const response = await this.processUserMessage(conversationId, initialMessage);

    this.emit('conversation_started', {
      conversationId,
      userId,
      initialMessage,
      response
    });

    return {
      conversationId,
      response: response.content,
      phase: conversation.currentPhase,
      agentStatus: this.getAgentStatus(conversationId)
    };
  }

  // Enhanced workflow progress tracking
  async trackWorkflowProgress(conversationId: string, phase: WorkflowPhase, details: any = {}): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    conversation.currentPhase = phase;
    conversation.lastActivity = Date.now();

    // Store workflow progress in shared memory
    conversation.context.sharedMemory.workflow_progress = {
      phase,
      timestamp: Date.now(),
      details,
      status: details.status || 'in_progress'
    };

    // Emit progress event
    this.emit('workflow_progress', {
      conversationId,
      phase,
      details,
      timestamp: Date.now()
    });

    // Update agent states based on phase
    switch (phase) {
      case 'understanding':
        conversation.activeAgents = ['orchestrator'];
        break;
      case 'designing':
        conversation.activeAgents = ['orchestrator', 'workflow_designer'];
        break;
      case 'building':
        conversation.activeAgents = ['workflow_designer'];
        if (details.workflow_id) {
          conversation.context.sharedMemory.current_workflow_id = details.workflow_id;
        }
        break;
      case 'deploying':
        conversation.activeAgents = ['workflow_designer', 'deployment'];
        break;
      case 'testing':
        conversation.activeAgents = ['deployment'];
        break;
      case 'completed':
        conversation.activeAgents = [];
        conversation.status = 'completed';
        if (details.workflow_id && details.n8n_url) {
          conversation.context.sharedMemory.deployed_workflow = {
            id: details.workflow_id,
            url: details.n8n_url,
            status: details.status || 'active',
            deployed_at: Date.now()
          };
        }
        break;
    }
  }

  // Get detailed workflow status
  getWorkflowStatus(conversationId: string): {
    phase: WorkflowPhase;
    status: string;
    progress: number;
    workflow_id?: string;
    n8n_url?: string;
    agent_activities: any[];
    next_steps: string[];
    errors?: string[];
  } {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return {
        phase: 'understanding',
        status: 'not_found',
        progress: 0,
        agent_activities: [],
        next_steps: ['Start a new conversation']
      };
    }

    const workflowProgress = conversation.context.sharedMemory.workflow_progress;
    const deployedWorkflow = conversation.context.sharedMemory.deployed_workflow;
    const currentWorkflowId = conversation.context.sharedMemory.current_workflow_id;

    // Calculate progress percentage
    const phaseProgress = {
      'understanding': 10,
      'designing': 30,
      'building': 60,
      'deploying': 80,
      'testing': 90,
      'completed': 100
    };

    const progress = phaseProgress[conversation.currentPhase] || 0;

    // Get agent activities
    const agentActivities = conversation.activeAgents.map(agentId => {
      const agentState = conversation.context.agentStates[agentId];
      return {
        agent: agentId,
        status: agentState?.status || 'idle',
        current_task: agentState?.currentTask,
        progress: agentState?.progress || 0,
        last_update: agentState?.lastUpdate
      };
    });

    // Determine next steps
    const nextSteps: string[] = [];
    switch (conversation.currentPhase) {
      case 'understanding':
        nextSteps.push('Provide more details about your workflow requirements');
        break;
      case 'designing':
        nextSteps.push('Review the proposed workflow design');
        nextSteps.push('Provide feedback or approve the design');
        break;
      case 'building':
        nextSteps.push('Workflow is being created in n8n');
        if (currentWorkflowId) {
          nextSteps.push(`View workflow: http://18.221.12.50:5678/workflow/${currentWorkflowId}`);
        }
        break;
      case 'deploying':
        nextSteps.push('Workflow deployment in progress');
        break;
      case 'testing':
        nextSteps.push('Testing deployed workflow');
        break;
      case 'completed':
        if (deployedWorkflow) {
          nextSteps.push(`Workflow is live: ${deployedWorkflow.url}`);
          nextSteps.push('Test your workflow or create a new one');
        }
        break;
    }

    return {
      phase: conversation.currentPhase,
      status: workflowProgress?.status || 'active',
      progress,
      workflow_id: deployedWorkflow?.id || currentWorkflowId,
      n8n_url: deployedWorkflow?.url,
      agent_activities: agentActivities,
      next_steps: nextSteps,
      errors: workflowProgress?.errors
    };
  }

  async handleNaturalConversation(message: string, conversationHistory: any[]): Promise<{
    response: string;
    questions: string[];
    mode: 'greeting' | 'scoping' | 'validating' | 'creating';
    needsMoreInfo: boolean;
    canProceed: boolean;
    scopeStatus?: any;
  }> {
    // Create a temporary context for natural conversation
    const tempContext: AgentContext = {
      conversationId: `temp-${Date.now()}`,
      userId: 'temp-user',
      userRequirements: [],
      agentStates: {},
      executionHistory: [],
      validationResults: [],
      sharedMemory: {}
    };

    // Get or create orchestrator agent
    const orchestrator = new OrchestratorAgent(tempContext);
    
    // Handle the natural conversation
    const result = await orchestrator.processTask({
      action: 'handle_conversation',
      input: {
        message,
        conversationHistory
      }
    });

    return result;
  }

  async continueConversation(conversationId: string, message: string): Promise<{
    response: string;
    phase: WorkflowPhase;
    progress: number;
    agentStatus: any;
  }> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Update conversation
    conversation.lastActivity = Date.now();
    conversation.messages.push({
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // Process message
    const response = await this.processUserMessage(conversationId, message);

    // Update conversation with response
    conversation.messages.push({
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: response.content,
      timestamp: Date.now(),
      agentId: response.agentId
    });

    this.emit('message_processed', {
      conversationId,
      userMessage: message,
      response: response.content,
      phase: conversation.currentPhase
    });

    return {
      response: response.content,
      phase: conversation.currentPhase,
      progress: this.calculateProgress(conversationId),
      agentStatus: this.getAgentStatus(conversationId)
    };
  }

  async getConversationStatus(conversationId: string): Promise<{
    phase: WorkflowPhase;
    progress: number;
    activeAgents: string[];
    completedTasks: string[];
    errors: string[];
    estimatedCompletion?: number;
  }> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const orchestrator = this.agents.get(`${conversationId}-orchestrator`) as OrchestratorAgent;
    let progressData = null;
    
    if (orchestrator) {
      progressData = await orchestrator.provideProgressUpdate();
    }

    return {
      phase: conversation.currentPhase,
      progress: this.calculateProgress(conversationId),
      activeAgents: conversation.activeAgents,
      completedTasks: conversation.completedTasks,
      errors: this.getConversationErrors(conversationId),
      estimatedCompletion: progressData?.estimatedCompletion
    };
  }

  // Agent Management
  private async initializeAgents(context: AgentContext): Promise<void> {
    const conversationId = context.conversationId;

    // Create orchestrator agent
    const orchestrator = new OrchestratorAgent(context);
    this.agents.set(`${conversationId}-orchestrator`, orchestrator);

    // Create specialist agents
    const workflowDesigner = new WorkflowDesignerAgent(context);
    this.agents.set(`${conversationId}-workflow-designer`, workflowDesigner);

    const deploymentAgent = new DeploymentAgent(context);
    this.agents.set(`${conversationId}-deployment-agent`, deploymentAgent);

    // Register specialists with orchestrator
    orchestrator.registerSpecialist(workflowDesigner);
    orchestrator.registerSpecialist(deploymentAgent);

    // Subscribe to agent messages
    for (const [agentId, agent] of this.agents.entries()) {
      if (agentId.startsWith(conversationId)) {
        agent.subscribe((message) => {
          this.handleAgentMessage(conversationId, message);
        });
      }
    }

    // Update conversation active agents
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.activeAgents = [
        'orchestrator',
        'workflow-designer', 
        'deployment-agent'
      ];
    }
  }

  private async processUserMessage(conversationId: string, message: string): Promise<{
    content: string;
    agentId: string;
  }> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const orchestrator = this.agents.get(`${conversationId}-orchestrator`) as OrchestratorAgent;
    if (!orchestrator) {
      throw new Error('Orchestrator agent not found');
    }

    try {
      // Analyze user message
      const analysis = await orchestrator.executeStep('analyze_user_message', {
        message,
        conversationHistory: conversation.messages.slice(-5)
      });

      let response = '';

      // Handle different intents
      switch (analysis.intent) {
        case 'create_workflow':
          response = await this.handleWorkflowCreation(conversationId, message, analysis);
          break;
          
        case 'modify_workflow':
          response = await this.handleWorkflowModification(conversationId, message, analysis);
          break;
          
        case 'get_status':
          response = await this.handleStatusRequest(conversationId);
          break;
          
        case 'ask_question':
          response = await this.handleQuestion(conversationId, message, analysis);
          break;
          
        default:
          response = await this.handleGeneral(conversationId, message, analysis);
      }

      return {
        content: response,
        agentId: 'orchestrator'
      };

    } catch (error) {
      console.error('Error processing user message:', error);
      return {
        content: 'I encountered an error processing your request. Could you please try again or rephrase your question?',
        agentId: 'orchestrator'
      };
    }
  }

  private async handleWorkflowCreation(
    conversationId: string, 
    message: string, 
    analysis: any
  ): Promise<string> {
    const orchestrator = this.agents.get(`${conversationId}-orchestrator`) as OrchestratorAgent;
    
    // Set phase to understanding
    orchestrator.setPhase('understanding');
    this.updateConversationPhase(conversationId, 'understanding');

    // Extract requirements
    const requirements = await orchestrator.executeStep('extract_requirements', {
      userInput: message
    });

    if (analysis.questions && analysis.questions.length > 0) {
      // Need clarification
      return `I understand you want to create a workflow. To help you build the perfect automation, I have a few questions:

${analysis.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

Please provide this information so I can design the most effective workflow for your needs.`;
    } else {
      // Start planning
      orchestrator.setPhase('planning');
      this.updateConversationPhase(conversationId, 'planning');
      
      const plan = await orchestrator.executeStep('plan_workflow', { requirements });
      
      return `Great! I've analyzed your requirements and created a plan for your workflow:

**Workflow Overview:**
${requirements.map((req: any) => `• ${req.description}`).join('\n')}

**Execution Plan:**
• Estimated time: ${Math.round(plan.estimatedTime / 60)} minutes
• Tasks: ${plan.taskAssignments.length} main components
• Phases: ${plan.phases.join(' → ')}

I'm now starting the design process. You'll see progress updates as my specialist agents work on different aspects of your workflow.

Would you like me to proceed with the implementation?`;
    }
  }

  private async handleWorkflowModification(
    conversationId: string, 
    message: string, 
    analysis: any
  ): Promise<string> {
    // Implementation for modifying existing workflows
    return "I can help you modify existing workflows. Could you please specify which workflow you'd like to update and what changes you need?";
  }

  private async handleStatusRequest(conversationId: string): Promise<string> {
    const status = await this.getConversationStatus(conversationId);
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      return "I couldn't find information about your current workflow.";
    }

    let response = `**Current Status:**\n`;
    response += `• Phase: ${status.phase}\n`;
    response += `• Progress: ${status.progress}%\n`;
    response += `• Active Agents: ${status.activeAgents.join(', ')}\n`;
    
    if (status.completedTasks.length > 0) {
      response += `• Completed: ${status.completedTasks.length} tasks\n`;
    }
    
    if (status.errors.length > 0) {
      response += `• Issues: ${status.errors.length} errors detected\n`;
    }

    if (status.estimatedCompletion) {
      const eta = new Date(status.estimatedCompletion);
      response += `• ETA: ${eta.toLocaleTimeString()}\n`;
    }

    return response;
  }

  private async handleQuestion(
    conversationId: string, 
    message: string, 
    analysis: any
  ): Promise<string> {
    const orchestrator = this.agents.get(`${conversationId}-orchestrator`) as OrchestratorAgent;
    
    const response = await orchestrator.think(
      `Answer this user question about workflow automation: ${message}`,
      { 
        conversationContext: this.conversations.get(conversationId),
        capabilities: ['n8n', 'workflow_automation', 'integrations']
      }
    );
    
    return response;
  }

  private async handleGeneral(
    conversationId: string, 
    message: string, 
    analysis: any
  ): Promise<string> {
    const orchestrator = this.agents.get(`${conversationId}-orchestrator`) as OrchestratorAgent;
    
    return await orchestrator.think(
      `Respond to this user message in the context of workflow automation: ${message}`,
      { confidence: analysis.confidence }
    );
  }

  // Message Processing
  private setupMessageProcessing(): void {
    setInterval(() => {
      if (!this.isProcessingMessages && this.messageQueue.length > 0) {
        this.processMessageQueue();
      }
    }, 100);
  }

  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingMessages) return;
    
    this.isProcessingMessages = true;
    
    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()!;
        await this.routeMessage(message);
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.isProcessingMessages = false;
    }
  }

  private async routeMessage(message: AgentMessage): Promise<void> {
    const conversationId = message.conversationId;
    
    if (message.toAgent === 'broadcast') {
      // Broadcast to all agents in conversation
      for (const [agentId, agent] of this.agents.entries()) {
        if (agentId.startsWith(conversationId) && agentId !== `${conversationId}-${message.fromAgent}`) {
          agent.receiveMessage(message);
        }
      }
    } else {
      // Send to specific agent
      const targetAgent = this.agents.get(`${conversationId}-${message.toAgent}`);
      if (targetAgent) {
        targetAgent.receiveMessage(message);
      }
    }
  }

  private handleAgentMessage(conversationId: string, message: AgentMessage): void {
    // Add to message queue for processing
    this.messageQueue.push(message);
    
    // Emit event for real-time updates
    this.emit('agent_message', {
      conversationId,
      fromAgent: message.fromAgent,
      type: message.type,
      payload: message.payload
    });

    // Handle specific message types
    switch (message.type) {
      case 'status':
        this.handleStatusUpdate(conversationId, message);
        break;
      case 'error':
        this.handleAgentError(conversationId, message);
        break;
      case 'result':
        this.handleAgentResult(conversationId, message);
        break;
    }
  }

  private handleStatusUpdate(conversationId: string, message: AgentMessage): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    if (message.payload.type === 'phase_change') {
      conversation.currentPhase = message.payload.newPhase;
      
      this.emit('phase_change', {
        conversationId,
        newPhase: message.payload.newPhase,
        progress: message.payload.progress
      });
    }
  }

  private handleAgentError(conversationId: string, message: AgentMessage): void {
    console.error(`Agent error in conversation ${conversationId}:`, message.payload);
    
    this.emit('agent_error', {
      conversationId,
      agentId: message.fromAgent,
      error: message.payload
    });
  }

  private handleAgentResult(conversationId: string, message: AgentMessage): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    // Update completed tasks
    if (message.payload.taskId && !conversation.completedTasks.includes(message.payload.taskId)) {
      conversation.completedTasks.push(message.payload.taskId);
    }

    this.emit('task_completed', {
      conversationId,
      agentId: message.fromAgent,
      taskId: message.payload.taskId,
      result: message.payload
    });
  }

  // Utility Methods
  private calculateProgress(conversationId: string): number {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return 0;

    // Calculate based on phase and completed tasks
    const phaseWeights = {
      'understanding': 10,
      'planning': 20,
      'designing': 40,
      'building': 60,
      'testing': 80,
      'deploying': 90,
      'monitoring': 95,
      'completed': 100,
      'failed': 0
    };

    return phaseWeights[conversation.currentPhase] || 0;
  }

  private getAgentStatus(conversationId: string): any {
    const agentStatus: any = {};
    
    for (const [agentId, agent] of this.agents.entries()) {
      if (agentId.startsWith(conversationId)) {
        const agentName = agentId.replace(`${conversationId}-`, '');
        agentStatus[agentName] = agent.getState();
      }
    }
    
    return agentStatus;
  }

  private getConversationErrors(conversationId: string): string[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];

    return conversation.context.validationResults
      .filter(result => result.status === 'fail')
      .map(result => result.message);
  }

  private updateConversationPhase(conversationId: string, phase: WorkflowPhase): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.currentPhase = phase;
    }
  }

  // Event System
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Cleanup
  async endConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'completed';
      
      // Cleanup agents
      for (const [agentId, agent] of this.agents.entries()) {
        if (agentId.startsWith(conversationId)) {
          agent.destroy();
          this.agents.delete(agentId);
        }
      }
      
      this.emit('conversation_ended', { conversationId });
    }
  }

  async pauseConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'paused';
      
      this.emit('conversation_paused', { conversationId });
    }
  }

  async resumeConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'active';
      conversation.lastActivity = Date.now();
      
      this.emit('conversation_resumed', { conversationId });
    }
  }

  // Analytics and Monitoring
  getActiveConversations(): ConversationState[] {
    return Array.from(this.conversations.values())
      .filter(conv => conv.status === 'active');
  }

  getConversationMetrics(conversationId: string): any {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    return {
      id: conversationId,
      duration: Date.now() - conversation.startedAt,
      messageCount: conversation.messages.length,
      phase: conversation.currentPhase,
      progress: this.calculateProgress(conversationId),
      activeAgents: conversation.activeAgents.length,
      completedTasks: conversation.completedTasks.length,
      errors: this.getConversationErrors(conversationId).length
    };
  }

  getAllMetrics(): any {
    const conversations = Array.from(this.conversations.values());
    
    return {
      totalConversations: conversations.length,
      activeConversations: conversations.filter(c => c.status === 'active').length,
      completedConversations: conversations.filter(c => c.status === 'completed').length,
      averageDuration: this.calculateAverageDuration(conversations),
      totalAgents: this.agents.size,
      messageQueueSize: this.messageQueue.length
    };
  }

  private calculateAverageDuration(conversations: ConversationState[]): number {
    if (conversations.length === 0) return 0;
    
    const completed = conversations.filter(c => c.status === 'completed');
    if (completed.length === 0) return 0;
    
    const totalDuration = completed.reduce((sum, conv) => {
      return sum + (conv.lastActivity - conv.startedAt);
    }, 0);
    
    return totalDuration / completed.length;
  }
}