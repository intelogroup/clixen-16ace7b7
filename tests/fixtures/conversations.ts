/**
 * Conversation and Chat Test Fixtures
 * Mock conversation data for testing chat functionality and message persistence
 */
import type { Conversation, ChatMessage } from '@/types/chat';
import { testUsers } from './users';
import { testProjects } from './projects';

export interface TestConversation extends Conversation {
  messages?: ChatMessage[];
}

/**
 * Test conversations with various message types and states
 */
export const testConversations: Record<string, TestConversation> = {
  // Basic conversation with simple workflow generation
  basicWorkflow: {
    id: 'conv-basic-001',
    user_id: testUsers.regularUser.id,
    project_id: testProjects.basicProject.id,
    title: 'Create Email Notification Workflow',
    created_at: new Date('2024-01-10T09:00:00Z'),
    updated_at: new Date('2024-01-10T09:15:00Z'),
    message_count: 4,
    status: 'active',
    messages: [
      {
        id: 'msg-basic-001',
        conversation_id: 'conv-basic-001',
        user_id: testUsers.regularUser.id,
        message: 'I need to create a workflow that sends email notifications when someone submits a form',
        role: 'user',
        timestamp: new Date('2024-01-10T09:00:00Z'),
        metadata: {}
      },
      {
        id: 'msg-basic-002',
        conversation_id: 'conv-basic-001',
        user_id: null, // Assistant message
        message: 'I\'ll help you create an email notification workflow. This will involve:\n\n1. A webhook trigger to receive form submissions\n2. Data validation to ensure required fields\n3. Email node to send notifications\n\nLet me generate this workflow for you.',
        role: 'assistant',
        timestamp: new Date('2024-01-10T09:01:00Z'),
        metadata: {
          agent_type: 'orchestrator',
          processing_time: 1200
        }
      },
      {
        id: 'msg-basic-003',
        conversation_id: 'conv-basic-001',
        user_id: null,
        message: '✅ **Workflow Generated Successfully!**\n\n**Workflow Name:** Email Notification System\n\n**Components:**\n- Webhook Trigger (receives form data)\n- Set Node (formats data)\n- Email Send Node (sends notification)\n\n**Webhook URL:** `https://n8n.example.com/webhook/email-notifications`\n\nThe workflow is ready to deploy. Would you like me to deploy it to your n8n instance?',
        role: 'assistant',
        timestamp: new Date('2024-01-10T09:03:00Z'),
        metadata: {
          agent_type: 'workflow-designer',
          workflow_id: 'workflow-email-001',
          processing_time: 5400
        }
      },
      {
        id: 'msg-basic-004',
        conversation_id: 'conv-basic-001',
        user_id: testUsers.regularUser.id,
        message: 'Yes, please deploy it to n8n',
        role: 'user',
        timestamp: new Date('2024-01-10T09:15:00Z'),
        metadata: {}
      }
    ]
  },

  // Complex conversation with multiple iterations
  complexDataPipeline: {
    id: 'conv-complex-001',
    user_id: testUsers.premiumUser.id,
    project_id: testProjects.complexProject.id,
    title: 'Advanced Data Processing Pipeline',
    created_at: new Date('2024-01-08T14:00:00Z'),
    updated_at: new Date('2024-01-08T15:30:00Z'),
    message_count: 12,
    status: 'active',
    messages: [
      {
        id: 'msg-complex-001',
        conversation_id: 'conv-complex-001',
        user_id: testUsers.premiumUser.id,
        message: 'I need a comprehensive data processing pipeline that can:\n1. Receive data from multiple sources\n2. Validate and clean the data\n3. Transform it according to business rules\n4. Save to database with conflict resolution\n5. Send notifications to different teams\n6. Generate reports and analytics',
        role: 'user',
        timestamp: new Date('2024-01-08T14:00:00Z'),
        metadata: {}
      },
      {
        id: 'msg-complex-002',
        conversation_id: 'conv-complex-001',
        user_id: null,
        message: 'That\'s a sophisticated data pipeline! Let me break this down into phases:\n\n**Phase 1: Data Ingestion**\n- Multiple webhook endpoints for different sources\n- Queue system for handling high volume\n\n**Phase 2: Processing**\n- Data validation with custom rules\n- Transformation engine with business logic\n- Error handling and retry mechanisms\n\n**Phase 3: Storage & Distribution**\n- Database operations with conflict resolution\n- Multi-channel notifications\n- Real-time reporting\n\nThis will require several connected workflows. Shall I start with the data ingestion layer?',
        role: 'assistant',
        timestamp: new Date('2024-01-08T14:02:00Z'),
        metadata: {
          agent_type: 'orchestrator',
          complexity_score: 0.95,
          estimated_nodes: 25
        }
      },
      {
        id: 'msg-complex-003',
        conversation_id: 'conv-complex-001',
        user_id: testUsers.premiumUser.id,
        message: 'Yes, let\'s start with data ingestion. I need to handle data from REST APIs, CSV uploads, and real-time webhooks',
        role: 'user',
        timestamp: new Date('2024-01-08T14:05:00Z'),
        metadata: {}
      },
      {
        id: 'msg-complex-004',
        conversation_id: 'conv-complex-001',
        user_id: null,
        message: '🔧 **Generating Data Ingestion Workflow...**\n\nCreating multi-source data ingestion system with:\n- REST API polling nodes\n- File upload webhook handlers\n- Real-time webhook receivers\n- Data normalization layer\n- Queue management system\n\n*Processing time: ~15 seconds*',
        role: 'assistant',
        timestamp: new Date('2024-01-08T14:06:00Z'),
        metadata: {
          agent_type: 'workflow-designer',
          phase: 'generation',
          estimated_completion: '2024-01-08T14:06:15Z'
        }
      }
    ]
  },

  // Error handling conversation
  errorScenario: {
    id: 'conv-error-001',
    user_id: testUsers.errorUser.id,
    project_id: testProjects.errorProject.id,
    title: 'Failed Workflow Generation',
    created_at: new Date('2024-01-12T10:00:00Z'),
    updated_at: new Date('2024-01-12T10:05:00Z'),
    message_count: 3,
    status: 'error',
    messages: [
      {
        id: 'msg-error-001',
        conversation_id: 'conv-error-001',
        user_id: testUsers.errorUser.id,
        message: 'Create a workflow that processes financial transactions',
        role: 'user',
        timestamp: new Date('2024-01-12T10:00:00Z'),
        metadata: {}
      },
      {
        id: 'msg-error-002',
        conversation_id: 'conv-error-001',
        user_id: null,
        message: 'I\'ll help you create a financial transaction processing workflow. This requires careful handling of sensitive data and compliance requirements.',
        role: 'assistant',
        timestamp: new Date('2024-01-12T10:01:00Z'),
        metadata: {
          agent_type: 'orchestrator'
        }
      },
      {
        id: 'msg-error-003',
        conversation_id: 'conv-error-001',
        user_id: null,
        message: '❌ **Error: Workflow Generation Failed**\n\n**Error Details:**\n- AI service timeout after 30 seconds\n- Retry attempt 1 of 3 failed\n- Error code: AI_TIMEOUT_001\n\n**Suggested Actions:**\n1. Try simplifying your request\n2. Check your API quota limits\n3. Contact support if the issue persists\n\nWould you like me to try again with a simpler version?',
        role: 'assistant',
        timestamp: new Date('2024-01-12T10:05:00Z'),
        metadata: {
          agent_type: 'error-handler',
          error_code: 'AI_TIMEOUT_001',
          retry_count: 1,
          max_retries: 3
        }
      }
    ]
  },

  // Long conversation with workflow modifications
  iterativeDesign: {
    id: 'conv-iterative-001',
    user_id: testUsers.regularUser.id,
    project_id: testProjects.basicProject.id,
    title: 'E-commerce Order Processing - Iterative Design',
    created_at: new Date('2024-01-09T11:00:00Z'),
    updated_at: new Date('2024-01-09T12:30:00Z'),
    message_count: 18,
    status: 'active',
    messages: [
      {
        id: 'msg-iter-001',
        conversation_id: 'conv-iterative-001',
        user_id: testUsers.regularUser.id,
        message: 'I want to create an order processing workflow for my e-commerce site',
        role: 'user',
        timestamp: new Date('2024-01-09T11:00:00Z'),
        metadata: {}
      },
      {
        id: 'msg-iter-002',
        conversation_id: 'conv-iterative-001',
        user_id: null,
        message: '✅ **E-commerce Order Processing Workflow Created!**\n\nBasic workflow includes:\n- Order webhook receiver\n- Payment validation\n- Inventory check\n- Order confirmation email\n\nWould you like me to add more features?',
        role: 'assistant',
        timestamp: new Date('2024-01-09T11:03:00Z'),
        metadata: {
          agent_type: 'workflow-designer',
          workflow_id: 'workflow-ecommerce-001',
          version: 1
        }
      },
      {
        id: 'msg-iter-003',
        conversation_id: 'conv-iterative-001',
        user_id: testUsers.regularUser.id,
        message: 'Can you add inventory management and shipping notifications?',
        role: 'user',
        timestamp: new Date('2024-01-09T11:15:00Z'),
        metadata: {}
      },
      {
        id: 'msg-iter-004',
        conversation_id: 'conv-iterative-001',
        user_id: null,
        message: '🔄 **Updating Workflow with Enhanced Features...**\n\nAdding:\n- Inventory decrement logic\n- Low stock alerts\n- Shipping provider integration\n- Tracking number generation\n- Customer shipping notifications\n\n*Generating version 2...*',
        role: 'assistant',
        timestamp: new Date('2024-01-09T11:16:00Z'),
        metadata: {
          agent_type: 'workflow-designer',
          workflow_id: 'workflow-ecommerce-001',
          version: 2,
          modification_type: 'enhancement'
        }
      },
      {
        id: 'msg-iter-005',
        conversation_id: 'conv-iterative-001',
        user_id: testUsers.regularUser.id,
        message: 'Perfect! Can we also add fraud detection and refund processing?',
        role: 'user',
        timestamp: new Date('2024-01-09T12:00:00Z'),
        metadata: {}
      },
      {
        id: 'msg-iter-006',
        conversation_id: 'conv-iterative-001',
        user_id: null,
        message: '✅ **Advanced Features Added Successfully!**\n\n**New Components:**\n- Fraud scoring algorithm\n- Risk assessment rules\n- Automated refund processing\n- Admin notification system\n- Transaction logging\n\n**Workflow Version:** 3\n**Total Nodes:** 28\n**Estimated Processing Time:** 8-12 seconds per order\n\nThe workflow is ready for deployment!',
        role: 'assistant',
        timestamp: new Date('2024-01-09T12:30:00Z'),
        metadata: {
          agent_type: 'workflow-designer',
          workflow_id: 'workflow-ecommerce-001',
          version: 3,
          total_nodes: 28,
          complexity_score: 0.8
        }
      }
    ]
  },

  // Empty/New conversation
  newConversation: {
    id: 'conv-new-001',
    user_id: testUsers.newUser.id,
    project_id: testProjects.emptyProject.id,
    title: 'New Conversation',
    created_at: new Date(),
    updated_at: new Date(),
    message_count: 0,
    status: 'active',
    messages: []
  },

  // Multi-user shared conversation (hypothetical feature)
  sharedConversation: {
    id: 'conv-shared-001',
    user_id: testUsers.premiumUser.id,
    project_id: testProjects.sharedProject.id,
    title: 'Team Collaboration Workflow',
    created_at: new Date('2024-01-11T09:00:00Z'),
    updated_at: new Date('2024-01-11T10:30:00Z'),
    message_count: 8,
    status: 'active',
    messages: [
      {
        id: 'msg-shared-001',
        conversation_id: 'conv-shared-001',
        user_id: testUsers.premiumUser.id,
        message: 'We need a workflow for our team collaboration process',
        role: 'user',
        timestamp: new Date('2024-01-11T09:00:00Z'),
        metadata: { collaborator_role: 'owner' }
      },
      {
        id: 'msg-shared-002',
        conversation_id: 'conv-shared-001',
        user_id: testUsers.regularUser.id,
        message: 'I suggest we include Slack integration for notifications',
        role: 'user',
        timestamp: new Date('2024-01-11T09:30:00Z'),
        metadata: { collaborator_role: 'editor' }
      },
      {
        id: 'msg-shared-003',
        conversation_id: 'conv-shared-001',
        user_id: null,
        message: 'Great suggestions! Creating a team collaboration workflow with:\n- Task management integration\n- Slack notifications\n- Progress tracking\n- Team member assignments',
        role: 'assistant',
        timestamp: new Date('2024-01-11T10:30:00Z'),
        metadata: {
          agent_type: 'orchestrator',
          collaboration_context: true
        }
      }
    ]
  }
};

