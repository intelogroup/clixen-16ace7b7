// Enhanced OpenAI service with proper environment variable handling and agent integration
import { openAIConfigService } from './OpenAIConfigService';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponse {
  content: string;
  tokens_used: number;
  model: string;
  processing_time?: number;
  finish_reason?: string;
}

export interface OpenAIStreamResponse {
  content: string;
  tokens_used: number;
  model: string;
  is_complete: boolean;
  finish_reason?: string;
}

class OpenAIService {
  private cachedKey: string | null = null;
  private keyTimestamp: number = 0;
  private readonly KEY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  private readonly DEFAULT_MODEL = 'gpt-3.5-turbo';
  private readonly DEFAULT_MAX_TOKENS = 4000;
  private readonly DEFAULT_TEMPERATURE = 0.7;

  constructor() {
    console.log('[OpenAIService] Initializing OpenAI service');
    this.logEnvironmentStatus();
  }

  /**
   * Log current environment status for debugging
   */
  private logEnvironmentStatus(): void {
    const envKey = import.meta.env.VITE_OPENAI_API_KEY;
    const hasEnvKey = !!(envKey && envKey !== 'your-openai-api-key-here' && envKey.startsWith('sk-'));
    
    console.log('[OpenAIService] Environment status:', {
      hasViteKey: hasEnvKey,
      keyPreview: envKey ? `${envKey.substring(0, 10)}...` : 'Not set',
      environment: import.meta.env.MODE || 'unknown',
      supabaseMode: true // Always prefer Supabase Edge Functions
    });
  }

  /**
   * Get the best available OpenAI API key (prioritizing Supabase, then environment)
   */
  private async getApiKey(): Promise<string | null> {
    try {
      // Check cache first
      if (this.cachedKey && (Date.now() - this.keyTimestamp) < this.KEY_CACHE_DURATION) {
        return this.cachedKey;
      }

      // Try to get from Supabase configuration first
      const supabaseKey = await openAIConfigService.getBestAvailableKey();
      if (supabaseKey && supabaseKey.startsWith('sk-')) {
        this.cachedKey = supabaseKey;
        this.keyTimestamp = Date.now();
        console.log('[OpenAIService] ✅ Using OpenAI key from Supabase configuration');
        return supabaseKey;
      }

      // Fallback to environment variable
      const envKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (envKey && envKey !== 'your-openai-api-key-here' && envKey.startsWith('sk-')) {
        this.cachedKey = envKey;
        this.keyTimestamp = Date.now();
        console.log('[OpenAIService] ✅ Using OpenAI key from environment variables');
        return envKey;
      }

      console.warn('[OpenAIService] ⚠️ No valid OpenAI API key found in Supabase or environment');
      return null;

    } catch (error) {
      console.error('[OpenAIService] ❌ Error getting API key:', error);
      return null;
    }
  }

  /**
   * Check if OpenAI service is properly configured
   */
  async isConfigured(): Promise<boolean> {
    const key = await this.getApiKey();
    return !!(key && key.length > 20 && key.startsWith('sk-'));
  }

  /**
   * Get configuration status for UI feedback
   */
  async getConfigStatus(): Promise<{
    isConfigured: boolean;
    source: 'supabase' | 'environment' | 'none';
    needsSetup: boolean;
  }> {
    try {
      // Check Supabase first
      const supabaseKey = await openAIConfigService.getBestAvailableKey();
      if (supabaseKey && supabaseKey.startsWith('sk-')) {
        return {
          isConfigured: true,
          source: 'supabase',
          needsSetup: false
        };
      }

      // Check environment
      const envKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (envKey && envKey !== 'your-openai-api-key-here' && envKey.startsWith('sk-')) {
        return {
          isConfigured: true,
          source: 'environment',
          needsSetup: false
        };
      }

      return {
        isConfigured: false,
        source: 'none',
        needsSetup: true
      };

    } catch (error) {
      console.error('[OpenAIService] Error checking config status:', error);
      return {
        isConfigured: false,
        source: 'none',
        needsSetup: true
      };
    }
  }

  /**
   * Send a message to OpenAI and get a response
   */
  async sendMessage(
    messages: OpenAIMessage[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      stream?: boolean;
    } = {}
  ): Promise<OpenAIResponse> {
    const startTime = Date.now();
    
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API Key Required - Please configure your OpenAI API key in settings or environment variables');
      }

