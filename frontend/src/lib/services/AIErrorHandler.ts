/**
 * AI Error Handler - MVP Implementation
 * 
 * This service provides intelligent error handling for the AI integration system:
 * 1. Auto-correction of minor specification errors
 * 2. Retry logic with progressive fallback strategies  
 * 3. User-friendly error explanations and recovery suggestions
 * 4. Learning from previous errors for improvement
 * 5. Context-aware error analysis and resolution
 */

import { openAIService } from './OpenAIService';
import { RequirementSpec } from './AIProcessingEngine';
import { N8nWorkflow } from './WorkflowGenerationEngine';
import { ValidationResult } from './AIValidationEngine';

export interface ErrorContext {
  operation: 'intent_classification' | 'requirement_extraction' | 'workflow_generation' | 'validation' | 'deployment';
  phase: 'gathering' | 'refining' | 'confirming' | 'generating' | 'deploying';
  userInput: string;
  errorType: string;
  errorMessage: string;
  attemptNumber: number;
  previousAttempts: ErrorAttempt[];
  sessionContext?: any;
}

export interface ErrorAttempt {
  strategy: string;
  parameters: Record<string, any>;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface ErrorRecoveryResult {
  success: boolean;
  correctedInput?: any;
  alternativeStrategy?: string;
  userExplanation: string;
  suggestions: string[];
  shouldRetry: boolean;
  fallbackResponse?: string;
}

export interface ErrorPattern {
  pattern: string;
  frequency: number;
  commonCauses: string[];
  solutions: string[];
  userGuidance: string;
}

export class AIErrorHandler {
  private errorPatterns = new Map<string, ErrorPattern>();
  private maxRetryAttempts = 3;
  
  private readonly ERROR_ANALYSIS_PROMPT = `Analyze this AI processing error and suggest recovery strategies:

ERROR CONTEXT:
- Operation: {operation}
- Phase: {phase}
- User Input: "{userInput}"
- Error Type: {errorType}
- Error Message: {errorMessage}
- Attempt: {attemptNumber}/{maxAttempts}

Previous Attempts: {previousAttempts}

Analyze:
1. **Root Cause**: What likely caused this error?
2. **Severity**: How critical is this error? (low/medium/high)
3. **Auto-Correction**: Can this be automatically fixed?
4. **Recovery Strategy**: What's the best way to recover?
5. **User Communication**: How should we explain this to the user?

Provide recovery recommendations:

Return JSON:
{
  "root_cause": "Specific cause of the error",
  "severity": "medium",
  "auto_correctable": true,
  "recovery_strategy": "retry_with_modification",
  "corrections": {
    "field": "corrected_value"
  },
  "alternative_approach": "fallback_method",
  "user_explanation": "User-friendly explanation",
  "prevention_tips": ["tip1", "tip2"],
  "retry_recommended": true
}`;

  private readonly AUTO_CORRECTION_PROMPT = `Attempt to auto-correct this specification or input:

ORIGINAL INPUT: {originalInput}
ERROR DETAILS: {errorDetails}
CORRECTION CONTEXT: {context}

Apply these correction strategies:
1. **Format Issues**: Fix JSON structure, syntax, or formatting
2. **Missing Fields**: Add required fields with reasonable defaults
3. **Invalid Values**: Replace with valid alternatives
4. **Type Mismatches**: Convert to correct data types
5. **Logical Errors**: Fix workflow logic inconsistencies

Return corrected version or indicate if auto-correction isn't possible:

{
  "correctable": true,
  "corrected_input": { /* corrected version */ },
  "corrections_made": ["Fixed JSON syntax", "Added missing trigger type"],
  "confidence": 0.85
}`;

  private readonly USER_GUIDANCE_PROMPT = `Generate user-friendly guidance for this error situation:

ERROR CONTEXT: {errorContext}
USER SKILL LEVEL: {skillLevel} (beginner/intermediate/advanced)

Create helpful guidance that:
1. Explains what went wrong in simple terms
2. Provides specific steps to fix the issue
3. Offers alternative approaches if available
4. Includes prevention tips for the future
5. Maintains encouraging tone

Focus on actionable advice the user can implement immediately.

Return:
{
  "explanation": "Clear explanation of what happened",
  "immediate_steps": ["step 1", "step 2"],
  "alternatives": ["alternative approach 1"],
  "prevention_tips": ["tip 1", "tip 2"],
  "encouragement": "Encouraging message to keep user motivated"
}`;

