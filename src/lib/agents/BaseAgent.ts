// Base agent class with Supabase Edge Function integration
import { AgentConfig, AgentContext, AgentMessage, AgentState, ExecutionStep } from './types';
import { errorHandler, ErrorCategory, ErrorSeverity } from './ErrorHandler';
import { performanceOptimizer } from './PerformanceOptimizer';
import { supabase } from '../supabase';

// Enhanced Supabase integration detection
function checkSupabaseConnection(): { isConnected: boolean; source: string } {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('[BaseAgent] Supabase connection check:', {
    url: supabaseUrl ? '✅ Set' : '❌ Not set',
    key: supabaseKey ? '✅ Set' : '❌ Not set',
    location: window.location.href
  });
  
  const isConnected = !!(supabaseUrl && supabaseKey);
  
  console.log('[BaseAgent] Using Supabase Edge Functions for AI processing:', {
    isConnected,
    edgeFunctionMode: true
  });
  
  return { isConnected, source: 'supabase-edge-functions' };
}

const { isConnected: IS_SUPABASE_CONNECTED, source: CONNECTION_SOURCE } = checkSupabaseConnection();

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected context: AgentContext;
  protected state: AgentState;
  protected messageQueue: AgentMessage[] = [];
  protected subscribers: Set<(message: AgentMessage) => void> = new Set();

  constructor(config: AgentConfig, context: AgentContext) {
    console.log(`[${config.id}] Initializing agent:`, {
      supabaseConnected: IS_SUPABASE_CONNECTED,
      connectionSource: CONNECTION_SOURCE,
      environment: import.meta.env.MODE || 'unknown'
    });
    
    if (IS_SUPABASE_CONNECTED) {
      console.log(`[${config.id}] ✅ Using Supabase Edge Functions for AI processing`);
    } else {
      console.warn(`[${config.id}] ⚠️  Supabase connection not available - may fall back to demo mode`);
    }
    
    this.config = config;
    this.context = context;
    this.state = {
      id: config.id,
      name: config.name,
      status: 'idle',
      progress: 0,
      lastUpdate: Date.now(),
      metadata: {
        supabaseConnected: IS_SUPABASE_CONNECTED,
        connectionSource: CONNECTION_SOURCE,
        initialized: Date.now()
      }
    };
  }

  // Abstract methods to be implemented by specialized agents
  abstract processTask(task: any): Promise<any>;
  abstract validateInput(input: any): boolean;
  abstract getCapabilities(): string[];

  // Core agent functionality using Supabase Edge Functions
  async think(prompt: string, context?: any): Promise<string> {
    // Create cache key from prompt and context
    const cacheKey = `think-${this.config.id}-${JSON.stringify({ prompt, context })}`;
    
    // Use memoization for repeated queries
    return performanceOptimizer.memoize(cacheKey, async () => {
      this.updateState({ status: 'thinking' });

      try {
        console.log(`[${this.config.id}] 🚀 Using Supabase Edge Function for prompt:`, prompt.substring(0, 50) + '...');
        
        // Get current user for the edge function call
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn(`[${this.config.id}] ⚠️  No authenticated user - using guest mode`);
        }
        
        // Call the ai-chat-system edge function
        const { data, error } = await supabase.functions.invoke('ai-chat-system', {
          body: {
            message: prompt,
            agent_type: this.config.id.split('-')[0], // Extract agent type from ID
            user_id: user?.id || 'anonymous',
            stream: false
          }
        });
        
        if (error) {
          console.error(`[${this.config.id}] ❌ Edge function error:`, error);
          throw new Error(`Edge function error: ${error.message}`);
        }
        
        const result = data?.response || '';
        console.log(`[${this.config.id}] ✅ Edge function response received:`, {
          length: result.length,
          preview: result.substring(0, 100) + '...',
          tokensUsed: data?.tokens_used || 0,
          agentType: data?.agent_type,
          processingTime: data?.processing_time
        });
        
        this.updateState({ status: 'idle' });
        return result;
    } catch (error) {
      console.error(`[${this.config.id}] ❌ Error in think():`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        supabaseConnected: IS_SUPABASE_CONNECTED,
        connectionSource: CONNECTION_SOURCE,
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

  // Demo mode response generator
  protected generateDemoResponse(prompt: string, context?: any): string {
    // Generate contextual demo responses based on agent type
    const agentName = this.config.name.toLowerCase();
    
    if (agentName.includes('orchestrator')) {
      return `I understand you want to: ${prompt}\n\nLet me coordinate with the other agents to help you build this workflow. I'll break this down into manageable tasks and delegate them to the appropriate specialists.`;
    } else if (agentName.includes('workflow')) {
      return `I'll design an n8n workflow for: ${prompt}\n\nThe workflow will include appropriate nodes and connections to handle your requirements efficiently.`;
    } else if (agentName.includes('deployment')) {
      return `I'll handle the deployment of your workflow. Once validated, I'll ensure it's properly deployed to your n8n instance.`;
    } else {
      return `Processing your request: ${prompt}\n\nNote: This is a demo response. Configure your OpenAI API key for full functionality.`;
    }
  }

  // Cleanup
  destroy(): void {
    this.subscribers.clear();
    this.messageQueue = [];
    this.updateState({ status: 'idle' });
  }
}