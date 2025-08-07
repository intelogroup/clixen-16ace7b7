/**
 * Conversation Manager - MVP Implementation
 * 
 * This service manages the complete interactive conversation system:
 * 1. Proactive clarifying question generation
 * 2. Feasibility assessment and requirement validation  
 * 3. User confirmation flows before workflow generation
 * 4. Context retention across conversation turns
 * 5. Conversation state management and persistence
 */

import { aiProcessingEngine, ConversationContext, ProcessingResult } from './AIProcessingEngine';
import { workflowGenerationEngine, GenerationResult } from './WorkflowGenerationEngine';
import { supabase } from '../supabase';

export interface ConversationSession {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  phase: 'gathering' | 'refining' | 'confirming' | 'generating' | 'deploying' | 'completed';
  context: ConversationContext;
  workflowGenerated: boolean;
  workflowId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationResponse {
  sessionId: string;
  response: string;
  phase: 'gathering' | 'refining' | 'confirming' | 'generating' | 'deploying' | 'completed';
  clarifyingQuestions: string[];
  needsMoreInfo: boolean;
  readyForGeneration: boolean;
  workflowGenerated: boolean;
  workflowData?: any;
  suggestions: string[];
  progress: {
    requirements_gathered: number;
    specification_complete: number;
    validation_passed: number;
    generation_ready: number;
  };
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    intent?: string;
    questions?: string[];
    phase?: string;
    workflowData?: any;
  };
  timestamp: Date;
}

export class ConversationManager {
  private activeSessions = new Map<string, ConversationSession>();
  
  /**
   * Start a new conversation session
   */
  async startConversation(
    userId: string, 
    projectId?: string,
    initialMessage?: string
  ): Promise<ConversationResponse> {
    try {
      console.log('[ConversationManager] Starting new conversation for user:', userId);

      // Create new session
      const sessionId = crypto.randomUUID();
      const context: ConversationContext = {
        userId,
        sessionId,
        messages: [],
        userRequirements: {},
        phase: 'gathering'
      };

      const session: ConversationSession = {
        id: sessionId,
        userId,
        projectId,
        title: initialMessage ? this.generateSessionTitle(initialMessage) : 'New Workflow',
        phase: 'gathering',
        context,
        workflowGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store session in memory
      this.activeSessions.set(sessionId, session);

      // Persist session to database
      await this.persistSession(session);

      // Process initial message if provided
      if (initialMessage) {
        return await this.processMessage(sessionId, initialMessage);
      }

      // Return welcome message
      const welcomeResponse: ConversationResponse = {
        sessionId,
        response: "Hello! I'm Clixen, your intelligent workflow automation assistant.\n\nI can help you create sophisticated automations by simply describing what you want to achieve. From simple task connections to complex multi-step workflows—I'll handle the technical details while you focus on your business logic.\n\nWhat process would you like to automate?",
        phase: 'gathering',
        clarifyingQuestions: [],
        needsMoreInfo: true,
        readyForGeneration: false,
        workflowGenerated: false,
        suggestions: [
          "Send email notifications when forms are submitted",
          "Create Slack alerts for important business events", 
          "Automatically organize and backup documents",
          "Sync calendar events from project updates"
        ],
        progress: {
          requirements_gathered: 0,
          specification_complete: 0,
          validation_passed: 0,
          generation_ready: 0
        }
      };

      // Store welcome message
      await this.storeMessage(sessionId, 'assistant', welcomeResponse.response, {
        phase: 'gathering',
        questions: []
      });

      return welcomeResponse;

    } catch (error) {
      console.error('[ConversationManager] Error starting conversation:', error);
      throw new Error('Failed to start conversation session');
    }
  }

  /**
   * Process user message within existing conversation
   */
  async processMessage(sessionId: string, message: string): Promise<ConversationResponse> {
    try {
      console.log('[ConversationManager] Processing message for session:', sessionId);

      // Get session
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Conversation session not found');
      }

      // Store user message
      await this.storeMessage(sessionId, 'user', message);

      // Process message with AI engine
      const result = await aiProcessingEngine.processUserInput(message, session.context);

      // Update session
      session.phase = result.conversationPhase;
      session.updatedAt = new Date();
      this.activeSessions.set(sessionId, session);

      // Handle workflow generation if ready
      let workflowData: any = undefined;
      let workflowGenerated = false;
      
      if (result.readyForGeneration && result.specification && session.phase === 'generating') {
        console.log('[ConversationManager] Generating workflow...');
        
        try {
          const generationResult = await workflowGenerationEngine.generateWorkflow(result.specification);
          
          if (generationResult.success && generationResult.workflow) {
            workflowData = generationResult.workflow;
            workflowGenerated = true;
            session.workflowGenerated = true;
            
            // Update response to include workflow generation success
            result.response += '\n\n🎉 **Workflow Generated Successfully!**\n\n' +
              `Your "${generationResult.workflow.name}" workflow has been created and is ready for deployment.\n\n` +
              `**Complexity**: ${generationResult.estimatedComplexity}\n` +
              `**Nodes**: ${generationResult.workflow.nodes.length} automation steps\n` +
              `**Required Credentials**: ${generationResult.requiredCredentials.join(', ') || 'None'}\n\n` +
              'Click "Deploy" to activate your workflow, or ask me any questions about how it works!';
          } else {
            result.response += '\n\n⚠️ **Workflow Generation Issue**\n\n' +
              `There was an issue generating your workflow: ${generationResult.error}\n\n` +
              'Let me know if you\'d like to adjust the requirements or try a different approach.';
          }
        } catch (genError) {
          console.error('[ConversationManager] Workflow generation error:', genError);
          result.response += '\n\n❌ **Generation Error**\n\n' +
            'I encountered an error while generating your workflow. Please try rephrasing your requirements or contact support if the issue persists.';
        }
      }

      // Store assistant response
      await this.storeMessage(sessionId, 'assistant', result.response, {
        intent: result.intent.type,
        questions: result.clarifyingQuestions,
        phase: result.conversationPhase,
        workflowData: workflowData
      });

      // Update session in database
      await this.persistSession(session);

      // Calculate progress
      const progress = this.calculateProgress(session, result);

      const response: ConversationResponse = {
        sessionId,
        response: result.response,
        phase: result.conversationPhase,
        clarifyingQuestions: result.clarifyingQuestions,
        needsMoreInfo: result.needsMoreInfo,
        readyForGeneration: result.readyForGeneration,
        workflowGenerated,
        workflowData,
        suggestions: this.generateSuggestions(result, session),
        progress
      };

      return response;

    } catch (error) {
      console.error('[ConversationManager] Error processing message:', error);
      
      return {
        sessionId,
        response: 'I apologize, but I encountered an error processing your message. Please try again or rephrase your request.',
        phase: 'gathering',
        clarifyingQuestions: [],
        needsMoreInfo: false,
        readyForGeneration: false,
        workflowGenerated: false,
        suggestions: [],
        progress: {
          requirements_gathered: 0,
          specification_complete: 0,
          validation_passed: 0,
          generation_ready: 0
        }
      };
    }
  }