  /**
   * Handle errors with intelligent recovery strategies
   */
  async handleError(context: ErrorContext): Promise<ErrorRecoveryResult> {
    console.log(`[AIErrorHandler] Handling ${context.operation} error (attempt ${context.attemptNumber})`);

    try {
      // Update error patterns for learning
      this.updateErrorPatterns(context);

      // Analyze error and determine strategy
      const analysis = await this.analyzeError(context);

      // Attempt auto-correction if possible
      if (analysis.auto_correctable && context.attemptNumber <= this.maxRetryAttempts) {
        const correctionResult = await this.attemptAutoCorrection(context, analysis);
        
        if (correctionResult.success) {
          return {
            success: true,
            correctedInput: correctionResult.correctedInput,
            userExplanation: `I've automatically corrected a minor issue: ${correctionResult.description}`,
            suggestions: correctionResult.suggestions,
            shouldRetry: true
          };
        }
      }

      // Try alternative strategy
      if (analysis.alternative_approach && context.attemptNumber <= this.maxRetryAttempts) {
        const alternativeResult = await this.tryAlternativeStrategy(context, analysis.alternative_approach);
        
        if (alternativeResult.success) {
          return {
            success: true,
            alternativeStrategy: analysis.alternative_approach,
            userExplanation: alternativeResult.explanation,
            suggestions: alternativeResult.suggestions,
            shouldRetry: true
          };
        }
      }

      // Generate user guidance for manual resolution
      const userGuidance = await this.generateUserGuidance(context, analysis);

      // Provide fallback response if all else fails
      const fallbackResponse = this.generateFallbackResponse(context);

      return {
        success: false,
        userExplanation: userGuidance.explanation,
        suggestions: [
          ...userGuidance.immediate_steps,
          ...userGuidance.alternatives,
          ...userGuidance.prevention_tips
        ],
        shouldRetry: context.attemptNumber < this.maxRetryAttempts && analysis.retry_recommended,
        fallbackResponse
      };

    } catch (handlerError) {
      console.error('[AIErrorHandler] Error in error handler:', handlerError);
      
      return {
        success: false,
        userExplanation: 'I encountered an unexpected error while processing your request.',
        suggestions: [
          'Please try rephrasing your request',
          'Check that all required information is provided',
          'Contact support if the issue persists'
        ],
        shouldRetry: false,
        fallbackResponse: this.generateFallbackResponse(context)
      };
    }
  }

  /**
   * Auto-correct common errors in specifications
   */
  async autoCorrectSpecification(
    specification: RequirementSpec,
    validationResult: ValidationResult
  ): Promise<{
    corrected: boolean;
    correctedSpec?: RequirementSpec;
    corrections: string[];
  }> {
    if (validationResult.isValid) {
      return { corrected: false, corrections: [] };
    }

    const corrections: string[] = [];
    let correctedSpec = { ...specification };
    let hasCorrected = false;

    try {
      // Auto-correct trigger issues
      if (!correctedSpec.trigger.type || correctedSpec.trigger.type === 'unknown') {
        correctedSpec.trigger.type = 'webhook';
        correctedSpec.trigger.description = correctedSpec.trigger.description || 'HTTP webhook trigger';
        corrections.push('Set default trigger type to webhook');
        hasCorrected = true;
      }

      // Auto-correct empty actions
      if (correctedSpec.actions.length === 0) {
        correctedSpec.actions.push({
          type: 'http_request',
          description: 'Process the received data',
          parameters: { method: 'POST' }
        });
        corrections.push('Added default processing action');
        hasCorrected = true;
      }

      // Auto-correct missing integrations
      if (correctedSpec.integrations.length === 0) {
        const inferredIntegrations = this.inferIntegrations(correctedSpec);
        correctedSpec.integrations = inferredIntegrations;
        if (inferredIntegrations.length > 0) {
          corrections.push(`Inferred integrations: ${inferredIntegrations.join(', ')}`);
          hasCorrected = true;
        }
      }

      // Auto-correct complexity assessment
      if (!correctedSpec.complexity) {
        correctedSpec.complexity = this.assessComplexity(correctedSpec);
        corrections.push(`Set complexity level to ${correctedSpec.complexity}`);
        hasCorrected = true;
      }

      // Fix feasibility issues
      if (!correctedSpec.feasible) {
        correctedSpec.feasible = correctedSpec.issues.length === 0;
        if (correctedSpec.feasible) {
          corrections.push('Updated feasibility status');
          hasCorrected = true;
        }
      }

      return {
        corrected: hasCorrected,
        correctedSpec: hasCorrected ? correctedSpec : undefined,
        corrections
      };

    } catch (error) {
      console.error('[AIErrorHandler] Error auto-correcting specification:', error);
      return { corrected: false, corrections: [] };
    }
  }

