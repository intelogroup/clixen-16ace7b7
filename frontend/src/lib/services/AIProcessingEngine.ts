/**
 * AI Processing Engine - MVP Implementation
 * 
 * This service implements the complete natural language processing engine
 * according to the Clixen MVP specification:
 * 1. GPT-based processing: parse natural language into intermediate specification
 * 2. Natural-language guidance: proactive clarifying questions and feasibility checks
 * 3. User intent classification and requirement extraction
 * 4. Conversation flow management with context retention
 */

import { openAIService, OpenAIMessage } from './OpenAIService';

export interface UserIntent {
  type: 'workflow_creation' | 'clarification' | 'confirmation' | 'deployment' | 'general';
  confidence: number;
  details: Record<string, any>;
}

export interface RequirementSpec {
  trigger: {
    type: string;
    description: string;
    parameters: Record<string, any>;
  };
  actions: Array<{
    type: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  integrations: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  feasible: boolean;
  issues: string[];
}

export interface ProcessingResult {
  intent: UserIntent;
  specification?: RequirementSpec;
  clarifyingQuestions: string[];
  needsMoreInfo: boolean;
  readyForGeneration: boolean;
  response: string;
  conversationPhase: 'gathering' | 'refining' | 'confirming' | 'generating' | 'deploying';
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  messages: OpenAIMessage[];
  currentSpec?: RequirementSpec;
  userRequirements: Record<string, any>;
  phase: 'gathering' | 'refining' | 'confirming' | 'generating' | 'deploying';
}

export class AIProcessingEngine {
  private readonly SYSTEM_PROMPT = `You are Clixen, an intelligent workflow automation assistant that helps users create n8n workflows through natural conversation.

Your primary role is to:
1. Understand user automation requirements through guided conversation
2. Ask specific, helpful clarifying questions to refine requirements
3. Perform feasibility checks and provide realistic assessments
4. Guide users through the workflow creation process step by step
5. Generate complete workflow specifications when ready

CONVERSATION FLOW PHASES:
- GATHERING: Understanding initial user requirements and intent
- REFINING: Asking clarifying questions to fill gaps in requirements  
- CONFIRMING: Final validation of complete requirements before generation
- GENERATING: Creating the workflow specification
- DEPLOYING: Assisting with deployment and testing

GUIDELINES:
- Ask no more than 2-3 questions per response to avoid overwhelming users
- Be specific about integration requirements (APIs, credentials, data formats)
- Assess feasibility realistically - flag potential issues early
- Keep responses conversational and encouraging
- When requirements are clear and complete, proceed to generation
- Focus on practical, achievable automation scenarios

RESPONSE FORMAT:
Always structure your response with:
1. Acknowledgment of user input
2. Clarifying questions (if needed)
3. Next steps or guidance
4. Encourage user to provide more details

Current phase will be provided in the conversation context.`;

  private readonly INTENT_CLASSIFICATION_PROMPT = `Analyze this user message and classify the intent:

USER MESSAGE: "{message}"

Classify into one of these intents with confidence score (0-1):
1. workflow_creation - User wants to create a new automation/workflow
2. clarification - User is answering questions or providing more details
3. confirmation - User is confirming/approving a proposed solution
4. deployment - User wants to deploy/activate a workflow
5. general - General questions or conversation

Return JSON format:
{
  "type": "intent_type",
  "confidence": 0.85,
  "details": {
    "keywords": ["automation", "trigger"],
    "context_clues": "mentions wanting to automate email notifications"
  }
}`;

  private readonly REQUIREMENT_EXTRACTION_PROMPT = `Extract and structure workflow requirements from the conversation:

CONVERSATION CONTEXT: {context}
LATEST USER MESSAGE: "{message}"

Extract structured requirements covering:
1. TRIGGER: What starts the workflow (webhook, schedule, manual, etc.)
2. ACTIONS: What steps should happen (send email, API calls, data processing, etc.)  
3. INTEGRATIONS: What services/APIs need to be connected
4. DATA FLOW: What information needs to pass between steps
5. CONDITIONS: Any if/then logic or filtering needed

Assess FEASIBILITY:
- Are the required integrations available in n8n?
- Is the data flow realistic?
- Are there potential technical blockers?

Return JSON format:
{
  "trigger": {
    "type": "webhook|cron|manual|email|etc",
    "description": "Clear description",
    "parameters": {"specific": "config"}
  },
  "actions": [
    {
      "type": "http-request|email|slack|etc", 
      "description": "What this step does",
      "parameters": {"required": "settings"}
    }
  ],
  "integrations": ["service1", "service2"],
  "complexity": "simple|moderate|complex",
  "feasible": true,
  "issues": ["potential issue 1", "issue 2"]
}`;

