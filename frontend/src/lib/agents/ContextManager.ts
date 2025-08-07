// Enhanced context management for multi-agent coordination
import { AgentContext, AgentMessage, ExecutionStep } from './types';

export interface SharedContext {
  conversationId: string;
  userId: string;
  globalMemory: Map<string, any>;
  activeWorkflow?: any;
  taskLocks: Map<string, TaskLock>;
  agentStates: Map<string, any>;
  conversationHistory: AgentMessage[];
  workflowProgress: {
    phase: string;
    progress: number;
    completedTasks: string[];
    pendingTasks: string[];
  };
}

export interface TaskLock {
  taskId: string;
  agentId: string;
  timestamp: number;
  expires: number;
  metadata?: Record<string, any>;
}

export class ContextManager {
  private static instance: ContextManager;
  private contexts: Map<string, SharedContext> = new Map();
  private readonly TASK_LOCK_TIMEOUT = 30000; // 30 seconds
  private readonly CONTEXT_TTL = 1800000; // 30 minutes
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes

  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  // Context operations
  getOrCreateContext(conversationId: string, userId: string): SharedContext {
    this.cleanupStaleContexts();
    
    if (!this.contexts.has(conversationId)) {
      const newContext: SharedContext = {
        conversationId,
        userId,
        globalMemory: new Map(),
        taskLocks: new Map(),
        agentStates: new Map(),
        conversationHistory: [],
        workflowProgress: {
          phase: 'understanding',
          progress: 0,
          completedTasks: [],
          pendingTasks: []
        }
      };
      this.contexts.set(conversationId, newContext);
      console.log(`📝 [ContextManager] Created new context for conversation: ${conversationId}`);
    }
    
    return this.contexts.get(conversationId)!;
  }

  updateGlobalMemory(conversationId: string, key: string, value: any): void {
    const context = this.contexts.get(conversationId);
    if (context) {
      context.globalMemory.set(key, {
        value,
        timestamp: Date.now(),
        agentId: 'system'
      });
      console.log(`🧠 [ContextManager] Updated global memory: ${key}`);
    }
  }

  getFromGlobalMemory(conversationId: string, key: string): any {
    const context = this.contexts.get(conversationId);
    const memoryItem = context?.globalMemory.get(key);
    return memoryItem?.value;
  }

  // Task locking to prevent duplicate work
  async acquireTaskLock(conversationId: string, taskId: string, agentId: string, metadata?: Record<string, any>): Promise<boolean> {
    const context = this.getOrCreateContext(conversationId, '');
    
    // Check if task is already locked by another agent
    const existingLock = context.taskLocks.get(taskId);
    const now = Date.now();
    
    if (existingLock) {
      // Check if lock has expired
      if (now > existingLock.expires) {
        console.log(`🔓 [ContextManager] Expired lock removed for task: ${taskId} (was held by ${existingLock.agentId})`);
        context.taskLocks.delete(taskId);
      } else if (existingLock.agentId !== agentId) {
        console.log(`⏸️ [ContextManager] Task locked by ${existingLock.agentId}: ${taskId}`);
        return false; // Task is locked by another agent
      } else {
        // Same agent, extend the lock
        existingLock.expires = now + this.TASK_LOCK_TIMEOUT;
        console.log(`🔄 [ContextManager] Extended lock for task: ${taskId}`);
        return true;
      }
    }

    // Create new lock
    const newLock: TaskLock = {
      taskId,
      agentId,
      timestamp: now,
      expires: now + this.TASK_LOCK_TIMEOUT,
      metadata
    };
    
    context.taskLocks.set(taskId, newLock);
    console.log(`🔒 [ContextManager] Acquired lock for task: ${taskId} by agent: ${agentId}`);
    return true;
  }

  releaseTaskLock(conversationId: string, taskId: string, agentId: string): void {
    const context = this.contexts.get(conversationId);
    if (!context) return;

    const lock = context.taskLocks.get(taskId);
    if (lock && lock.agentId === agentId) {
      context.taskLocks.delete(taskId);
      console.log(`🔓 [ContextManager] Released lock for task: ${taskId}`);
    }
  }

  // Agent state management
  updateAgentState(conversationId: string, agentId: string, state: any): void {
    const context = this.contexts.get(conversationId);
    if (context) {
      context.agentStates.set(agentId, {
        ...state,
        lastUpdate: Date.now()
      });
    }
  }

  getAgentState(conversationId: string, agentId: string): any {
    const context = this.contexts.get(conversationId);
    return context?.agentStates.get(agentId);
  }

  getAllAgentStates(conversationId: string): Record<string, any> {
    const context = this.contexts.get(conversationId);
    if (!context) return {};

    const states: Record<string, any> = {};
    for (const [agentId, state] of context.agentStates.entries()) {
      states[agentId] = state;
    }
    return states;
  }