  /**
   * Handle workflow generation errors with recovery strategies
   */
  async handleWorkflowGenerationError(
    specification: RequirementSpec,
    error: Error,
    attemptNumber: number
  ): Promise<{
    shouldRetry: boolean;
    modifiedSpec?: RequirementSpec;
    fallbackStrategy?: string;
    userMessage: string;
  }> {
    console.log(`[AIErrorHandler] Handling workflow generation error (attempt ${attemptNumber})`);

    if (attemptNumber >= this.maxRetryAttempts) {
      return {
        shouldRetry: false,
        userMessage: 'I\'ve tried multiple approaches but cannot generate this workflow. Please try simplifying your requirements or contact support.',
        fallbackStrategy: 'manual_fallback'
      };
    }

    // Try different strategies based on error type
    if (error.message.includes('JSON') || error.message.includes('parse')) {
      return {
        shouldRetry: true,
        modifiedSpec: this.simplifySpecification(specification),
        userMessage: 'I\'ll try generating a simpler version of your workflow.',
        fallbackStrategy: 'simplified_generation'
      };
    }

    if (error.message.includes('node') || error.message.includes('connection')) {
      return {
        shouldRetry: true,
        modifiedSpec: this.useAlternativeNodes(specification),
        userMessage: 'I\'ll try using alternative nodes for better compatibility.',
        fallbackStrategy: 'alternative_nodes'
      };
    }

    if (error.message.includes('timeout') || error.message.includes('rate')) {
      return {
        shouldRetry: true,
        userMessage: 'I\'ll retry the generation with adjusted parameters.',
        fallbackStrategy: 'retry_with_delay'
      };
    }

    return {
      shouldRetry: true,
      modifiedSpec: this.simplifySpecification(specification),
      userMessage: 'I\'ll try a different approach to generate your workflow.',
      fallbackStrategy: 'generic_retry'
    };
  }

  /**
   * Get user-friendly error explanations
   */
  getErrorExplanation(error: Error, context: string): string {
    const errorExplanations: Record<string, string> = {
      'timeout': 'The request took too long to process. This might be due to high server load or a complex request.',
      'rate_limit': 'We\'ve hit a rate limit with the AI service. Please wait a moment before trying again.',
      'json_parse': 'There was an issue parsing the response format. The system will retry automatically.',
      'validation': 'The generated workflow didn\'t pass validation checks. I\'ll try a different approach.',
      'authentication': 'There\'s an authentication issue with the AI service. Please check your API key configuration.',
      'network': 'Unable to connect to the AI service. Please check your internet connection.',
      'quota': 'The AI service usage quota has been exceeded. Please try again later or upgrade your plan.'
    };

    const errorType = this.categorizeError(error);
    const explanation = errorExplanations[errorType];
    
    if (explanation) {
      return `${explanation} Context: ${context}`;
    }

    return `An unexpected error occurred during ${context}. I'll try alternative approaches to complete your request.`;
  }