  private readonly CLARIFYING_QUESTIONS_PROMPT = `Based on the current workflow requirements, generate specific clarifying questions to fill gaps:

CURRENT REQUIREMENTS: {requirements}
MISSING INFORMATION: {gaps}

Generate 1-3 specific, actionable questions that will help complete the workflow specification.
Questions should be:
- Specific to the automation domain
- Easy for the user to answer
- Critical for successful implementation
- Focused on one aspect at a time

Format as a simple array:
["Question 1?", "Question 2?", "Question 3?"]`;

  private readonly FEASIBILITY_ASSESSMENT_PROMPT = `Assess the technical feasibility of this workflow specification:

WORKFLOW SPEC: {specification}

Evaluate:
1. N8N NODE AVAILABILITY: Are required nodes available?
2. INTEGRATION COMPLEXITY: How complex are the API integrations?
3. DATA FLOW VIABILITY: Is the data transformation realistic?
4. AUTHENTICATION REQUIREMENTS: What credentials are needed?
5. RATE LIMITS & CONSTRAINTS: Any service limitations to consider?
6. ERROR HANDLING: What could go wrong and how to handle it?

Return assessment with score (0-100) and specific recommendations:
{
  "feasible": true,
  "feasibility_score": 85,
  "assessment": {
    "nodes_available": true,
    "integrations_achievable": true,
    "data_flow_viable": true,
    "auth_manageable": true,
    "constraints_acceptable": true
  },
  "issues": ["Issue 1", "Issue 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "estimated_complexity": "moderate"
}`;

  /**
   * Process natural language input and manage conversation flow
   */
  async processUserInput(
    message: string,
    context: ConversationContext
  ): Promise<ProcessingResult> {
    try {
      console.log('[AIProcessingEngine] Processing user input:', {
        message: message.substring(0, 100),
        phase: context.phase,
        messageCount: context.messages.length
      });

      // Step 1: Classify user intent
      const intent = await this.classifyUserIntent(message, context);
      
      // Step 2: Update conversation context
      context.messages.push({ role: 'user', content: message });
      
      // Step 3: Process based on current phase and intent
      let result: ProcessingResult;
      
      switch (context.phase) {
        case 'gathering':
          result = await this.handleGatheringPhase(message, intent, context);
          break;
        case 'refining':
          result = await this.handleRefiningPhase(message, intent, context);
          break;
        case 'confirming':
          result = await this.handleConfirmingPhase(message, intent, context);
          break;
        case 'generating':
          result = await this.handleGeneratingPhase(message, intent, context);
          break;
        case 'deploying':
          result = await this.handleDeployingPhase(message, intent, context);
          break;
        default:
          result = await this.handleGatheringPhase(message, intent, context);
      }
      
      // Step 4: Update context phase based on result
      context.phase = result.conversationPhase;
      context.messages.push({ role: 'assistant', content: result.response });
      
      return result;
      
    } catch (error) {
      console.error('[AIProcessingEngine] Error processing user input:', error);
      
      return {
        intent: { type: 'general', confidence: 0.5, details: {} },
        clarifyingQuestions: [],
        needsMoreInfo: false,
        readyForGeneration: false,
        response: 'I apologize, but I encountered an error processing your request. Could you please rephrase or try again?',
        conversationPhase: context.phase
      };
    }
  }

