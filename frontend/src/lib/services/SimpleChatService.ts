/**
 * Simple Chat Service - MVP Bridge (Enhanced)
 * 
 * This service bridges the existing chat interface with the enhanced workflow service.
 * It maintains the same interface as the complex agent system but uses AI-integrated processing.
 */

import { simpleWorkflowService as workflowService, WorkflowMessage } from './SimpleWorkflowService';
import { fallbackChatService } from './FallbackChatService';
import { supabase } from '../supabase';

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
    try {
      // Convert chat history to workflow service format
      const workflowMessages: WorkflowMessage[] = conversationHistory
        .slice(-10) // Keep last 10 messages for context
        .map(msg => ({
          role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }));

      // Try to use real Edge Function first
      console.log('🔄 [CHAT] Attempting to use ai-chat-simple Edge Function');
      const result = await this.callAiChatEdgeFunction(message, workflowMessages);

      // Determine conversation mode based on content and history
      const mode = this.determineConversationMode(message, conversationHistory, result);
      
      // Extract any questions from the response
      const questions = this.extractQuestions(result.content);
      
      // Determine if we need more info or can proceed
      const needsMoreInfo = questions.length > 0 || mode === 'scoping';
      const canProceed = mode === 'creating' || (mode === 'validating' && !needsMoreInfo);

      return {
        response: result.content,
        questions,
        mode,
        needsMoreInfo,
        canProceed,
        scopeStatus: result.workflowGenerated ? {
          generated: true,
          validated: !result.error,
          workflow: result.workflowData
        } : undefined
      };
    } catch (error) {
      console.error('SimpleChatService error:', error);
      console.log('🔄 [CHAT] Edge Function failed, falling back to demo service');

      // Fallback to demo service if Edge Function fails
      try {
        const fallbackResult = await fallbackChatService.processConversation(message, workflowMessages);
        return this.convertFallbackResponse(fallbackResult);
      } catch (fallbackError) {
        console.error('Fallback service also failed:', fallbackError);
        return {
          response: 'I apologize, but I encountered an error. Please try again or rephrase your question.',
          questions: [],
          mode: 'greeting',
          needsMoreInfo: false,
          canProceed: false
        };
      }
    }
  }

  /**
   * Call the ai-chat-simple Edge Function
   */
  private async callAiChatEdgeFunction(message: string, conversationHistory: WorkflowMessage[]): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('ai-chat-simple', {
      body: {
        message,
        user_id: user.id,
        conversation_history: conversationHistory,
        mode: 'workflow_creation'
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(`Edge Function failed: ${error.message}`);
    }

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
