/**
 * Enhanced Simple Workflow Service - MVP Implementation
 * 
 * This service follows the MVP specification exactly with full AI integration:
 * 1. GPT-based processing: parse natural language into workflow spec
 * 2. n8n JSON generator: map spec to n8n-compatible workflow
 * 3. n8n REST API integration: deploy workflows
 * 4. Intelligent conversation management and validation
 * 
 * Integrates all AI components: Processing Engine, Generation Engine, 
 * Validation Engine, Error Handler, and Conversation Manager
 */

import { supabase } from '../supabase';
import { conversationManager, ConversationResponse } from './ConversationManager';
import { workflowGenerationEngine, GenerationResult } from './WorkflowGenerationEngine';
import { aiValidationEngine } from './AIValidationEngine';
import { aiErrorHandler } from './AIErrorHandler';

export interface WorkflowMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface WorkflowResponse {
  content: string;
  sessionId?: string;
  phase: 'gathering' | 'refining' | 'confirming' | 'generating' | 'deploying' | 'completed';
  workflowGenerated?: boolean;
  workflowData?: any;
  clarifyingQuestions?: string[];
  needsMoreInfo?: boolean;
  readyForGeneration?: boolean;
  suggestions?: string[];
  progress?: {
    requirements_gathered: number;
    specification_complete: number;
    validation_passed: number;
    generation_ready: number;
  };
  error?: string;
}

export class EnhancedSimpleWorkflowService {
  /**
   * Handle natural conversation and workflow generation
   * Following MVP spec: GPT-based processing with comprehensive AI integration
   */
  async processConversation(
    userMessage: string,
    conversationHistory: WorkflowMessage[] = [],
    userId?: string,
    sessionId?: string
  ): Promise<WorkflowResponse> {
    try {
      console.log('[EnhancedSimpleWorkflowService] Processing conversation with AI integration');

      let conversationResponse: ConversationResponse;

      if (sessionId) {
        // Continue existing conversation
        conversationResponse = await conversationManager.processMessage(sessionId, userMessage);
      } else if (userId) {
        // Start new conversation
        conversationResponse = await conversationManager.startConversation(
          userId,
          undefined, // projectId can be added later
          userMessage
        );
      } else {
        // Fallback to legacy processing
        return await this.processLegacyConversation(userMessage, conversationHistory);
      }

      // Convert conversation response to workflow response format
      const response: WorkflowResponse = {
        content: conversationResponse.response,
        sessionId: conversationResponse.sessionId,
        phase: conversationResponse.phase,
        workflowGenerated: conversationResponse.workflowGenerated,
        workflowData: conversationResponse.workflowData,
        clarifyingQuestions: conversationResponse.clarifyingQuestions,
        needsMoreInfo: conversationResponse.needsMoreInfo,
        readyForGeneration: conversationResponse.readyForGeneration,
        suggestions: conversationResponse.suggestions,
        progress: conversationResponse.progress
      };

      // If workflow was generated, perform additional validation
      if (response.workflowGenerated && response.workflowData) {
        const validationResult = await aiValidationEngine.validateWorkflow(response.workflowData);
        
        if (!validationResult.isValid) {
          // Try auto-correction if validation fails
          const correctionResult = await aiErrorHandler.autoCorrectSpecification(
            response.workflowData, 
            validationResult
          );
          
          if (correctionResult.corrected && correctionResult.correctedSpec) {
            response.workflowData = correctionResult.correctedSpec;
            response.content += `\n\n🔧 **Auto-Corrections Applied**: ${correctionResult.corrections.join(', ')}`;
          } else {
            response.content += `\n\n⚠️ **Validation Issues**: ${validationResult.issues.map(i => i.message).join(', ')}`;
          }
        }
      }

      return response;
      
    } catch (error) {
      console.error('[EnhancedSimpleWorkflowService] Error processing conversation:', error);
      
      // Use AI error handler for intelligent error recovery
      const errorContext = {
        operation: 'workflow_generation' as const,
        phase: 'gathering' as const,
        userInput: userMessage,
        errorType: error.name || 'UnknownError',
        errorMessage: error.message || 'Unknown error occurred',
        attemptNumber: 1,
        previousAttempts: []
      };
      
      const recoveryResult = await aiErrorHandler.handleError(errorContext);
      
      return {
        content: recoveryResult.userExplanation,
        phase: 'gathering',
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: recoveryResult.suggestions
      };
    }
  }

