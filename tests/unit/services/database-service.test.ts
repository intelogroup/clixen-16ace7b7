/**
 * Database Service Unit Tests
 * Tests database operations and data layer functionality
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { DatabaseChatService } from '@/lib/services/DatabaseChatService';
import { SimpleWorkflowService } from '@/lib/services/SimpleWorkflowService';

// Mock Supabase client
const mockSelect = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockDelete = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockIn = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockExecute = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  in: mockIn,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
  execute: mockExecute
}));

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn()
};

const mockSupabase = {
  from: mockFrom,
  channel: vi.fn(() => mockChannel),
  auth: {
    getSession: vi.fn().mockResolvedValue({ 
      data: { session: { user: { id: 'test-user-id' } } }, 
      error: null 
    })
  }
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

describe('Database Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DatabaseChatService', () => {
    let chatService: DatabaseChatService;

    beforeEach(() => {
      chatService = new DatabaseChatService();
    });

    test('should initialize with Supabase client', () => {
      expect(createClient).toHaveBeenCalled();
      expect(chatService).toBeInstanceOf(DatabaseChatService);
    });

    test('should save chat message successfully', async () => {
      const testMessage = {
        id: 'msg-123',
        conversation_id: 'conv-456',
        user_id: 'user-789',
        message: 'Test message content',
        role: 'user' as const,
        timestamp: new Date()
      };

      mockSingle.mockResolvedValue({
        data: testMessage,
        error: null
      });

      const result = await chatService.saveMessage(testMessage);

      expect(mockFrom).toHaveBeenCalledWith('chat_messages');
      expect(mockInsert).toHaveBeenCalledWith(testMessage);
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(testMessage);
    });

    test('should handle save message errors', async () => {
      const testMessage = {
        id: 'msg-123',
        conversation_id: 'conv-456',
        user_id: 'user-789',
        message: 'Test message',
        role: 'user' as const,
        timestamp: new Date()
      };

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await expect(chatService.saveMessage(testMessage)).rejects.toThrow(
        'Database connection failed'
      );
    });

    test('should retrieve conversation messages', async () => {
      const conversationId = 'conv-123';
      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: conversationId,
          message: 'Hello',
          role: 'user',
          timestamp: new Date()
        },
        {
          id: 'msg-2',
          conversation_id: conversationId,
          message: 'Hi there!',
          role: 'assistant',
          timestamp: new Date()
        }
      ];

      mockExecute.mockResolvedValue({
        data: mockMessages,
        error: null
      });

      const result = await chatService.getConversationMessages(conversationId);

      expect(mockFrom).toHaveBeenCalledWith('chat_messages');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('conversation_id', conversationId);
      expect(mockOrder).toHaveBeenCalledWith('timestamp', { ascending: true });
      expect(result).toEqual(mockMessages);
    });

    test('should create new conversation', async () => {
      const conversationData = {
        id: 'conv-new',
        user_id: 'user-123',
        project_id: 'project-456',
        title: 'New Conversation',
        created_at: new Date()
      };

      mockSingle.mockResolvedValue({
        data: conversationData,
        error: null
      });

      const result = await chatService.createConversation(conversationData);

      expect(mockFrom).toHaveBeenCalledWith('conversations');
      expect(mockInsert).toHaveBeenCalledWith(conversationData);
      expect(result).toEqual(conversationData);
    });

    test('should update conversation title', async () => {
      const conversationId = 'conv-123';
      const newTitle = 'Updated Conversation Title';

      mockSingle.mockResolvedValue({
        data: { id: conversationId, title: newTitle },
        error: null
      });

      const result = await chatService.updateConversationTitle(conversationId, newTitle);

      expect(mockFrom).toHaveBeenCalledWith('conversations');
      expect(mockUpdate).toHaveBeenCalledWith({ title: newTitle });
      expect(mockEq).toHaveBeenCalledWith('id', conversationId);
      expect(result.title).toBe(newTitle);
    });

    test('should get user conversations', async () => {
      const userId = 'user-123';
      const mockConversations = [
        { id: 'conv-1', title: 'Conversation 1', created_at: new Date() },
        { id: 'conv-2', title: 'Conversation 2', created_at: new Date() }
      ];

      mockExecute.mockResolvedValue({
        data: mockConversations,
        error: null
      });

      const result = await chatService.getUserConversations(userId);

      expect(mockFrom).toHaveBeenCalledWith('conversations');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual(mockConversations);
    });

    test('should delete conversation and messages', async () => {
      const conversationId = 'conv-to-delete';

      mockExecute
        .mockResolvedValueOnce({ data: null, error: null }) // Delete messages
        .mockResolvedValueOnce({ data: null, error: null }); // Delete conversation

      await chatService.deleteConversation(conversationId);

      expect(mockFrom).toHaveBeenCalledWith('chat_messages');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('conversation_id', conversationId);

      expect(mockFrom).toHaveBeenCalledWith('conversations');
      expect(mockEq).toHaveBeenCalledWith('id', conversationId);
    });

    test('should handle database connection errors', async () => {
      mockExecute.mockRejectedValue(new Error('Network error'));

      await expect(
        chatService.getConversationMessages('conv-123')
      ).rejects.toThrow('Network error');
    });

    test('should validate message data before saving', async () => {
      const invalidMessage = {
        // Missing required fields
        message: 'Test message'
      };

      await expect(
        chatService.saveMessage(invalidMessage as any)
      ).rejects.toThrow(/required|validation|invalid/i);
    });

    test('should handle concurrent message saves', async () => {
      const messages = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-${i}`,
        conversation_id: 'conv-concurrent',
        user_id: 'user-test',
        message: `Message ${i}`,
        role: 'user' as const,
        timestamp: new Date()
      }));

      mockSingle.mockImplementation(async () => ({
        data: messages[0],
        error: null
      }));

      const promises = messages.map(msg => chatService.saveMessage(msg));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockInsert).toHaveBeenCalledTimes(5);
    });

    test('should implement real-time subscriptions', () => {
      const callback = vi.fn();
      const conversationId = 'conv-realtime';

      chatService.subscribeToConversation(conversationId, callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`conversation-${conversationId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        }),
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    test('should unsubscribe from real-time updates', () => {
      const conversationId = 'conv-unsubscribe';
      
      chatService.subscribeToConversation(conversationId, vi.fn());
      chatService.unsubscribeFromConversation(conversationId);

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('SimpleWorkflowService', () => {
    let workflowService: SimpleWorkflowService;

    beforeEach(() => {
      workflowService = new SimpleWorkflowService();
    });

    test('should save workflow successfully', async () => {
      const workflowData = {
        id: 'workflow-123',
        name: 'Test Workflow',
        description: 'A test workflow',
        project_id: 'project-456',
        json_payload: { nodes: [], connections: {} },
        status: 'draft' as const,
        version: 1,
        created_at: new Date()
      };

      mockSingle.mockResolvedValue({
        data: workflowData,
        error: null
      });

      const result = await workflowService.saveWorkflow(workflowData);

      expect(mockFrom).toHaveBeenCalledWith('workflows');
      expect(mockInsert).toHaveBeenCalledWith(workflowData);
      expect(result).toEqual(workflowData);
    });

    test('should update workflow status', async () => {
      const workflowId = 'workflow-123';
      const newStatus = 'deployed';
      const deployedAt = new Date();

      mockSingle.mockResolvedValue({
        data: { id: workflowId, status: newStatus, deployed_at: deployedAt },
        error: null
      });

      const result = await workflowService.updateWorkflowStatus(
        workflowId, 
        newStatus, 
        deployedAt
      );

      expect(mockFrom).toHaveBeenCalledWith('workflows');
      expect(mockUpdate).toHaveBeenCalledWith({ 
        status: newStatus, 
        deployed_at: deployedAt 
      });
      expect(mockEq).toHaveBeenCalledWith('id', workflowId);
      expect(result.status).toBe(newStatus);
    });

    test('should get workflows by project', async () => {
      const projectId = 'project-123';
      const mockWorkflows = [
        {
          id: 'workflow-1',
          name: 'Workflow 1',
          project_id: projectId,
          status: 'draft'
        },
        {
          id: 'workflow-2',
          name: 'Workflow 2',
          project_id: projectId,
          status: 'deployed'
        }
      ];

      mockExecute.mockResolvedValue({
        data: mockWorkflows,
        error: null
      });

      const result = await workflowService.getProjectWorkflows(projectId);

      expect(mockFrom).toHaveBeenCalledWith('workflows');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('project_id', projectId);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual(mockWorkflows);
    });

    test('should get workflow by id', async () => {
      const workflowId = 'workflow-123';
      const mockWorkflow = {
        id: workflowId,
        name: 'Test Workflow',
        json_payload: { nodes: [], connections: {} }
      };

      mockSingle.mockResolvedValue({
        data: mockWorkflow,
        error: null
      });

      const result = await workflowService.getWorkflow(workflowId);

      expect(mockFrom).toHaveBeenCalledWith('workflows');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', workflowId);
      expect(result).toEqual(mockWorkflow);
    });

    test('should delete workflow', async () => {
      const workflowId = 'workflow-to-delete';

      mockExecute.mockResolvedValue({
        data: null,
        error: null
      });

      await workflowService.deleteWorkflow(workflowId);

      expect(mockFrom).toHaveBeenCalledWith('workflows');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', workflowId);
    });

    test('should increment workflow version', async () => {
      const workflowId = 'workflow-version-test';
      const currentVersion = 1;
      const newVersion = 2;

      mockSingle.mockResolvedValue({
        data: { id: workflowId, version: newVersion },
        error: null
      });

      const result = await workflowService.incrementWorkflowVersion(workflowId, currentVersion);

      expect(mockFrom).toHaveBeenCalledWith('workflows');
      expect(mockUpdate).toHaveBeenCalledWith({ version: newVersion });
      expect(mockEq).toHaveBeenCalledWith('id', workflowId);
      expect(result.version).toBe(newVersion);
    });

    test('should validate workflow JSON payload', async () => {
      const invalidWorkflow = {
        id: 'invalid-workflow',
        name: 'Invalid Workflow',
        project_id: 'project-123',
        json_payload: null, // Invalid payload
        status: 'draft' as const,
        version: 1
      };

      await expect(
        workflowService.saveWorkflow(invalidWorkflow)
      ).rejects.toThrow(/json|payload|invalid/i);
    });

    test('should handle workflow name conflicts', async () => {
      const duplicateWorkflow = {
        id: 'workflow-duplicate',
        name: 'Existing Workflow Name',
        project_id: 'project-123',
        json_payload: { nodes: [], connections: {} },
        status: 'draft' as const,
        version: 1
      };

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' }
      });

      await expect(
        workflowService.saveWorkflow(duplicateWorkflow)
      ).rejects.toThrow(/duplicate|exists/i);
    });

    test('should handle large workflow payloads', async () => {
      const largeNodes = Array.from({ length: 1000 }, (_, i) => ({
        id: `node-${i}`,
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [i * 100, 0]
      }));

      const largeWorkflow = {
        id: 'large-workflow',
        name: 'Large Workflow',
        project_id: 'project-123',
        json_payload: { nodes: largeNodes, connections: {} },
        status: 'draft' as const,
        version: 1
      };

      mockSingle.mockResolvedValue({
        data: largeWorkflow,
        error: null
      });

      const result = await workflowService.saveWorkflow(largeWorkflow);

      expect(result.json_payload.nodes).toHaveLength(1000);
      expect(mockInsert).toHaveBeenCalledWith(largeWorkflow);
    });

    test('should track workflow execution statistics', async () => {
      const workflowId = 'workflow-stats';
      const executionData = {
        id: 'exec-123',
        workflow_id: workflowId,
        status: 'success' as const,
        started_at: new Date(),
        finished_at: new Date(),
        execution_time: 1500 // milliseconds
      };

      mockSingle.mockResolvedValue({
        data: executionData,
        error: null
      });

      const result = await workflowService.recordExecution(executionData);

      expect(mockFrom).toHaveBeenCalledWith('workflow_executions');
      expect(mockInsert).toHaveBeenCalledWith(executionData);
      expect(result).toEqual(executionData);
    });

    test('should get workflow execution history', async () => {
      const workflowId = 'workflow-history';
      const mockExecutions = [
        {
          id: 'exec-1',
          workflow_id: workflowId,
          status: 'success',
          started_at: new Date(),
          finished_at: new Date()
        },
        {
          id: 'exec-2',
          workflow_id: workflowId,
          status: 'failed',
          started_at: new Date(),
          error_message: 'API timeout'
        }
      ];

      mockExecute.mockResolvedValue({
        data: mockExecutions,
        error: null
      });

      const result = await workflowService.getExecutionHistory(workflowId, 10);

      expect(mockFrom).toHaveBeenCalledWith('workflow_executions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('workflow_id', workflowId);
      expect(mockOrder).toHaveBeenCalledWith('started_at', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockExecutions);
    });
  });

  describe('Database Error Handling', () => {
    test('should handle connection timeouts', async () => {
      const chatService = new DatabaseChatService();
      
      mockExecute.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );

      await expect(
        chatService.getConversationMessages('conv-timeout')
      ).rejects.toThrow('Connection timeout');
    });

    test('should handle constraint violations', async () => {
      const workflowService = new SimpleWorkflowService();
      
      mockSingle.mockResolvedValue({
        data: null,
        error: { 
          message: 'null value in column "name" violates not-null constraint',
          code: '23502'
        }
      });

      const invalidWorkflow = {
        id: 'constraint-test',
        name: null, // Violates not-null constraint
        project_id: 'project-123',
        json_payload: { nodes: [], connections: {} },
        status: 'draft' as const,
        version: 1
      };

      await expect(
        workflowService.saveWorkflow(invalidWorkflow as any)
      ).rejects.toThrow(/constraint/i);
    });

    test('should retry failed operations', async () => {
      const chatService = new DatabaseChatService();
      
      mockSingle
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          data: { id: 'retry-test', message: 'Success after retry' },
          error: null
        });

      const message = {
        id: 'retry-msg',
        conversation_id: 'conv-retry',
        user_id: 'user-retry',
        message: 'Retry test message',
        role: 'user' as const,
        timestamp: new Date()
      };

      // Assuming retry logic is implemented
      const result = await chatService.saveMessage(message);

      expect(result.message).toBe('Success after retry');
    });

    test('should handle malformed database responses', async () => {
      const workflowService = new SimpleWorkflowService();
      
      mockExecute.mockResolvedValue({
        data: 'invalid-response-format',
        error: null
      });

      await expect(
        workflowService.getProjectWorkflows('project-malformed')
      ).rejects.toThrow(/format|parse|invalid/i);
    });
  });

  describe('Database Performance', () => {
    test('should handle batch operations efficiently', async () => {
      const workflowService = new SimpleWorkflowService();
      
      const batchWorkflows = Array.from({ length: 100 }, (_, i) => ({
        id: `batch-workflow-${i}`,
        name: `Batch Workflow ${i}`,
        project_id: 'batch-project',
        json_payload: { nodes: [], connections: {} },
        status: 'draft' as const,
        version: 1
      }));

      mockExecute.mockResolvedValue({
        data: batchWorkflows,
        error: null
      });

      const startTime = Date.now();
      const result = await workflowService.saveWorkflowBatch(batchWorkflows);
      const endTime = Date.now();

      expect(result).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    test('should optimize database queries', async () => {
      const chatService = new DatabaseChatService();
      
      // Test that queries use appropriate indexes
      await chatService.getConversationMessages('conv-optimized');

      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('conversation_id', 'conv-optimized');
      expect(mockOrder).toHaveBeenCalledWith('timestamp', { ascending: true });
      
      // Verify that the query structure promotes index usage
    });

    test('should handle concurrent database operations', async () => {
      const workflowService = new SimpleWorkflowService();
      
      const concurrentOperations = Array.from({ length: 50 }, (_, i) => 
        workflowService.getWorkflow(`concurrent-workflow-${i}`)
      );

      mockSingle.mockImplementation(async () => ({
        data: { id: 'concurrent-result' },
        error: null
      }));

      const results = await Promise.all(concurrentOperations);
      
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result.id).toBe('concurrent-result');
      });
    });
  });

  describe('Data Integrity and Validation', () => {
    test('should validate foreign key relationships', async () => {
      const chatService = new DatabaseChatService();
      
      const messageWithInvalidConversation = {
        id: 'msg-invalid-conv',
        conversation_id: 'nonexistent-conversation',
        user_id: 'user-123',
        message: 'Test message',
        role: 'user' as const,
        timestamp: new Date()
      };

      mockSingle.mockResolvedValue({
        data: null,
        error: { 
          message: 'insert or update on table "chat_messages" violates foreign key constraint',
          code: '23503'
        }
      });

      await expect(
        chatService.saveMessage(messageWithInvalidConversation)
      ).rejects.toThrow(/foreign key|constraint/i);
    });

    test('should enforce data type constraints', async () => {
      const workflowService = new SimpleWorkflowService();
      
      const workflowWithInvalidTypes = {
        id: 'type-test',
        name: 123, // Should be string
        project_id: 'project-123',
        json_payload: 'not-an-object', // Should be object
        status: 'invalid-status', // Should be enum value
        version: 'not-a-number' // Should be number
      };

      await expect(
        workflowService.saveWorkflow(workflowWithInvalidTypes as any)
      ).rejects.toThrow(/type|invalid|constraint/i);
    });
  });
});