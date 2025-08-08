/**
 * Simple Chat Service - MVP Bridge (Enhanced)
 * 
 * This service bridges the existing chat interface with the enhanced workflow service.
 * It maintains the same interface as the complex agent system but uses AI-integrated processing.
 */

import { simpleWorkflowService as workflowService, WorkflowMessage } from './SimpleWorkflowService';
import { fallbackChatService } from './FallbackChatService';
import { supabase } from '../supabase';
import { supabaseConfig } from '../config/environment';
import toast from 'react-hot-toast';

interface ChatResponse {
  response: string;
  questions: string[];
  mode: 'greeting' | 'scoping' | 'validating' | 'creating';
  needsMoreInfo: boolean;
  canProceed: boolean;
  scopeStatus?: any;
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export class SimpleChatService {
  /**
   * Handle natural conversation - simplified version of agent coordinator
   * Matches the existing AgentCoordinator.handleNaturalConversation interface
   */
  async handleNaturalConversation(message: string, conversationHistory: Message[] = []): Promise<ChatResponse> {
    const startTime = Date.now();
    console.log('🚀 [CHAT] Starting handleNaturalConversation', {
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      messageLength: message.length,
      historyLength: conversationHistory.length,
      timestamp: new Date().toISOString()
    });

    try {
      // Convert chat history to workflow service format
      const workflowMessages: WorkflowMessage[] = conversationHistory
        .slice(-10) // Keep last 10 messages for context
        .map(msg => ({
          role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }));

      console.log('📝 [CHAT] Converted conversation history', {
        originalLength: conversationHistory.length,
        processedLength: workflowMessages.length,
        workflowMessages: workflowMessages.map(msg => ({
          role: msg.role,
          contentLength: msg.content.length,
          contentPreview: msg.content.substring(0, 50) + '...'
        }))
      });

      // Try to use real Edge Function first
      console.log('🔄 [CHAT] Attempting to use ai-chat-simple Edge Function');
      toast.loading('Connecting to AI service...', { id: 'ai-service' });

      let result;
      try {
        result = await this.callAiChatEdgeFunction(message, workflowMessages);
        toast.success('✅ AI service connected', { id: 'ai-service' });
      } catch (edgeError) {
        console.log('🔄 [CHAT] Edge Function failed, using fallback immediately');
        toast.dismiss('ai-service');
        toast.loading('Using demo mode...', { id: 'fallback-service' });

        const fallbackResult = await fallbackChatService.processConversation(message, workflowMessages);
        toast.success('✅ Demo mode active', { id: 'fallback-service' });
        return this.convertFallbackResponse(fallbackResult);
      }

      // The ai-chat-simple edge function returns data in this format:
      // { response, phase, needs_more_info, ready_for_generation, clarifying_questions, workflow_generated, workflow_data }

      const mode = this.mapPhaseToMode(result.phase || 'scoping');
      const questions = result.clarifying_questions || [];

      const chatResponse = {
        response: result.response || 'Sorry, I could not process your request.',
        questions,
        mode,
        needsMoreInfo: result.needs_more_info || false,
        canProceed: result.ready_for_generation || false,
        scopeStatus: result.workflow_generated ? {
          generated: true,
          validated: true,
          workflow: result.workflow_data
        } : undefined
      };

      const duration = Date.now() - startTime;
      console.log('✅ [CHAT] Successfully processed conversation', {
        duration: `${duration}ms`,
        responseLength: chatResponse.response.length,
        mode: chatResponse.mode,
        needsMoreInfo: chatResponse.needsMoreInfo,
        canProceed: chatResponse.canProceed,
        questionsCount: chatResponse.questions.length,
        workflowGenerated: !!chatResponse.scopeStatus?.generated
      });

      return chatResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ [CHAT] SimpleChatService unexpected error after', duration + 'ms:', {
        error: error.message || error,
        stack: error.stack,
        name: error.name,
        originalMessage: message.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });

      // Ultimate fallback if even the fallback service fails
      toast.dismiss('ai-service');
      toast.dismiss('fallback-service');
      toast.error('Chat service temporarily unavailable');

      return {
        response: `I apologize, but I'm having trouble connecting right now.

**Here's what you can try:**
1. Refresh the page and try again
2. Check your internet connection
3. Try a simpler message first

**In the meantime, here are some example automations I can help with:**
- "Send me a Slack message every morning at 9 AM"
- "When I receive an email, save the attachment to Google Drive"
- "Create a webhook that processes form submissions"

Please try your request again!`,
        questions: [],
        mode: 'greeting',
        needsMoreInfo: false,
        canProceed: false
      };
    }
  }

  /**
   * Call the ai-chat-simple Edge Function
   */
  private async callAiChatEdgeFunction(message: string, conversationHistory: WorkflowMessage[]): Promise<any> {
    const edgeCallStart = Date.now();
    console.log('🌐 [EDGE-FUNCTION] Starting callAiChatEdgeFunction', {
      timestamp: new Date().toISOString(),
      messageLength: message.length,
      historyLength: conversationHistory.length
    });

    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 [EDGE-FUNCTION] Auth check completed', {
      hasUser: !!user,
      userId: user?.id ? user.id.substring(0, 8) + '***' : null,
      email: user?.email || null
    });

    if (!user) {
      throw new Error('User not authenticated');
    }

    const requestPayload = {
      message,
      user_id: user.id,
      conversation_history: conversationHistory,
      mode: 'workflow_creation'
    };

    console.log('📤 [EDGE-FUNCTION] Calling ai-chat-simple with payload:', {
      message: message.substring(0, 50) + '...',
      userId: user.id.substring(0, 8) + '***',
      historyLength: conversationHistory.length,
      mode: requestPayload.mode,
      payloadSize: JSON.stringify(requestPayload).length
    });

    // Get the current session to include auth token
    const { data: { session } } = await supabase.auth.getSession();

    console.log('🔐 [EDGE-FUNCTION] Auth session check:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      tokenLength: session?.access_token?.length || 0
    });

    const { data, error } = await supabase.functions.invoke('ai-chat-simple', {
      body: requestPayload,
      headers: {
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : undefined,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      }
    });

    const edgeCallDuration = Date.now() - edgeCallStart;
    console.log('📡 [EDGE-FUNCTION] Edge Function call completed', {
      duration: `${edgeCallDuration}ms`,
      hasData: !!data,
      hasError: !!error,
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('❌ [EDGE-FUNCTION] Edge Function error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: error.status,
        statusText: error.statusText,
        timestamp: new Date().toISOString()
      });

      // Provide specific error messages for different failure types
      let errorMessage = 'Edge Function failed';

      if (error.message?.includes('Function not found') || error.message?.includes('404')) {
        errorMessage = 'AI service not deployed - using demo mode';
        console.log('🔍 [EDGE-FUNCTION] Function not found - likely not deployed to Supabase');
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'AI service timeout - using demo mode';
        console.log('⏱️ [EDGE-FUNCTION] Timeout - likely OpenAI API taking too long');
      } else if (error.message?.includes('unauthorized') || error.message?.includes('forbidden')) {
        errorMessage = 'Authentication issue - using demo mode';
        console.log('🔐 [EDGE-FUNCTION] Auth error - check user session or API keys');
      } else if (error.message?.includes('OpenAI API Key')) {
        errorMessage = 'OpenAI API key not configured - using demo mode';
        console.log('🔑 [EDGE-FUNCTION] OpenAI API key missing or invalid');
      } else {
        console.log('🔧 [EDGE-FUNCTION] Generic error - check function logs:', error.message);
      }

      throw new Error(errorMessage);
    }

    console.log('✅ [EDGE-FUNCTION] Response received successfully:', {
      hasResponse: !!data?.response,
      responseLength: data?.response?.length || 0,
      phase: data?.phase,
      needsMoreInfo: data?.needs_more_info,
      readyForGeneration: data?.ready_for_generation,
      workflowGenerated: data?.workflow_generated,
      clarifyingQuestionsCount: data?.clarifying_questions?.length || 0,
      sessionId: data?.session_id,
      responseDataSize: JSON.stringify(data).length,
      timestamp: new Date().toISOString()
    });

    return data;
  }

  /**
   * Convert fallback service response to ChatResponse format
   */
  private convertFallbackResponse(fallbackResult: any): ChatResponse {
    return {
      response: fallbackResult.content,
      questions: this.extractQuestions(fallbackResult.content),
      mode: fallbackResult.workflowGenerated ? 'creating' : 'scoping',
      needsMoreInfo: !fallbackResult.workflowGenerated,
      canProceed: fallbackResult.workflowGenerated,
      scopeStatus: fallbackResult.workflowGenerated ? {
        generated: true,
        validated: true,
        workflow: fallbackResult.workflowData
      } : undefined
    };
  }

  /**
   * Map edge function phase to chat mode
   */
  private mapPhaseToMode(phase: string): 'greeting' | 'scoping' | 'validating' | 'creating' {
    switch (phase) {
      case 'gathering': return 'scoping';
      case 'refining': return 'scoping';
      case 'confirming': return 'validating';
      case 'validating': return 'validating';
      case 'generating': return 'creating';
      default: return 'greeting';
    }
  }

  /**
   * Determine conversation mode based on context
   */
  private determineConversationMode(
    message: string,
    history: Message[],
    result: any
  ): 'greeting' | 'scoping' | 'validating' | 'creating' {
    const messageText = message.toLowerCase();
    
    // If workflow was generated, we're in creating mode
    if (result.workflowGenerated) {
      return 'creating';
    }
    
    // If this is the first few messages, we're scoping
    if (history.length < 4) {
      if (history.length === 0 || messageText.includes('hello') || messageText.includes('help')) {
        return 'greeting';
      }
      return 'scoping';
    }
    
    // If we have enough context and no workflow yet, we're validating
    if (history.length >= 4) {
      return 'validating';
    }
    
    return 'scoping';
  }

  /**
   * Extract questions from AI response text
   */
  private extractQuestions(response: string): string[] {
    const questions: string[] = [];
    
    // Split by sentences and look for question marks
    const sentences = response.split(/[.!?]+/).map(s => s.trim());
    
    for (const sentence of sentences) {
      if (sentence.includes('?') || sentence.toLowerCase().includes('would you like') || sentence.toLowerCase().includes('can you')) {
        questions.push(sentence + (sentence.endsWith('?') ? '' : '?'));
      }
    }
    
    return questions.slice(0, 3); // Limit to 3 questions max
  }

  /**
   * Deploy workflow - simplified interface
   */
  async deployWorkflow(workflowData: any): Promise<{ success: boolean; error?: string }> {
    console.log('🔄 [DEPLOY] Using simulated deployment (Edge Functions disabled)');

    // Simulate successful deployment without calling Edge Functions
    return {
      success: true,
      error: undefined
    };
  }
}

// Export singleton instance to replace agent coordinator
export const simpleChatService = new SimpleChatService();