/**
 * Generate a test conversation with random data
 */
export const generateTestConversation = (overrides: Partial<TestConversation> = {}): TestConversation => {
  const randomId = Math.random().toString(36).substr(2, 9);
  const timestamp = new Date();

  return {
    id: `conv-generated-${randomId}`,
    user_id: testUsers.regularUser.id,
    project_id: testProjects.basicProject.id,
    title: `Generated Conversation ${randomId}`,
    created_at: timestamp,
    updated_at: timestamp,
    message_count: 0,
    status: 'active',
    messages: [],
    ...overrides
  };
};

/**
 * Generate a test chat message
 */
export const generateTestMessage = (
  conversationId: string, 
  role: 'user' | 'assistant' = 'user',
  overrides: Partial<ChatMessage> = {}
): ChatMessage => {
  const randomId = Math.random().toString(36).substr(2, 9);
  const timestamp = new Date();

  return {
    id: `msg-generated-${randomId}`,
    conversation_id: conversationId,
    user_id: role === 'user' ? testUsers.regularUser.id : null,
    message: role === 'user' 
      ? `This is a test user message ${randomId}`
      : `This is a test assistant response ${randomId}`,
    role,
    timestamp,
    metadata: role === 'assistant' 
      ? { agent_type: 'orchestrator', processing_time: 1000 }
      : {},
    ...overrides
  };
};