  /**
   * Legacy conversation processing for backward compatibility
   */
  private async processLegacyConversation(
    userMessage: string,
    conversationHistory: WorkflowMessage[]
  ): Promise<WorkflowResponse> {
    try {
      // Prepare conversation context for direct Edge Function call
      const messages: WorkflowMessage[] = [
        {
          role: 'system',
          content: `You are Clixen, a workflow automation assistant that helps users create n8n workflows using natural language.

Your role is to:
1. Understand user automation requirements through conversation
2. Ask clarifying questions for feasibility checks  
3. Generate valid n8n workflow JSON when requirements are clear
4. Provide helpful guidance and error handling

Keep conversations natural and focused on automation needs. When you have enough information, generate the n8n workflow.

Current conversation context: This is a workflow creation session.`
        },
        ...conversationHistory,
        {
          role: 'user', 
          content: userMessage
        }
      ];

      // Call simplified ai-chat-system function
      const { data, error } = await supabase.functions.invoke('ai-chat-system', {
        body: {
          message: userMessage,
          user_id: 'legacy-user', // Placeholder for legacy mode
          mode: 'simple_workflow_creation'
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to process request');
      }

      return {
        content: data.response || 'I understand your request and will help create your automation.',
        phase: 'gathering',
        workflowGenerated: !!data.workflowData,
        workflowData: data.workflowData
      };
      
    } catch (error) {
      throw error; // Re-throw for parent error handling
    }
  }

  /**
   * Simple heuristic to determine if we should attempt workflow generation
   * Based on conversation context and user intent signals
   */
  private shouldGenerateWorkflow(userMessage: string, history: WorkflowMessage[]): boolean {
    const workflowKeywords = [
      'create', 'generate', 'build', 'make', 'deploy', 'workflow',
      'automation', 'trigger', 'when', 'then', 'if', 'send', 'connect'
    ];
    
    const confirmationKeywords = [
      'yes', 'correct', 'right', 'good', 'proceed', 'deploy', 'create it'
    ];

    const message = userMessage.toLowerCase();
    
    // Check if user is confirming workflow creation
    if (confirmationKeywords.some(keyword => message.includes(keyword)) && history.length > 2) {
      return true;
    }

    // Check if user is describing an automation
    const hasWorkflowKeywords = workflowKeywords.some(keyword => message.includes(keyword));
    const hasEnoughContext = history.length >= 2; // Had some back-and-forth
    
    return hasWorkflowKeywords && hasEnoughContext;
  }

  /**
   * Enhanced workflow validation using AI validation engine
   * Following MVP spec: comprehensive n8n validation with AI assistance
   */
  private async validateWorkflow(workflowData: any): Promise<any> {
    try {
      console.log('[EnhancedSimpleWorkflowService] Validating workflow with AI engine');
      
      // Use AI validation engine for comprehensive validation
      const validationResult = await aiValidationEngine.validateWorkflow(workflowData);
      
      if (!validationResult.isValid) {
        // Log validation issues but don't fail completely
        console.warn('[EnhancedSimpleWorkflowService] Workflow validation issues:', {
          issues: validationResult.issues,
          warnings: validationResult.warnings
        });
        
        // Try auto-correction for minor issues
        const correctionResult = await aiErrorHandler.autoCorrectSpecification(
          workflowData,
          validationResult
        );
        
        if (correctionResult.corrected && correctionResult.correctedSpec) {
          console.log('[EnhancedSimpleWorkflowService] Applied auto-corrections:', correctionResult.corrections);
          workflowData = correctionResult.correctedSpec;
        }
      }

      // Ensure required workflow metadata
      if (!workflowData.name) {
        workflowData.name = `Clixen Workflow ${new Date().toISOString().slice(0, 10)}`;
      }

      if (workflowData.active === undefined) {
        workflowData.active = false; // Don't activate automatically
      }

      // Add AI-generated metadata
      workflowData.meta = {
        ...workflowData.meta,
        validationScore: validationResult.feasibilityScore,
        aiGenerated: true,
        validatedAt: new Date().toISOString(),
        requiredCredentials: validationResult.requiredCredentials.map(c => c.service)
      };

      return workflowData;
    } catch (error) {
      console.error('[EnhancedSimpleWorkflowService] Workflow validation error:', error);
      
      // Use error handler for intelligent recovery
      const errorExplanation = aiErrorHandler.getErrorExplanation(
        error instanceof Error ? error : new Error('Validation failed'),
        'workflow validation'
      );
      
      console.error('[EnhancedSimpleWorkflowService] Validation error explanation:', errorExplanation);
      throw error;
    }
  }

  /**
   * Deploy workflow to n8n instance with intelligent error handling
   * Following MVP spec: n8n REST API integration with AI assistance
   */
  async deployWorkflow(
    workflowData: any, 
    projectId?: string, 
    userId?: string
  ): Promise<{ success: boolean; workflowId?: string; error?: string; warnings?: string[] }> {
    let attemptNumber = 1;
    const maxAttempts = 3;
    
    while (attemptNumber <= maxAttempts) {
      try {
        console.log(`[EnhancedSimpleWorkflowService] Deploying workflow (attempt ${attemptNumber})`);
        
        // Validate before deployment
        const validatedWorkflow = await this.validateWorkflow(workflowData);

        // Call api-operations function to handle n8n deployment
        const { data, error } = await supabase.functions.invoke('api-operations', {
          body: {
            action: 'deploy_workflow',
            workflow: validatedWorkflow,
            projectId,
            userId
          }
        });

        if (error) {
          throw new Error(error.message || 'Deployment failed');
        }

        console.log('[EnhancedSimpleWorkflowService] Deployment successful:', data.workflowId);
        
        return {
          success: true,
          workflowId: data.workflowId,
          warnings: data.warnings || []
        };
        
      } catch (error) {
        console.error(`[EnhancedSimpleWorkflowService] Deployment attempt ${attemptNumber} failed:`, error);
        
        // Use AI error handler to determine retry strategy
        const errorContext = {
          operation: 'deployment' as const,
          phase: 'deploying' as const,
          userInput: JSON.stringify(workflowData),
          errorType: error.name || 'DeploymentError',
          errorMessage: error.message || 'Unknown deployment error',
          attemptNumber,
          previousAttempts: []
        };
        
        const recoveryResult = await aiErrorHandler.handleError(errorContext);
        
        if (recoveryResult.shouldRetry && attemptNumber < maxAttempts) {
          attemptNumber++;
          
          // Apply corrections if available
          if (recoveryResult.correctedInput) {
            workflowData = recoveryResult.correctedInput;
          }
          
          console.log(`[EnhancedSimpleWorkflowService] Retrying deployment with AI guidance: ${recoveryResult.userExplanation}`);
          continue;
        }
        
        // Final failure - return error with AI explanation
        return {
          success: false,
          error: recoveryResult.userExplanation || (error instanceof Error ? error.message : 'Deployment failed')
        };
      }
    }
    
    return {
      success: false,
      error: 'Deployment failed after maximum retry attempts'
    };
  }

  /**
   * Save workflow to project database with enhanced metadata
   * Following MVP spec: Supabase persistence with AI-generated insights
   */
  async saveWorkflow(
    workflowData: any, 
    conversationHistory: WorkflowMessage[], 
    projectId?: string,
    sessionId?: string
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[EnhancedSimpleWorkflowService] Saving workflow with enhanced metadata');
      
      // Validate workflow before saving
      const validationResult = await aiValidationEngine.validateWorkflow(workflowData);
      
      // Prepare workflow record with AI insights
      const workflowRecord = {
        user_id: user.id,
        project_id: projectId,
        session_id: sessionId,
        name: workflowData.name,
        workflow_data: workflowData,
        conversation_history: conversationHistory,
        ai_metadata: {
          feasibilityScore: validationResult.feasibilityScore,
          complexity: this.assessComplexityFromWorkflow(workflowData),
          requiredCredentials: validationResult.requiredCredentials.map(c => c.service),
          estimatedExecutionTime: validationResult.performanceAnalysis.estimatedExecutionTime,
          securityScore: validationResult.securityAnalysis.securityScore,
          generatedAt: new Date().toISOString(),
          validationIssues: validationResult.issues.length,
          warnings: validationResult.warnings.length
        },
        status: 'created',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Save to workflows table
      const { data, error } = await supabase
        .from('workflows')
        .insert(workflowRecord)
        .select('id')
        .single();
      
      if (error) {
        throw new Error(`Failed to save workflow: ${error.message}`);
      }
      
      console.log('[EnhancedSimpleWorkflowService] Workflow saved successfully:', data.id);
      
      return { 
        success: true, 
        workflowId: data.id,
        validationScore: validationResult.feasibilityScore
      };
      
    } catch (error) {
      console.error('[EnhancedSimpleWorkflowService] Save workflow error:', error);
      
      // Use AI error handler for user-friendly error explanation
      const errorExplanation = aiErrorHandler.getErrorExplanation(
        error instanceof Error ? error : new Error('Save failed'),
        'workflow saving'
      );
      
      throw new Error(errorExplanation);
    }
  }
  
  /**
   * Assess workflow complexity from generated workflow data
   */
  private assessComplexityFromWorkflow(workflowData: any): 'simple' | 'moderate' | 'complex' {
    if (!workflowData.nodes) return 'simple';
    
    const nodeCount = workflowData.nodes.length;
    const hasConditionals = workflowData.nodes.some(node => 
      node.type.includes('if') || node.type.includes('switch')
    );
    const hasMultipleIntegrations = new Set(
      workflowData.nodes.map(node => node.type.split('.')[0])
    ).size > 2;
    
    if (nodeCount <= 3 && !hasConditionals) return 'simple';
    if (nodeCount <= 6 && !hasMultipleIntegrations) return 'moderate';
    return 'complex';
  }

  /**
   * Get conversation session for continuation
   */
  async getConversationSession(sessionId: string, userId: string) {
    try {
      const session = await conversationManager.getSession(sessionId);
      
      if (!session || session.userId !== userId) {
        throw new Error('Session not found or access denied');
      }
      
      return session;
    } catch (error) {
      console.error('[EnhancedSimpleWorkflowService] Error getting conversation session:', error);
      throw error;
    }
  }
  
  /**
   * List user's conversation sessions
   */
  async getUserConversations(userId: string, limit = 20) {
    try {
      return await conversationManager.getUserConversations(userId, limit);
    } catch (error) {
      console.error('[EnhancedSimpleWorkflowService] Error getting user conversations:', error);
      throw error;
    }
  }
  
  /**
   * Reset conversation session
   */
  async resetConversation(sessionId: string, userId: string) {
    try {
      const session = await conversationManager.getSession(sessionId);
      
      if (!session || session.userId !== userId) {
        throw new Error('Session not found or access denied');
      }
      
      return await conversationManager.resetConversation(sessionId);
    } catch (error) {
      console.error('[EnhancedSimpleWorkflowService] Error resetting conversation:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedSimpleWorkflowService = new EnhancedSimpleWorkflowService();