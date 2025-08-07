/**
 * Simple Workflow Service - MVP Implementation
 * 
 * This service follows the MVP specification exactly:
 * 1. GPT-based processing: parse natural language into workflow spec
 * 2. n8n JSON generator: map spec to n8n-compatible workflow
 * 3. n8n REST API integration: deploy workflows
 * 
 * NO multi-agent orchestration (explicitly out-of-scope per MVP spec)
 */

import { supabase } from '../supabase';

export interface WorkflowMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface WorkflowResponse {
  content: string;
  workflowGenerated?: boolean;
  workflowData?: any;
  error?: string;
}

export class SimpleWorkflowService {
  /**
   * Handle natural conversation and workflow generation
   * Following MVP spec: GPT-based processing with feasibility checks
   */
  async processConversation(
    userMessage: string,
    conversationHistory: WorkflowMessage[] = []
  ): Promise<WorkflowResponse> {
    try {
      // Prepare conversation context for GPT
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

      // Call ai-chat-system (the primary function as per current implementation)
      const { data, error } = await supabase.functions.invoke('ai-chat-system', {
        body: {
          messages,
          mode: 'workflow_creation',
          generateWorkflow: this.shouldGenerateWorkflow(userMessage, conversationHistory)
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to process request');
      }

      // Parse response
      const response = data as WorkflowResponse;
      
      // If workflow was generated, validate and prepare for deployment
      if (response.workflowGenerated && response.workflowData) {
        response.workflowData = await this.validateWorkflow(response.workflowData);
      }

      return response;
    } catch (error) {
      console.error('SimpleWorkflowService error:', error);
      return {
        content: 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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
   * Validate workflow JSON before deployment
   * Following MVP spec: n8n MCP validation
   */
  private async validateWorkflow(workflowData: any): Promise<any> {
    try {
      // TODO: Implement n8n MCP validation once MCP server is properly configured
      // For now, basic JSON structure validation
      if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
        throw new Error('Invalid workflow: missing nodes array');
      }

      if (!workflowData.connections || typeof workflowData.connections !== 'object') {
        throw new Error('Invalid workflow: missing connections object');
      }

      // Ensure required workflow metadata
      if (!workflowData.name) {
        workflowData.name = `Clixen Workflow ${new Date().toISOString().slice(0, 10)}`;
      }

      if (!workflowData.active) {
        workflowData.active = false; // Don't activate automatically
      }

      return workflowData;
    } catch (error) {
      console.error('Workflow validation error:', error);
      throw error;
    }
  }

  /**
   * Deploy workflow to n8n instance
   * Following MVP spec: n8n REST API integration
   */
  async deployWorkflow(workflowData: any, projectId?: string): Promise<{ success: boolean; workflowId?: string; error?: string }> {
    try {
      // Validate before deployment
      const validatedWorkflow = await this.validateWorkflow(workflowData);

      // Call api-operations function to handle n8n deployment
      const { data, error } = await supabase.functions.invoke('api-operations', {
        body: {
          action: 'deploy_workflow',
          workflow: validatedWorkflow,
          projectId
        }
      });

      if (error) {
        throw new Error(error.message || 'Deployment failed');
      }

      return {
        success: true,
        workflowId: data.workflowId
      };
    } catch (error) {
      console.error('Workflow deployment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed'
      };
    }
  }

  /**
   * Save workflow to project database
   * Following MVP spec: Supabase persistence
   */
  async saveWorkflow(workflowData: any, conversationHistory: WorkflowMessage[], projectId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // TODO: Implement proper workflow saving to Supabase
      // This would integrate with the project management system
      console.log('Saving workflow:', { workflowData, projectId, userId: user.id });
      
      return { success: true };
    } catch (error) {
      console.error('Save workflow error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const simpleWorkflowService = new SimpleWorkflowService();