  /**
   * Classify user intent using GPT-4
   */
  private async classifyUserIntent(
    message: string,
    context: ConversationContext
  ): Promise<UserIntent> {
    try {
      const prompt = this.INTENT_CLASSIFICATION_PROMPT.replace('{message}', message);
      
      const response = await openAIService.simpleRequest(prompt, '', {
        model: 'gpt-3.5-turbo',
        maxTokens: 200,
        temperature: 0.3
      });

      const intent = JSON.parse(response);
      return {
        type: intent.type || 'general',
        confidence: intent.confidence || 0.5,
        details: intent.details || {}
      };
      
    } catch (error) {
      console.error('[AIProcessingEngine] Error classifying intent:', error);
      return {
        type: 'general',
        confidence: 0.5,
        details: { error: 'Classification failed' }
      };
    }
  }

  /**
   * Extract structured requirements from conversation
   */
  private async extractRequirements(
    message: string,
    context: ConversationContext
  ): Promise<RequirementSpec | null> {
    try {
      const contextSummary = this.summarizeConversationContext(context);
      const prompt = this.REQUIREMENT_EXTRACTION_PROMPT
        .replace('{context}', contextSummary)
        .replace('{message}', message);
      
      const response = await openAIService.simpleRequest(prompt, '', {
        model: 'gpt-4',
        maxTokens: 800,
        temperature: 0.4
      });

      const spec = JSON.parse(response);
      
      // Validate the specification structure
      if (spec.trigger && spec.actions && Array.isArray(spec.actions)) {
        return spec;
      }
      
      return null;
      
    } catch (error) {
      console.error('[AIProcessingEngine] Error extracting requirements:', error);
      return null;
    }
  }

  /**
   * Generate clarifying questions for missing information
   */
  private async generateClarifyingQuestions(
    requirements: RequirementSpec | null,
    context: ConversationContext
  ): Promise<string[]> {
    try {
      if (!requirements) {
        return [
          "What would you like to automate? For example, sending notifications, processing data, or connecting different services?",
          "How would you like this automation to be triggered - by a schedule, webhook, or manual action?"
        ];
      }

      const gaps = this.identifyRequirementGaps(requirements);
      if (gaps.length === 0) return [];

      const prompt = this.CLARIFYING_QUESTIONS_PROMPT
        .replace('{requirements}', JSON.stringify(requirements))
        .replace('{gaps}', gaps.join(', '));
      
      const response = await openAIService.simpleRequest(prompt, '', {
        model: 'gpt-3.5-turbo',
        maxTokens: 300,
        temperature: 0.6
      });

      return JSON.parse(response);
      
    } catch (error) {
      console.error('[AIProcessingEngine] Error generating questions:', error);
      return ["Could you provide more details about what you'd like to automate?"];
    }
  }

  /**
   * Assess workflow feasibility
   */
  async assessFeasibility(specification: RequirementSpec): Promise<{
    feasible: boolean;
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const prompt = this.FEASIBILITY_ASSESSMENT_PROMPT
        .replace('{specification}', JSON.stringify(specification));
      
      const response = await openAIService.simpleRequest(prompt, '', {
        model: 'gpt-4',
        maxTokens: 600,
        temperature: 0.3
      });

      const assessment = JSON.parse(response);
      
      return {
        feasible: assessment.feasible || false,
        score: assessment.feasibility_score || 0,
        issues: assessment.issues || [],
        recommendations: assessment.recommendations || []
      };
      
    } catch (error) {
      console.error('[AIProcessingEngine] Error assessing feasibility:', error);
      return {
        feasible: false,
        score: 0,
        issues: ['Unable to assess feasibility due to processing error'],
        recommendations: ['Please try rephrasing your requirements']
      };
    }
  }