/**
 * Common message templates for testing
 */
export const messageTemplates = {
  userPrompts: [
    'Create a simple webhook workflow',
    'I need a data processing pipeline',
    'Build an email notification system',
    'Set up automated report generation',
    'Create a workflow for order processing',
    'I want to integrate with Slack',
    'Build a customer onboarding flow',
    'Create a backup and sync workflow',
    'Set up monitoring and alerts',
    'Build a content publishing workflow'
  ],

  assistantResponses: [
    'I\'ll help you create that workflow. Let me analyze your requirements...',
    '✅ Workflow generated successfully! Here are the details:',
    '🔧 Generating your workflow with the following components:',
    'I understand you need a workflow for [purpose]. This will involve:',
    'Perfect! I\'ve created a [type] workflow that includes:',
    '⚠️ I need some clarification about your requirements:',
    'The workflow is ready! Would you like me to deploy it?',
    '🔄 Updating your workflow with the requested changes...',
    'Here\'s a summary of your workflow configuration:',
    'I\'ve optimized the workflow for better performance:'
  ],

  errorMessages: [
    '❌ Error: Workflow generation failed due to API timeout',
    '⚠️ Warning: Some workflow nodes may need manual configuration',
    '❌ Error: Invalid workflow configuration detected',
    '⚠️ Notice: Workflow deployment requires additional permissions',
    '❌ Error: Database connection failed during workflow save',
    '⚠️ Warning: Workflow complexity exceeds recommended limits',
    '❌ Error: AI service temporarily unavailable',
    '⚠️ Notice: Some integrations require additional setup',
    '❌ Error: Workflow validation failed',
    '⚠️ Warning: High resource usage detected'
  ]
};