  // Conversation history management
  addMessage(conversationId: string, message: AgentMessage): void {
    const context = this.contexts.get(conversationId);
    if (context) {
      context.conversationHistory.push(message);
      
      // Keep only last 50 messages to prevent memory bloat
      if (context.conversationHistory.length > 50) {
        context.conversationHistory = context.conversationHistory.slice(-50);
      }
    }
  }

  getConversationHistory(conversationId: string, limit = 10): AgentMessage[] {
    const context = this.contexts.get(conversationId);
    if (!context) return [];

    return context.conversationHistory.slice(-limit);
  }

  // Workflow progress tracking
  updateWorkflowProgress(conversationId: string, phase: string, progress: number): void {
    const context = this.contexts.get(conversationId);
    if (context) {
      context.workflowProgress.phase = phase;
      context.workflowProgress.progress = progress;
    }
  }

  markTaskCompleted(conversationId: string, taskId: string): void {
    const context = this.contexts.get(conversationId);
    if (context) {
      if (!context.workflowProgress.completedTasks.includes(taskId)) {
        context.workflowProgress.completedTasks.push(taskId);
      }
      
      // Remove from pending tasks
      const index = context.workflowProgress.pendingTasks.indexOf(taskId);
      if (index > -1) {
        context.workflowProgress.pendingTasks.splice(index, 1);
      }
      
      // Release task lock
      this.releaseTaskLock(conversationId, taskId, 'system');
    }
  }

  addPendingTask(conversationId: string, taskId: string): void {
    const context = this.contexts.get(conversationId);
    if (context && !context.workflowProgress.pendingTasks.includes(taskId)) {
      context.workflowProgress.pendingTasks.push(taskId);
    }
  }

  // Context relevance and pruning
  getRelevantContext(conversationId: string, agentId: string, query: string): any {
    const context = this.contexts.get(conversationId);
    if (!context) return {};

    // Simple relevance scoring based on keywords
    const keywords = query.toLowerCase().split(/\s+/);
    const relevantMemory: Record<string, any> = {};
    
    for (const [key, memoryItem] of context.globalMemory.entries()) {
      const score = this.calculateRelevanceScore(key, memoryItem.value, keywords);
      if (score > 0.1) { // Threshold for relevance
        relevantMemory[key] = {
          ...memoryItem,
          relevanceScore: score
        };
      }
    }

    return {
      globalMemory: relevantMemory,
      agentState: context.agentStates.get(agentId),
      workflowProgress: context.workflowProgress,
      recentMessages: this.getConversationHistory(conversationId, 5)
    };
  }

  private calculateRelevanceScore(key: string, value: any, keywords: string[]): number {
    const text = `${key} ${JSON.stringify(value)}`.toLowerCase();
    let score = 0;
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 1;
      }
    });
    
    return score / keywords.length;
  }

  // Cleanup operations
  private cleanupStaleContexts(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL) return;

    const staleContexts: string[] = [];
    
    for (const [conversationId, context] of this.contexts.entries()) {
      // Check if context is stale based on last agent activity
      const lastActivity = Math.max(
        ...Array.from(context.agentStates.values())
          .map(state => state.lastUpdate || 0),
        ...context.conversationHistory.map(msg => msg.timestamp)
      );
      
      if (now - lastActivity > this.CONTEXT_TTL) {
        staleContexts.push(conversationId);
      } else {
        // Cleanup expired task locks within active contexts
        const expiredLocks: string[] = [];
        for (const [taskId, lock] of context.taskLocks.entries()) {
          if (now > lock.expires) {
            expiredLocks.push(taskId);
          }
        }
        expiredLocks.forEach(taskId => context.taskLocks.delete(taskId));
        
        if (expiredLocks.length > 0) {
          console.log(`🔓 [ContextManager] Cleaned up ${expiredLocks.length} expired task locks`);
        }
      }
    }
    
    staleContexts.forEach(conversationId => {
      this.contexts.delete(conversationId);
      console.log(`🗑️ [ContextManager] Cleaned up stale context: ${conversationId}`);
    });
    
    this.lastCleanup = now;
  }

  // Debug and monitoring
  getStats(): Record<string, any> {
    const stats = {
      activeContexts: this.contexts.size,
      totalTaskLocks: 0,
      totalMemoryItems: 0,
      totalMessages: 0,
      contexts: [] as any[]
    };

    for (const [conversationId, context] of this.contexts.entries()) {
      stats.totalTaskLocks += context.taskLocks.size;
      stats.totalMemoryItems += context.globalMemory.size;
      stats.totalMessages += context.conversationHistory.length;
      
      stats.contexts.push({
        conversationId: conversationId.substring(0, 8) + '...',
        agentCount: context.agentStates.size,
        memoryItems: context.globalMemory.size,
        taskLocks: context.taskLocks.size,
        messages: context.conversationHistory.length,
        phase: context.workflowProgress.phase,
        progress: context.workflowProgress.progress
      });
    }

    return stats;
  }

  cleanup(): void {
    this.contexts.clear();
    console.log('🧹 [ContextManager] Full cleanup completed');
  }
}

export const contextManager = ContextManager.getInstance();