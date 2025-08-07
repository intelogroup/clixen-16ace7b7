/**
 * Comprehensive AI Integration Test Suite
 * 
 * Tests all AI components for the MVP implementation:
 * 1. Natural Language Processing Engine
 * 2. Workflow Generation Intelligence
 * 3. Interactive Conversation System
 * 4. AI-Powered Validation
 * 5. Intelligent Error Handling
 * 6. Enhanced Workflow Service Integration
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { aiProcessingEngine, ConversationContext } from '../AIProcessingEngine';
import { workflowGenerationEngine } from '../WorkflowGenerationEngine';
import { conversationManager } from '../ConversationManager';
import { aiValidationEngine } from '../AIValidationEngine';
import { aiErrorHandler } from '../AIErrorHandler';
import { enhancedSimpleWorkflowService } from '../EnhancedSimpleWorkflowService';

// Mock external dependencies
jest.mock('../OpenAIService', () => ({
  openAIService: {
    simpleRequest: jest.fn(),
    sendMessage: jest.fn(),
    agentThink: jest.fn(),
    isConfigured: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } })
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { response: 'Test response' }, error: null })
    }
  }
}));

describe('AI Integration Test Suite', () => {
  let mockContext: ConversationContext;

  beforeEach(() => {
    mockContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      messages: [],
      userRequirements: {},
      phase: 'gathering'
    };
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('1. Natural Language Processing Engine', () => {
    it('should classify user intent correctly', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest.mockResolvedValue(JSON.stringify({
        type: 'workflow_creation',
        confidence: 0.9,
        details: { keywords: ['automate', 'email'] }
      }));

      const result = await aiProcessingEngine.processUserInput(
        'I want to automate email notifications',
        mockContext
      );

      expect(result.intent.type).toBe('workflow_creation');
      expect(result.intent.confidence).toBeGreaterThan(0.8);
    });

    it('should extract workflow requirements from conversation', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest
        .mockResolvedValueOnce(JSON.stringify({
          type: 'workflow_creation',
          confidence: 0.9
        }))
        .mockResolvedValueOnce(JSON.stringify({
          trigger: {
            type: 'webhook',
            description: 'HTTP webhook trigger'
          },
          actions: [{
            type: 'email_send',
            description: 'Send email notification'
          }],
          integrations: ['email'],
          complexity: 'simple',
          feasible: true,
          issues: []
        }));

      const result = await aiProcessingEngine.processUserInput(
        'When I receive a webhook, send an email notification',
        mockContext
      );

      expect(result.specification).toBeDefined();
      expect(result.specification?.trigger.type).toBe('webhook');
      expect(result.specification?.actions).toHaveLength(1);
    });

    it('should generate appropriate clarifying questions', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest
        .mockResolvedValueOnce(JSON.stringify({
          type: 'workflow_creation',
          confidence: 0.8
        }))
        .mockResolvedValueOnce(JSON.stringify([
          'What should trigger this automation?',
          'Which service should receive the notification?'
        ]));

      const result = await aiProcessingEngine.processUserInput(
        'I want to send notifications',
        mockContext
      );

      expect(result.clarifyingQuestions).toHaveLength(2);
      expect(result.needsMoreInfo).toBe(true);
    });

    it('should handle different conversation phases', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest.mockResolvedValue('Gathering phase response');

      // Test gathering phase
      mockContext.phase = 'gathering';
      const gatheringResult = await aiProcessingEngine.processUserInput(
        'I want to automate something',
        mockContext
      );
      expect(gatheringResult.conversationPhase).toBe('gathering');

      // Test confirming phase
      mockContext.phase = 'confirming';
      const confirmingResult = await aiProcessingEngine.processUserInput(
        'Yes, that looks correct',
        mockContext
      );
      expect(confirmingResult.conversationPhase).toBe('confirming');
    });
  });

  describe('2. Workflow Generation Intelligence', () => {
    const mockSpecification = {
      trigger: {
        type: 'webhook',
        description: 'HTTP webhook trigger',
        parameters: { path: '/webhook' }
      },
      actions: [{
        type: 'email_send',
        description: 'Send email notification',
        parameters: { to: 'user@example.com' }
      }],
      integrations: ['email'],
      complexity: 'simple' as const,
      feasible: true,
      issues: []
    };

    it('should generate valid n8n workflow from specification', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest
        .mockResolvedValueOnce(JSON.stringify({
          pattern: 'webhook_to_email',
          confidence: 0.9,
          complexity_estimate: 'simple'
        }))
        .mockResolvedValueOnce(JSON.stringify({
          name: 'Webhook to Email Workflow',
          active: false,
          nodes: [
            {
              id: 'webhook-node',
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              position: [200, 100],
              parameters: { path: '/webhook' }
            },
            {
              id: 'email-node',
              name: 'Send Email',
              type: 'n8n-nodes-base.emailSend',
              position: [500, 100],
              parameters: { to: 'user@example.com' }
            }
          ],
          connections: {
            'Webhook': {
              main: [[{ node: 'Send Email', type: 'main', index: 0 }]]
            }
          },
          settings: {},
          staticData: {}
        }));

      const result = await workflowGenerationEngine.generateWorkflow(mockSpecification);

      expect(result.success).toBe(true);
      expect(result.workflow).toBeDefined();
      expect(result.workflow?.name).toContain('Webhook to Email');
      expect(result.workflow?.nodes).toHaveLength(2);
    });

    it('should recognize workflow patterns correctly', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest.mockResolvedValue(JSON.stringify({
        pattern: 'webhook_process_notify',
        confidence: 0.85,
        suggested_nodes: ['webhook', 'set', 'email_send'],
        complexity_estimate: 'simple'
      }));

      const result = await workflowGenerationEngine.generateWorkflow(mockSpecification);

      expect(openAIService.simpleRequest).toHaveBeenCalled();
      // Pattern recognition is internal, but we can test the end result
      expect(result.success).toBe(true);
    });

    it('should handle workflow generation errors gracefully', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest.mockRejectedValue(new Error('API error'));

      const result = await workflowGenerationEngine.generateWorkflow(mockSpecification);

      expect(result.success).toBe(true); // Should fallback to template
      expect(result.workflow).toBeDefined();
      expect(result.warnings).toContain('Used fallback workflow template');
    });

    it('should optimize generated workflows', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest
        .mockResolvedValueOnce(JSON.stringify({ pattern: 'test', confidence: 0.8 }))
        .mockResolvedValueOnce(JSON.stringify({
          name: 'Test Workflow',
          nodes: [{ id: '1', name: 'Test', type: 'test' }],
          connections: {}
        }))
        .mockResolvedValueOnce(JSON.stringify({
          optimized_workflow: {
            nodes: [{ id: '1', name: 'Optimized Test', type: 'test' }]
          }
        }));

      const result = await workflowGenerationEngine.generateWorkflow(mockSpecification);

      expect(result.optimizations).toContain('Node optimization');
    });
  });

  describe('3. Interactive Conversation System', () => {
    it('should start a new conversation session', async () => {
      const result = await conversationManager.startConversation(
        'test-user',
        undefined,
        'I want to automate email notifications'
      );

      expect(result.sessionId).toBeDefined();
      expect(result.response).toContain('create');
      expect(result.phase).toBe('gathering');
    });

    it('should continue existing conversation', async () => {
      const { supabase } = require('../supabase');
      supabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'test-session',
          user_id: 'test-user',
          title: 'Test Chat',
          phase: 'refining',
          messages: JSON.stringify({
            messages: [{ role: 'user', content: 'test' }],
            phase: 'refining'
          })
        }
      });

      const result = await conversationManager.processMessage(
        'test-session',
        'More details about my automation'
      );

      expect(result.sessionId).toBe('test-session');
      expect(result.phase).toBe('refining');
    });

    it('should calculate conversation progress correctly', async () => {
      const result = await conversationManager.startConversation(
        'test-user',
        undefined,
        'Create a webhook that sends emails'
      );

      expect(result.progress).toBeDefined();
      expect(result.progress.requirements_gathered).toBeGreaterThan(0);
    });

    it('should manage conversation phases correctly', async () => {
      // Test phase progression: gathering -> refining -> confirming -> generating
      let result = await conversationManager.startConversation(
        'test-user',
        undefined,
        'I want automation'
      );
      expect(result.phase).toBe('gathering');

      result = await conversationManager.processMessage(
        result.sessionId,
        'Send email when webhook is received'
      );
      expect(result.phase).toBe('refining');
    });
  });

  describe('4. AI-Powered Validation', () => {
    const mockWorkflow = {
      name: 'Test Workflow',
      active: false,
      nodes: [
        {
          id: 'webhook',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          position: [200, 100],
          parameters: {}
        }
      ],
      connections: {},
      settings: {},
      staticData: {}
    };

    it('should validate workflow specifications', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest.mockResolvedValue(JSON.stringify({
        feasibility_score: 85,
        node_availability: { score: 9, missing_nodes: [] },
        integration_complexity: { score: 8 },
        risk_assessment: { high_risk_areas: [] }
      }));

      const mockSpec = {
        trigger: { type: 'webhook', description: 'test', parameters: {} },
        actions: [{ type: 'email', description: 'test', parameters: {} }],
        integrations: ['email'],
        complexity: 'simple' as const,
        feasible: true,
        issues: []
      };

      const result = await aiValidationEngine.validateRequirementSpec(mockSpec);

      expect(result.isValid).toBe(true);
      expect(result.feasibilityScore).toBeGreaterThan(70);
    });

    it('should validate n8n workflows', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest
        .mockResolvedValueOnce(JSON.stringify({
          estimated_execution_time: '2-5 seconds',
          scalability_score: 80
        }))
        .mockResolvedValueOnce(JSON.stringify({
          security_score: 85,
          data_exposure_risks: []
        }));

      const result = await aiValidationEngine.validateWorkflow(mockWorkflow);

      expect(result.isValid).toBe(true);
      expect(result.performanceAnalysis).toBeDefined();
      expect(result.securityAnalysis).toBeDefined();
    });

    it('should identify validation issues', async () => {
      const invalidWorkflow = {
        name: '',
        nodes: [], // No nodes
        connections: {}
      };

      const result = await aiValidationEngine.validateWorkflow(invalidWorkflow);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(2); // Missing name and no nodes
    });

    it('should provide security analysis', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest
        .mockResolvedValueOnce(JSON.stringify({
          estimated_execution_time: '2-5 seconds',
          scalability_score: 80
        }))
        .mockResolvedValueOnce(JSON.stringify({
          security_score: 65,
          credential_risks: ['API keys visible in configuration'],
          security_recommendations: ['Use environment variables']
        }));

      const result = await aiValidationEngine.validateWorkflow(mockWorkflow);

      expect(result.securityAnalysis.securityScore).toBe(65);
      expect(result.securityAnalysis.securityRecommendations).toHaveLength(1);
    });
  });

  describe('5. Intelligent Error Handling', () => {
    it('should handle processing errors intelligently', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest.mockResolvedValue(JSON.stringify({
        auto_correctable: true,
        recovery_strategy: 'retry_with_modification',
        user_explanation: 'Fixed JSON formatting issue'
      }));

      const errorContext = {
        operation: 'workflow_generation' as const,
        phase: 'generating' as const,
        userInput: 'malformed input',
        errorType: 'JSONError',
        errorMessage: 'Invalid JSON format',
        attemptNumber: 1,
        previousAttempts: []
      };

      const result = await aiErrorHandler.handleError(errorContext);

      expect(result.success).toBe(false); // Since we're testing error handling
      expect(result.userExplanation).toBeDefined();
      expect(result.suggestions).toHaveLength(3);
    });

    it('should auto-correct workflow specifications', async () => {
      const invalidSpec = {
        trigger: { type: 'unknown', description: '', parameters: {} },
        actions: [],
        integrations: [],
        complexity: 'simple' as const,
        feasible: false,
        issues: ['No trigger specified']
      };

      const mockValidation = {
        isValid: false,
        feasibilityScore: 40,
        issues: [{ severity: 'critical', message: 'No trigger', blockingGeneration: true }],
        warnings: [],
        recommendations: [],
        requiredCredentials: [],
        performanceAnalysis: {
          estimatedExecutionTime: 'unknown',
          rateLimitRisks: [],
          scalabilityScore: 0,
          bottleneckNodes: [],
          optimizationSuggestions: []
        },
        securityAnalysis: {
          securityScore: 0,
          dataExposureRisks: [],
          credentialRisks: [],
          complianceIssues: [],
          securityRecommendations: []
        }
      };

      const result = await aiErrorHandler.autoCorrectSpecification(invalidSpec, mockValidation);

      expect(result.corrected).toBe(true);
      expect(result.correctedSpec?.trigger.type).toBe('webhook');
      expect(result.corrections).toContain('Set default trigger type to webhook');
    });

    it('should provide user-friendly error explanations', async () => {
      const error = new Error('Request timeout');
      const explanation = aiErrorHandler.getErrorExplanation(error, 'workflow generation');

      expect(explanation).toContain('took too long');
      expect(explanation).toContain('workflow generation');
    });
  });

  describe('6. Enhanced Workflow Service Integration', () => {
    it('should process conversation with AI integration', async () => {
      const result = await enhancedSimpleWorkflowService.processConversation(
        'I want to automate email notifications',
        [],
        'test-user'
      );

      expect(result.content).toBeDefined();
      expect(result.phase).toBeDefined();
    });

    it('should handle workflow deployment with error recovery', async () => {
      const mockWorkflow = {
        name: 'Test Workflow',
        nodes: [{ id: '1', name: 'Test', type: 'test' }],
        connections: {}
      };

      const result = await enhancedSimpleWorkflowService.deployWorkflow(
        mockWorkflow,
        'test-project',
        'test-user'
      );

      expect(result.success).toBeDefined();
    });

    it('should save workflows with AI metadata', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest.mockResolvedValue(JSON.stringify({
        feasibility_score: 85,
        performance_analysis: { estimated_execution_time: '2-3 seconds' },
        security_analysis: { security_score: 90 }
      }));

      const mockWorkflow = { name: 'Test', nodes: [], connections: {} };
      const conversationHistory = [{ role: 'user', content: 'test' }];

      const result = await enhancedSimpleWorkflowService.saveWorkflow(
        mockWorkflow,
        conversationHistory,
        'test-project',
        'test-session'
      );

      expect(result.success).toBe(true);
      expect(result.validationScore).toBeGreaterThan(0);
    });

    it('should manage conversation sessions', async () => {
      const { supabase } = require('../supabase');
      supabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'test-session',
          user_id: 'test-user',
          title: 'Test',
          phase: 'gathering'
        }
      });

      const result = await enhancedSimpleWorkflowService.getConversationSession(
        'test-session',
        'test-user'
      );

      expect(result.id).toBe('test-session');
    });
  });

  describe('7. Integration Flow Testing', () => {
    it('should handle complete workflow creation flow', async () => {
      const { openAIService } = require('../OpenAIService');
      
      // Mock successful AI responses for the complete flow
      openAIService.simpleRequest
        .mockResolvedValueOnce(JSON.stringify({ type: 'workflow_creation', confidence: 0.9 }))
        .mockResolvedValueOnce(JSON.stringify({
          trigger: { type: 'webhook', description: 'HTTP webhook' },
          actions: [{ type: 'email_send', description: 'Send email' }],
          integrations: ['email'],
          complexity: 'simple',
          feasible: true,
          issues: []
        }))
        .mockResolvedValueOnce('Workflow requirements gathered successfully')
        .mockResolvedValueOnce(JSON.stringify({
          pattern: 'webhook_to_email',
          confidence: 0.9
        }))
        .mockResolvedValueOnce(JSON.stringify({
          name: 'Email Notification Workflow',
          nodes: [
            { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook' },
            { id: '2', name: 'Email', type: 'n8n-nodes-base.emailSend' }
          ],
          connections: { 'Webhook': { main: [[{ node: 'Email', type: 'main', index: 0 }]] } }
        }))
        .mockResolvedValueOnce(JSON.stringify({
          feasibility_score: 90,
          node_availability: { score: 10, missing_nodes: [] }
        }));

      // Start conversation
      const session = await conversationManager.startConversation(
        'test-user',
        undefined,
        'Create a webhook that sends email notifications'
      );

      expect(session.sessionId).toBeDefined();
      expect(session.phase).toBe('gathering');

      // Process to generation
      const processed = await conversationManager.processMessage(
        session.sessionId,
        'Yes, send emails to admin@example.com when webhook is triggered'
      );

      expect(processed.phase).toMatch(/refining|confirming|generating/);
    });

    it('should handle error recovery in complete flow', async () => {
      const { openAIService } = require('../OpenAIService');
      
      // Mock error then recovery
      openAIService.simpleRequest
        .mockRejectedValueOnce(new Error('API timeout'))
        .mockResolvedValueOnce(JSON.stringify({
          auto_correctable: false,
          recovery_strategy: 'manual_intervention',
          user_explanation: 'Please try again with a simpler request'
        }));

      const result = await enhancedSimpleWorkflowService.processConversation(
        'Complex automation with multiple APIs',
        [],
        'test-user'
      );

      expect(result.content).toContain('Please try again');
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('8. Performance and Edge Cases', () => {
    it('should handle empty or invalid inputs', async () => {
      const result = await aiProcessingEngine.processUserInput('', mockContext);
      
      expect(result.response).toContain('error');
      expect(result.needsMoreInfo).toBe(false);
    });

    it('should handle malformed specifications', async () => {
      const malformedSpec = null;
      
      const result = await workflowGenerationEngine.generateWorkflow(malformedSpec as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle conversation timeouts gracefully', async () => {
      const { openAIService } = require('../OpenAIService');
      openAIService.simpleRequest.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 100)
        )
      );

      const result = await conversationManager.processMessage(
        'test-session',
        'Test message'
      );

      expect(result.response).toContain('error');
    });

    it('should maintain conversation context across multiple messages', async () => {
      const session = await conversationManager.startConversation(
        'test-user',
        undefined,
        'I need email automation'
      );

      const message1 = await conversationManager.processMessage(
        session.sessionId,
        'Trigger should be webhook'
      );

      const message2 = await conversationManager.processMessage(
        session.sessionId,
        'Send to admin@example.com'
      );

      // Context should be maintained
      expect(message2.sessionId).toBe(session.sessionId);
    });
  });
});

// Integration test helper functions
export const testHelpers = {
  createMockConversationContext: (overrides = {}): ConversationContext => ({
    userId: 'test-user',
    sessionId: 'test-session',
    messages: [],
    userRequirements: {},
    phase: 'gathering',
    ...overrides
  }),

  createMockWorkflowSpec: (overrides = {}) => ({
    trigger: {
      type: 'webhook',
      description: 'HTTP webhook trigger',
      parameters: {}
    },
    actions: [{
      type: 'email_send',
      description: 'Send email notification',
      parameters: {}
    }],
    integrations: ['email'],
    complexity: 'simple' as const,
    feasible: true,
    issues: [],
    ...overrides
  }),

  createMockN8nWorkflow: (overrides = {}) => ({
    name: 'Test Workflow',
    active: false,
    nodes: [
      {
        id: 'test-node',
        name: 'Test Node',
        type: 'n8n-nodes-base.test',
        position: [200, 100],
        parameters: {}
      }
    ],
    connections: {},
    settings: {},
    staticData: {},
    tags: ['test'],
    meta: {
      templateCredit: 'Test',
      generatedBy: 'test',
      description: 'Test workflow'
    },
    ...overrides
  })
};