  /**
   * Handle gathering phase - initial requirement collection
   */
  private async handleGatheringPhase(
    message: string,
    intent: UserIntent,
    context: ConversationContext
  ): Promise<ProcessingResult> {
    // Extract requirements from the conversation
    const specification = await this.extractRequirements(message, context);
    
    if (specification) {
      context.currentSpec = specification;
      context.userRequirements = { ...context.userRequirements, ...specification };
    }

    // Generate clarifying questions
    const clarifyingQuestions = await this.generateClarifyingQuestions(specification, context);
    
    // Generate conversational response
    const conversationPrompt = `Based on this user input about workflow automation: "${message}"

The user wants to create an automation workflow. 

${specification ? `Current understanding: ${JSON.stringify(specification)}` : 'Still gathering requirements.'}

${clarifyingQuestions.length > 0 ? `Ask these clarifying questions: ${clarifyingQuestions.join('; ')}` : 'Requirements seem complete.'}

Respond conversationally, acknowledging their request and asking helpful questions to understand their automation needs better. Be encouraging and specific.`;

    const response = await openAIService.simpleRequest(conversationPrompt, this.SYSTEM_PROMPT, {
      model: 'gpt-3.5-turbo',
      maxTokens: 400,
      temperature: 0.7
    });

    const needsMoreInfo = clarifyingQuestions.length > 0 || !specification;
    const readyForGeneration = !needsMoreInfo && specification && this.isSpecificationComplete(specification);

    return {
      intent,
      specification,
      clarifyingQuestions,
      needsMoreInfo,
      readyForGeneration,
      response,
      conversationPhase: readyForGeneration ? 'confirming' : (specification ? 'refining' : 'gathering')
    };
  }

  /**
   * Handle refining phase - asking clarifying questions
   */
  private async handleRefiningPhase(
    message: string,
    intent: UserIntent,
    context: ConversationContext
  ): Promise<ProcessingResult> {
    // Update specification with new information
    const updatedSpec = await this.extractRequirements(message, context);
    
    if (updatedSpec && context.currentSpec) {
      // Merge specifications
      context.currentSpec = this.mergeSpecifications(context.currentSpec, updatedSpec);
    } else if (updatedSpec) {
      context.currentSpec = updatedSpec;
    }

    // Check if we have enough information
    const isComplete = context.currentSpec && this.isSpecificationComplete(context.currentSpec);
    const clarifyingQuestions = isComplete ? [] : await this.generateClarifyingQuestions(context.currentSpec, context);

    const conversationPrompt = `User provided additional details: "${message}"

${context.currentSpec ? `Current workflow understanding: ${JSON.stringify(context.currentSpec)}` : ''}

${isComplete ? 
  'The requirements seem complete now. Summarize what we\'ll build and ask for confirmation.' : 
  `Still need more details. Ask these questions: ${clarifyingQuestions.join('; ')}`
}

Respond conversationally, showing progress and either asking remaining questions or summarizing for confirmation.`;

    const response = await openAIService.simpleRequest(conversationPrompt, this.SYSTEM_PROMPT, {
      model: 'gpt-3.5-turbo',
      maxTokens: 400,
      temperature: 0.7
    });

    return {
      intent,
      specification: context.currentSpec,
      clarifyingQuestions,
      needsMoreInfo: !isComplete,
      readyForGeneration: isComplete,
      response,
      conversationPhase: isComplete ? 'confirming' : 'refining'
    };
  }

  /**
   * Handle confirming phase - final validation before generation
   */
  private async handleConfirmingPhase(
    message: string,
    intent: UserIntent,
    context: ConversationContext
  ): Promise<ProcessingResult> {
    const isConfirmation = intent.type === 'confirmation' || 
      message.toLowerCase().includes('yes') ||
      message.toLowerCase().includes('correct') ||
      message.toLowerCase().includes('proceed') ||
      message.toLowerCase().includes('create');

    if (isConfirmation && context.currentSpec) {
      // Perform final feasibility check
      const feasibility = await this.assessFeasibility(context.currentSpec);
      
      const response = feasibility.feasible ?
        `Perfect! I'll create your workflow now. This will generate the n8n automation based on our conversation.\n\nCreating workflow with:\n- Trigger: ${context.currentSpec.trigger.description}\n- Actions: ${context.currentSpec.actions.map(a => a.description).join(', ')}\n- Integrations: ${context.currentSpec.integrations.join(', ')}\n\nGenerating your automation...` :
        `I've identified some potential issues with this workflow:\n\n${feasibility.issues.join('\n')}\n\nRecommendations:\n${feasibility.recommendations.join('\n')}\n\nWould you like to adjust the requirements or proceed anyway?`;

      return {
        intent,
        specification: context.currentSpec,
        clarifyingQuestions: [],
        needsMoreInfo: false,
        readyForGeneration: feasibility.feasible,
        response,
        conversationPhase: feasibility.feasible ? 'generating' : 'refining'
      };
    } else {
      // User wants to modify something
      return this.handleRefiningPhase(message, intent, context);
    }
  }