  /**
   * Get conversation session
   */
  async getSession(sessionId: string): Promise<ConversationSession | null> {
    // Check memory cache first
    if (this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!;
    }

    // Load from database
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return null;
      }

      // Reconstruct session object
      const session: ConversationSession = {
        id: data.id,
        userId: data.user_id,
        projectId: data.project_id,
        title: data.title,
        phase: data.phase || 'gathering',
        context: JSON.parse(data.messages || '{}'),
        workflowGenerated: data.workflow_generated || false,
        workflowId: data.workflow_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      // Cache in memory
      this.activeSessions.set(sessionId, session);

      return session;
      
    } catch (error) {
      console.error('[ConversationManager] Error loading session:', error);
      return null;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string): Promise<ConversationMessage[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ConversationManager] Error loading history:', error);
        return [];
      }

      return data.map(msg => ({
        id: msg.id,
        sessionId: msg.session_id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata || {},
        timestamp: new Date(msg.created_at)
      }));

    } catch (error) {
      console.error('[ConversationManager] Error loading conversation history:', error);
      return [];
    }
  }

  /**
   * List user conversation sessions
   */
  async getUserConversations(userId: string, limit = 20): Promise<ConversationSession[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[ConversationManager] Error loading user conversations:', error);
        return [];
      }

      return data.map(conv => ({
        id: conv.id,
        userId: conv.user_id,
        projectId: conv.project_id,
        title: conv.title,
        phase: conv.phase || 'gathering',
        context: JSON.parse(conv.messages || '{}'),
        workflowGenerated: conv.workflow_generated || false,
        workflowId: conv.workflow_id,
        createdAt: new Date(conv.created_at),
        updatedAt: new Date(conv.updated_at)
      }));

    } catch (error) {
      console.error('[ConversationManager] Error loading user conversations:', error);
      return [];
    }
  }

  /**
   * Delete conversation session
   */
  async deleteConversation(sessionId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) {
        console.error('[ConversationManager] Error deleting conversation:', error);
        return false;
      }

      // Remove from memory cache
      this.activeSessions.delete(sessionId);

      return true;
      
    } catch (error) {
      console.error('[ConversationManager] Error deleting conversation:', error);
      return false;
    }
  }

  /**
   * Reset conversation to start fresh
   */
  async resetConversation(sessionId: string): Promise<ConversationResponse> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Reset session state
    session.phase = 'gathering';
    session.context.messages = [];
    session.context.userRequirements = {};
    session.context.currentSpec = undefined;
    session.workflowGenerated = false;
    session.workflowId = undefined;
    session.updatedAt = new Date();

    // Update in memory and database
    this.activeSessions.set(sessionId, session);
    await this.persistSession(session);

    return {
      sessionId,
      response: "I've reset our conversation. Let's start fresh!\n\nWhat workflow or automation would you like to create?",
      phase: 'gathering',
      clarifyingQuestions: [],
      needsMoreInfo: true,
      readyForGeneration: false,
      workflowGenerated: false,
      suggestions: [
        "Automate email notifications",
        "Create data synchronization workflows",
        "Set up monitoring and alerting",
        "Build API integrations"
      ],
      progress: {
        requirements_gathered: 0,
        specification_complete: 0,
        validation_passed: 0,
        generation_ready: 0
      }
    };
  }

  // Private helper methods

  private async persistSession(session: ConversationSession): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .upsert({
          id: session.id,
          user_id: session.userId,
          project_id: session.projectId,
          title: session.title,
          phase: session.phase,
          messages: JSON.stringify(session.context),
          workflow_generated: session.workflowGenerated,
          workflow_id: session.workflowId,
          status: 'active',
          created_at: session.createdAt.toISOString(),
          updated_at: session.updatedAt.toISOString()
        });

      if (error) {
        console.error('[ConversationManager] Error persisting session:', error);
      }
      
    } catch (error) {
      console.error('[ConversationManager] Error persisting session:', error);
    }
  }

  private async storeMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          session_id: sessionId,
          role,
          content,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('[ConversationManager] Error storing message:', error);
      }
      
    } catch (error) {
      console.error('[ConversationManager] Error storing message:', error);
    }
  }

  private generateSessionTitle(message: string): string {
    const words = message.split(' ').slice(0, 6);
    return words.join(' ') + (message.split(' ').length > 6 ? '...' : '');
  }

  private calculateProgress(
    session: ConversationSession,
    result: ProcessingResult
  ): {
    requirements_gathered: number;
    specification_complete: number;
    validation_passed: number;
    generation_ready: number;
  } {
    let requirementsGathered = 0;
    let specificationComplete = 0;
    let validationPassed = 0;
    let generationReady = 0;

    // Requirements gathering progress
    if (result.specification) {
      requirementsGathered = 40;
      if (result.specification.trigger.type && result.specification.trigger.type !== 'unknown') {
        requirementsGathered += 20;
      }
      if (result.specification.actions.length > 0) {
        requirementsGathered += 20;
      }
      if (result.specification.integrations.length > 0) {
        requirementsGathered += 20;
      }
    }

    // Specification completeness
    if (result.specification && result.clarifyingQuestions.length === 0) {
      specificationComplete = 100;
    } else if (result.specification) {
      specificationComplete = Math.max(0, 100 - (result.clarifyingQuestions.length * 25));
    }

    // Validation passed
    if (result.specification && result.specification.feasible) {
      validationPassed = 100;
    } else if (result.specification) {
      validationPassed = result.specification.issues.length === 0 ? 100 : 50;
    }

    // Generation readiness
    if (result.readyForGeneration) {
      generationReady = 100;
    } else if (session.phase === 'confirming') {
      generationReady = 80;
    } else if (session.phase === 'refining') {
      generationReady = 40;
    }

    return {
      requirements_gathered: requirementsGathered,
      specification_complete: specificationComplete,
      validation_passed: validationPassed,
      generation_ready: generationReady
    };
  }

  private generateSuggestions(
    result: ProcessingResult,
    session: ConversationSession
  ): string[] {
    const suggestions: string[] = [];

    if (session.phase === 'gathering') {
      suggestions.push(
        "Be specific about what triggers the automation",
        "Mention which services you want to connect",
        "Describe the data that flows between steps"
      );
    } else if (session.phase === 'refining') {
      if (result.clarifyingQuestions.length > 0) {
        suggestions.push("Answer the clarifying questions above for better results");
      }
      suggestions.push("Provide specific examples if helpful");
    } else if (session.phase === 'confirming') {
      suggestions.push(
        "Say 'yes' or 'proceed' to generate the workflow",
        "Request changes if something doesn't look right"
      );
    } else if (session.phase === 'generating' || session.phase === 'deploying') {
      suggestions.push(
        "Ask about required credentials",
        "Inquire about testing the workflow",
        "Learn about monitoring and troubleshooting"
      );
    }

    return suggestions;
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager();