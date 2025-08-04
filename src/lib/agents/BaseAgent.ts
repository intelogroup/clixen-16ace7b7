// Base agent class with Supabase Edge Function integration
import { AgentConfig, AgentContext, AgentMessage, AgentState, ExecutionStep } from './types';
import { errorHandler, ErrorCategory, ErrorSeverity } from './ErrorHandler';
import { performanceOptimizer } from './PerformanceOptimizer';

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected context: AgentContext;
  protected state: AgentState;
  protected messageQueue: AgentMessage[] = [];
  protected subscribers: Set<(message: AgentMessage) => void> = new Set();
  protected lastAIProvider: string = 'unknown';

  constructor(config: AgentConfig, context: AgentContext) {
    console.log(`[${config.id}] Initializing agent with Supabase Edge Function integration`);
    
    this.config = config;
    this.context = context;
    this.state = {
      id: config.id,
      name: config.name,
      status: 'idle',
      progress: 0,
      lastUpdate: Date.now(),
      metadata: {
        usingEdgeFunction: true,
        initialized: Date.now()
      }
    };
  }

  // Abstract methods to be implemented by specialized agents
  abstract processTask(task: any): Promise<any>;
  abstract validateInput(input: any): boolean;
  abstract getCapabilities(): string[];

  // Core agent functionality with performance optimization
  async think(prompt: string, context?: any): Promise<string> {
    // Create cache key from prompt and context
    const cacheKey = `think-${this.config.id}-${JSON.stringify({ prompt, context })}`;
    
    // Use memoization for repeated queries
    return performanceOptimizer.memoize(cacheKey, async () => {
      this.updateState({ status: 'thinking' });

      try {
        // Always use the edge function for AI responses
        console.log(`[${this.config.id}] 🤖 Calling Supabase AI edge function...`);
        
        // Get Supabase token
        const supabase = (await import('../supabase')).supabase;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Not authenticated');
        }

        // Call the edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat-system`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              message: prompt,
              user_id: session.user.id,
              agent_type: this.config.id.split('-').pop(), // Extract agent type from ID
              session_id: this.context.conversationId,
            })
          }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Edge function error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        
        console.log(`[${this.config.id}] ✅ Edge function response received:`, {
          provider: data.ai_provider,
          length: data.response?.length,
          tokensUsed: data.tokens_used,
          processingTime: data.processing_time
        });
        
        // Show which AI provider was used
        if (data.ai_provider === 'claude') {
          console.log(`[${this.config.id}] 🎭 Using Claude as fallback AI provider`);
        } else if (data.ai_provider === 'openai') {
          console.log(`[${this.config.id}] 🤖 Using OpenAI as primary AI provider`);
        }
        
        // Store the AI provider info
        this.lastAIProvider = data.ai_provider || 'unknown';
        this.updateState({ 
          status: 'idle',
          metadata: {
            ...this.state.metadata,
            lastAIProvider: this.lastAIProvider,
            lastResponseTime: data.processing_time
          }
        });
        
        return data.response || '';
    } catch (error) {
      console.error(`[${this.config.id}] ❌ Error in think():`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        usingEdgeFunction: true,
        prompt: prompt.substring(0, 50) + '...'
      });
      
      this.updateState({ status: 'error' });
      
      // Enhanced error handling
      const agentError = errorHandler.handleError(
        this.config.id,
        error,
        ErrorCategory.API,
        error instanceof Error && error.message.includes('rate limit') 
          ? ErrorSeverity.HIGH 
          : ErrorSeverity.MEDIUM
      );
      
      // Attempt retry if recoverable
      if (agentError.recoverable && agentError.retryCount < agentError.maxRetries) {
        try {
          return await errorHandler.retry(
            () => this.think(prompt, context),
            agentError
          );
        } catch (retryError) {
          throw new Error(`Agent thinking failed after ${agentError.retryCount} retries: ${agentError.message}`);
        }
      }
      
      throw new Error(`Agent thinking failed: ${agentError.userMessage || agentError.message}`);
      }
    }, 60000); // Cache for 1 minute
  }

  async executeStep(action: string, input: any): Promise<any> {
    const startTime = Date.now();
    const stepId = `${this.config.id}-${Date.now()}`;

    this.updateState({ 
      status: 'working', 
      currentTask: action,
      progress: 0 
    });

    try {
      // Log execution step
      const step: ExecutionStep = {
        id: stepId,
        agentId: this.config.id,
        action,
        input,
        duration: 0,
        timestamp: startTime
      };

      // Execute the actual task
      const output = await this.processTask({ action, input });
      
      // Complete the step
      step.output = output;
      step.duration = Date.now() - startTime;
      
      this.context.executionHistory.push(step);
      this.updateState({ 
        status: 'idle', 
        progress: 100,
        currentTask: undefined 
      });

      return output;
    } catch (error) {
      // Enhanced error handling
      const agentError = errorHandler.handleError(
        this.config.id,
        error,
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM
      );
      
      // Log error step
      const step: ExecutionStep = {
        id: stepId,
        agentId: this.config.id,
        action,
        input,
        error: agentError.message,
        duration: Date.now() - startTime,
        timestamp: startTime
      };

      this.context.executionHistory.push(step);
      this.updateState({ status: 'error' });
      
      // Send error notification
      await this.sendMessage({
        toAgent: 'orchestrator',
        type: 'error',
        conversationId: this.context.conversationId,
        payload: {
          errorId: agentError.id,
          action,
          message: agentError.message,
          recoverable: agentError.recoverable,
          resolution: agentError.resolution
        }
      });
      
      throw error;
    }
  }

  // Message handling
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp' | 'fromAgent'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: `${this.config.id}-${Date.now()}`,
      fromAgent: this.config.id,
      timestamp: Date.now(),
      conversationId: this.context.conversationId
    };

    // Notify subscribers
    this.subscribers.forEach(callback => callback(fullMessage));
  }

  subscribe(callback: (message: AgentMessage) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  receiveMessage(message: AgentMessage): void {
    this.messageQueue.push(message);
    this.processMessageQueue();
  }

  protected async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      await this.handleMessage(message);
    }
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    // Default message handling - can be overridden by specialized agents
    switch (message.type) {
      case 'task':
        await this.executeStep(message.payload.action, message.payload.input);
        break;
      case 'status':
        // Update context or respond to status requests
        break;
      case 'question':
        // Handle questions from other agents
        break;
      default:
        console.warn(`Unhandled message type: ${message.type}`);
    }
  }

  // State management
  protected updateState(updates: Partial<AgentState>): void {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdate: Date.now()
    };

    // Update context
    this.context.agentStates[this.config.id] = this.state;

    // Notify about state change
    this.sendMessage({
      toAgent: 'broadcast',
      type: 'status',
      conversationId: this.context.conversationId,
      payload: { agentId: this.config.id, state: this.state }
    });
  }

  getState(): AgentState {
    return { ...this.state };
  }

  // Utility methods
  protected buildSystemPrompt(context?: any): string {
    let prompt = this.config.systemPrompt;
    
    // Add context information
    if (this.context.userRequirements.length > 0) {
      prompt += '\n\nUser Requirements:\n';
      this.context.userRequirements.forEach(req => {
        prompt += `- ${req.description} (${req.priority} priority, ${req.status})\n`;
      });
    }

    if (this.context.currentWorkflow) {
      prompt += '\n\nCurrent Workflow:\n';
      prompt += `Name: ${this.context.currentWorkflow.name}\n`;
      prompt += `Description: ${this.context.currentWorkflow.description}\n`;
      prompt += `Nodes: ${this.context.currentWorkflow.nodes.length}\n`;
    }

    // Add execution history context
    if (this.context.executionHistory.length > 0) {
      prompt += '\n\nRecent Execution History:\n';
      this.context.executionHistory.slice(-5).forEach(step => {
        prompt += `- ${step.agentId}: ${step.action} (${step.duration}ms)\n`;
      });
    }

    if (context) {
      prompt += '\n\nAdditional Context:\n' + JSON.stringify(context, null, 2);
    }

    return prompt;
  }

  protected updateProgress(progress: number): void {
    this.updateState({ progress: Math.max(0, Math.min(100, progress)) });
  }

  // Error handling with retry logic
  protected async withRetry<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) break;
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError!;
  }

  // Memory operations
  protected setMemory(key: string, value: any): void {
    this.context.sharedMemory[key] = value;
  }

  protected getMemory<T>(key: string): T | undefined {
    return this.context.sharedMemory[key] as T;
  }

  protected clearMemory(key?: string): void {
    if (key) {
      delete this.context.sharedMemory[key];
    } else {
      this.context.sharedMemory = {};
    }
  }

  // Validation helpers
  protected validateRequiredFields(obj: any, fields: string[]): void {
    const missing = fields.filter(field => !(field in obj) || obj[field] === undefined);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  protected isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  protected isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Get the last AI provider used
  getLastAIProvider(): string {
    return this.lastAIProvider;
  }

  // Cleanup
  destroy(): void {
    this.subscribers.clear();
    this.messageQueue = [];
    this.updateState({ status: 'idle' });
  }
}