  // Private helper methods

  private async analyzeError(context: ErrorContext): Promise<any> {
    try {
      const prompt = this.ERROR_ANALYSIS_PROMPT
        .replace('{operation}', context.operation)
        .replace('{phase}', context.phase)
        .replace('{userInput}', context.userInput)
        .replace('{errorType}', context.errorType)
        .replace('{errorMessage}', context.errorMessage)
        .replace('{attemptNumber}', context.attemptNumber.toString())
        .replace('{maxAttempts}', this.maxRetryAttempts.toString())
        .replace('{previousAttempts}', JSON.stringify(context.previousAttempts));

      const response = await openAIService.simpleRequest(prompt, '', {
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.3
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('[AIErrorHandler] Error analyzing error:', error);
      return {
        root_cause: 'Unknown',
        severity: 'medium',
        auto_correctable: false,
        recovery_strategy: 'manual_intervention',
        retry_recommended: context.attemptNumber < this.maxRetryAttempts
      };
    }
  }

  private async attemptAutoCorrection(context: ErrorContext, analysis: any): Promise<{
    success: boolean;
    correctedInput?: any;
    description: string;
    suggestions: string[];
  }> {
    try {
      const prompt = this.AUTO_CORRECTION_PROMPT
        .replace('{originalInput}', context.userInput)
        .replace('{errorDetails}', context.errorMessage)
        .replace('{context}', JSON.stringify(context.sessionContext || {}));

      const response = await openAIService.simpleRequest(prompt, '', {
        model: 'gpt-4',
        maxTokens: 600,
        temperature: 0.2
      });

      const result = JSON.parse(response);
      
      if (result.correctable && result.confidence > 0.7) {
        return {
          success: true,
          correctedInput: result.corrected_input,
          description: result.corrections_made.join(', '),
          suggestions: ['The correction has been applied automatically', 'You can continue with your workflow creation']
        };
      }

      return {
        success: false,
        description: 'Auto-correction not possible for this error',
        suggestions: ['Manual intervention required']
      };

    } catch (error) {
      console.error('[AIErrorHandler] Error in auto-correction:', error);
      return {
        success: false,
        description: 'Auto-correction failed',
        suggestions: ['Please try a different approach']
      };
    }
  }

  private async tryAlternativeStrategy(context: ErrorContext, strategy: string): Promise<{
    success: boolean;
    explanation: string;
    suggestions: string[];
  }> {
    // Implement different strategies based on the context
    switch (strategy) {
      case 'simplified_approach':
        return {
          success: true,
          explanation: 'I\'ll use a simpler approach to process your request',
          suggestions: ['The system will try with reduced complexity', 'Some advanced features may be simplified']
        };
        
      case 'alternative_model':
        return {
          success: true,
          explanation: 'I\'ll try using a different AI model for better results',
          suggestions: ['Using alternative processing method', 'Results may vary slightly']
        };
        
      case 'fallback_generation':
        return {
          success: true,
          explanation: 'I\'ll use a template-based approach for more reliable results',
          suggestions: ['Using proven workflow templates', 'Customization will be applied after generation']
        };
        
      default:
        return {
          success: false,
          explanation: 'No alternative strategy available',
          suggestions: ['Manual intervention required']
        };
    }
  }

  private async generateUserGuidance(context: ErrorContext, analysis: any): Promise<{
    explanation: string;
    immediate_steps: string[];
    alternatives: string[];
    prevention_tips: string[];
    encouragement: string;
  }> {
    try {
      const prompt = this.USER_GUIDANCE_PROMPT
        .replace('{errorContext}', JSON.stringify(context))
        .replace('{skillLevel}', 'beginner');

      const response = await openAIService.simpleRequest(prompt, '', {
        model: 'gpt-3.5-turbo',
        maxTokens: 400,
        temperature: 0.6
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('[AIErrorHandler] Error generating user guidance:', error);
      return {
        explanation: 'An error occurred while processing your request.',
        immediate_steps: ['Try rephrasing your request', 'Provide more specific details'],
        alternatives: ['Use simpler language', 'Break down complex requests into smaller parts'],
        prevention_tips: ['Be specific about your automation requirements'],
        encouragement: 'Don\'t worry! These issues are common and we can work through them together.'
      };
    }
  }

  private generateFallbackResponse(context: ErrorContext): string {
    const fallbackResponses: Record<string, string> = {
      'intent_classification': 'I\'m having trouble understanding what you\'d like to automate. Could you describe your automation goal in simple terms?',
      'requirement_extraction': 'I need a bit more information to create your workflow. What should trigger the automation, and what actions should it perform?',
      'workflow_generation': 'I\'m having difficulty generating the workflow. Let\'s start with a simpler version - what\'s the main thing you want to automate?',
      'validation': 'The workflow needs some adjustments. Would you like me to suggest some modifications to make it work better?',
      'deployment': 'There\'s an issue with deploying the workflow. Let\'s review the configuration and try again.'
    };

    return fallbackResponses[context.operation] || 
      'I encountered an issue processing your request. Let\'s try a different approach - could you describe what you\'d like to automate in simple terms?';
  }

  private updateErrorPatterns(context: ErrorContext): void {
    const patternKey = `${context.operation}:${context.errorType}`;
    const existing = this.errorPatterns.get(patternKey);
    
    if (existing) {
      existing.frequency++;
    } else {
      this.errorPatterns.set(patternKey, {
        pattern: patternKey,
        frequency: 1,
        commonCauses: [context.errorMessage],
        solutions: [],
        userGuidance: ''
      });
    }
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('rate') || message.includes('limit')) return 'rate_limit';
    if (message.includes('json') || message.includes('parse')) return 'json_parse';
    if (message.includes('validation')) return 'validation';
    if (message.includes('auth') || message.includes('401')) return 'authentication';
    if (message.includes('network') || message.includes('fetch')) return 'network';
    if (message.includes('quota') || message.includes('billing')) return 'quota';
    
    return 'unknown';
  }

  private inferIntegrations(spec: RequirementSpec): string[] {
    const integrations: string[] = [];
    
    // Infer from actions
    spec.actions.forEach(action => {
      if (action.type.includes('slack')) integrations.push('slack');
      if (action.type.includes('email')) integrations.push('email');
      if (action.type.includes('http')) integrations.push('webhook');
      if (action.type.includes('sheets')) integrations.push('google_sheets');
    });

    // Infer from description content
    const description = `${spec.trigger.description} ${spec.actions.map(a => a.description).join(' ')}`.toLowerCase();
    
    if (description.includes('slack')) integrations.push('slack');
    if (description.includes('email')) integrations.push('email');
    if (description.includes('google')) integrations.push('google_sheets');
    if (description.includes('github')) integrations.push('github');

    return [...new Set(integrations)];
  }

  private assessComplexity(spec: RequirementSpec): 'simple' | 'moderate' | 'complex' {
    let complexity = 0;
    
    if (spec.actions.length > 3) complexity += 2;
    else if (spec.actions.length > 1) complexity += 1;
    
    if (spec.integrations.length > 2) complexity += 2;
    else if (spec.integrations.length > 0) complexity += 1;
    
    if (spec.issues.length > 0) complexity += 1;
    
    if (complexity <= 1) return 'simple';
    if (complexity <= 3) return 'moderate';
    return 'complex';
  }

  private simplifySpecification(spec: RequirementSpec): RequirementSpec {
    return {
      ...spec,
      actions: spec.actions.slice(0, 2), // Limit to first 2 actions
      complexity: 'simple',
      integrations: spec.integrations.slice(0, 1) // Limit to 1 integration
    };
  }

  private useAlternativeNodes(spec: RequirementSpec): RequirementSpec {
    const alternatives: Record<string, string> = {
      'sms': 'http_request',
      'ftp': 'http_request',
      'database': 'webhook'
    };

    return {
      ...spec,
      actions: spec.actions.map(action => ({
        ...action,
        type: alternatives[action.type] || action.type
      }))
    };
  }
}

// Export singleton instance
export const aiErrorHandler = new AIErrorHandler();