  /**
   * Handle generating phase - workflow is being created
   */
  private async handleGeneratingPhase(
    message: string,
    intent: UserIntent,
    context: ConversationContext
  ): Promise<ProcessingResult> {
    const response = `Your workflow is being generated! The system is creating the n8n automation based on our conversation. You'll see the deployment options once generation is complete.

In the meantime, you can ask me about:
- How the workflow will function
- What credentials you'll need to set up
- Testing and monitoring options
- Making future modifications

What would you like to know about your automation?`;

    return {
      intent,
      specification: context.currentSpec,
      clarifyingQuestions: [],
      needsMoreInfo: false,
      readyForGeneration: false,
      response,
      conversationPhase: 'deploying'
    };
  }

  /**
   * Handle deploying phase - workflow deployment assistance
   */
  private async handleDeployingPhase(
    message: string,
    intent: UserIntent,
    context: ConversationContext
  ): Promise<ProcessingResult> {
    if (intent.type === 'deployment') {
      const response = `Ready to deploy your workflow! Here's what will happen:

1. The workflow will be activated in your n8n instance
2. All connections and credentials will be validated
3. You'll receive confirmation once it's live
4. I'll provide webhook URLs and testing instructions

Click "Deploy" when you're ready, or ask me any questions about the deployment process.`;

      return {
        intent,
        specification: context.currentSpec,
        clarifyingQuestions: [],
        needsMoreInfo: false,
        readyForGeneration: true,
        response,
        conversationPhase: 'deploying'
      };
    }

    const response = `Your workflow is ready for deployment! I can help with:

- Explaining how the automation works
- Setting up required credentials
- Testing the workflow before going live
- Monitoring and troubleshooting
- Making adjustments or improvements

What would you like to know about your automation?`;

    return {
      intent,
      specification: context.currentSpec,
      clarifyingQuestions: [],
      needsMoreInfo: false,
      readyForGeneration: false,
      response,
      conversationPhase: 'deploying'
    };
  }

  // Helper methods

  private summarizeConversationContext(context: ConversationContext): string {
    const recentMessages = context.messages.slice(-6);
    return recentMessages.map(m => `${m.role}: ${m.content}`).join('\n');
  }

  private identifyRequirementGaps(spec: RequirementSpec): string[] {
    const gaps: string[] = [];
    
    if (!spec.trigger.type || spec.trigger.type === 'unknown') {
      gaps.push('trigger_mechanism');
    }
    
    if (spec.actions.length === 0) {
      gaps.push('workflow_actions');
    }
    
    if (spec.integrations.length === 0) {
      gaps.push('service_integrations');
    }
    
    if (spec.actions.some(action => !action.parameters || Object.keys(action.parameters).length === 0)) {
      gaps.push('action_parameters');
    }
    
    return gaps;
  }

  private isSpecificationComplete(spec: RequirementSpec): boolean {
    return (
      spec.trigger.type && 
      spec.trigger.type !== 'unknown' &&
      spec.actions.length > 0 &&
      spec.integrations.length > 0 &&
      spec.actions.every(action => action.type && action.description)
    );
  }

  private mergeSpecifications(existing: RequirementSpec, update: RequirementSpec): RequirementSpec {
    return {
      trigger: update.trigger.type !== 'unknown' ? update.trigger : existing.trigger,
      actions: [...existing.actions, ...update.actions.filter(newAction => 
        !existing.actions.some(existingAction => existingAction.type === newAction.type)
      )],
      integrations: [...new Set([...existing.integrations, ...update.integrations])],
      complexity: update.complexity !== 'simple' ? update.complexity : existing.complexity,
      feasible: existing.feasible && update.feasible,
      issues: [...existing.issues, ...update.issues]
    };
  }
}

// Export singleton instance
export const aiProcessingEngine = new AIProcessingEngine();