/**
 * Invalid message data for testing validation
 */
export const invalidMessages = {
  missingContent: {
    conversation_id: 'conv-test',
    user_id: testUsers.regularUser.id,
    role: 'user',
    timestamp: new Date()
  },

  invalidRole: {
    conversation_id: 'conv-test',
    user_id: testUsers.regularUser.id,
    message: 'Test message',
    role: 'invalid-role',
    timestamp: new Date()
  },

  missingTimestamp: {
    conversation_id: 'conv-test',
    user_id: testUsers.regularUser.id,
    message: 'Test message',
    role: 'user'
  },

  sqlInjection: {
    conversation_id: 'conv-test',
    user_id: testUsers.regularUser.id,
    message: "'; DROP TABLE chat_messages; --",
    role: 'user',
    timestamp: new Date()
  },

  xssPayload: {
    conversation_id: 'conv-test',
    user_id: testUsers.regularUser.id,
    message: '<script>alert("xss")</script>',
    role: 'user',
    timestamp: new Date()
  },

  oversizedMessage: {
    conversation_id: 'conv-test',
    user_id: testUsers.regularUser.id,
    message: 'x'.repeat(10001), // Assuming 10000 char limit
    role: 'user',
    timestamp: new Date()
  }
};

/**
 * Generate conversation batch for load testing
 */
export const generateConversationBatch = (
  count: number, 
  userId?: string, 
  projectId?: string
): TestConversation[] => {
  const targetUserId = userId || testUsers.regularUser.id;
  const targetProjectId = projectId || testProjects.basicProject.id;

  return Array.from({ length: count }, (_, index) => ({
    ...generateTestConversation({
      id: `batch-conv-${index + 1}`,
      title: `Batch Conversation ${index + 1}`,
      user_id: targetUserId,
      project_id: targetProjectId
    })
  }));
};

/**
 * Generate message batch for conversation
 */
export const generateMessageBatch = (
  conversationId: string,
  count: number,
  alternateRoles: boolean = true
): ChatMessage[] => {
  return Array.from({ length: count }, (_, index) => {
    const role = alternateRoles 
      ? (index % 2 === 0 ? 'user' : 'assistant')
      : 'user';
    
    return generateTestMessage(conversationId, role, {
      id: `batch-msg-${conversationId}-${index + 1}`,
      message: role === 'user' 
        ? messageTemplates.userPrompts[index % messageTemplates.userPrompts.length]
        : messageTemplates.assistantResponses[index % messageTemplates.assistantResponses.length]
    });
  });
};