      const {
        model = this.DEFAULT_MODEL,
        maxTokens = this.DEFAULT_MAX_TOKENS,
        temperature = this.DEFAULT_TEMPERATURE,
        stream = false
      } = options;

      console.log('[OpenAIService] 🚀 Sending request to OpenAI:', {
        model,
        messageCount: messages.length,
        totalTokensEstimate: messages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0),
        stream
      });

      // Make direct OpenAI API call
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: false // Handle streaming separately
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[OpenAIService] ❌ OpenAI API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });

        if (response.status === 401) {
          // Clear cached key on auth error
          this.cachedKey = null;
          this.keyTimestamp = 0;
          throw new Error('Invalid OpenAI API Key - Please check your API key configuration');
        } else if (response.status === 429) {
          throw new Error('OpenAI Rate Limit Exceeded - Please try again in a moment');
        } else if (response.status === 400) {
          throw new Error(`OpenAI Request Error: ${errorData.error?.message || 'Bad request'}`);
        } else {
          throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      const result: OpenAIResponse = {
        content: data.choices?.[0]?.message?.content || '',
        tokens_used: data.usage?.total_tokens || 0,
        model: data.model || model,
        processing_time: processingTime,
        finish_reason: data.choices?.[0]?.finish_reason
      };

      console.log('[OpenAIService] ✅ OpenAI response received:', {
        tokensUsed: result.tokens_used,
        processingTime: result.processing_time,
        responseLength: result.content.length,
        finishReason: result.finish_reason
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('[OpenAIService] ❌ Error in sendMessage:', {
        error: error instanceof Error ? error.message : String(error),
        processingTime
      });
      
      // Re-throw with appropriate context
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`OpenAI Service Error: ${String(error)}`);
      }
    }
  }

  /**
   * Helper method for simple single message requests
   */
  async simpleRequest(
    prompt: string,
    systemPrompt?: string,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    const messages: OpenAIMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await this.sendMessage(messages, options);
    return response.content;
  }

  /**
   * Agent-specific method for thinking/processing
   */
  async agentThink(
    agentId: string,
    prompt: string,
    context?: {
      conversationHistory?: any[];
      systemPrompt?: string;
      capabilities?: string[];
    }
  ): Promise<{
    response: string;
    tokensUsed: number;
    processingTime: number;
  }> {
    try {
      // Build system prompt for the agent
      let systemPrompt = context?.systemPrompt || '';
      
      if (agentId.includes('orchestrator')) {
        systemPrompt = `You are an Orchestrator Agent responsible for managing workflow automation conversations. 
Guide users through workflow creation, ask clarifying questions, and coordinate with specialist agents.
Focus on understanding user requirements and keeping conversations on track for automation building.`;
      } else if (agentId.includes('workflow')) {
        systemPrompt = `You are a Workflow Designer Agent specialized in n8n automation workflows.
You understand n8n nodes, best practices, and can design efficient workflow architectures.
Provide technical guidance on workflow structure and optimization.`;
      } else if (agentId.includes('deployment')) {
        systemPrompt = `You are a Deployment Agent responsible for safely deploying workflows to production.
You handle validation, deployment, testing, and monitoring of automated workflows.
Focus on reliability and error handling.`;
      }

      if (context?.capabilities && context.capabilities.length > 0) {
        systemPrompt += `\n\nAvailable capabilities: ${context.capabilities.join(', ')}`;
      }

      // Include conversation history if available
      const messages: OpenAIMessage[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      // Add conversation history (last 5 messages for context)
      if (context?.conversationHistory && context.conversationHistory.length > 0) {
        const recentHistory = context.conversationHistory.slice(-5);
        recentHistory.forEach(msg => {
          if (msg.role && msg.content) {
            messages.push({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            });
          }
        });
      }

      messages.push({ role: 'user', content: prompt });

      const response = await this.sendMessage(messages, {
        model: 'gpt-3.5-turbo',
        maxTokens: 4000,
        temperature: 0.7
      });

      return {
        response: response.content,
        tokensUsed: response.tokens_used,
        processingTime: response.processing_time || 0
      };

    } catch (error) {
      console.error(`[OpenAIService] ❌ Agent think error for ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Clear cached API key (useful when key changes)
   */
  clearCache(): void {
    this.cachedKey = null;
    this.keyTimestamp = 0;
    console.log('[OpenAIService] 🧹 API key cache cleared');
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
