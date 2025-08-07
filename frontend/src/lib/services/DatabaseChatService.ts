import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

// Types for multi-agent chat system
export interface MultiAgentResponse {
  message: string;
  agentType: AgentType;
  sessionId: string;
  status: 'success' | 'error' | 'processing';
  metadata?: {
    tokensUsed?: number;
    processingTime?: number;
    agentReasoning?: string;
  };
}

export type AgentType = 'orchestrator' | 'workflow_designer' | 'deployment' | 'system';

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived';
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  role: 'user' | 'assistant';
  agent_type?: AgentType;
  created_at: string;
  metadata?: any;
}

export class DatabaseChatService {
  private user: User | null = null;

  constructor(user: User) {
    this.user = user;
  }

  async createSession(title: string = 'New Chat'): Promise<ChatSession> {
    if (!this.user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('create_chat_session', {
      p_user_id: this.user.id,
      p_title: title
    });

    if (error) {
      console.error('Error creating chat session:', error);
      throw new Error(`Failed to create chat session: ${error.message}`);
    }

    return data;
  }

  async getSessions(): Promise<ChatSession[]> {
    if (!this.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .select('*')
      .eq('user_id', this.user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    return data || [];
  }

  async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    if (!this.user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('get_conversation_history', {
      p_session_id: sessionId,
      p_user_id: this.user.id
    });

    if (error) {
      console.error('Error fetching conversation history:', error);
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }

    return data || [];
  }

  async sendMessage(
    sessionId: string, 
    message: string, 
    agentType: AgentType = 'orchestrator'
  ): Promise<MultiAgentResponse> {
    if (!this.user) throw new Error('User not authenticated');

    try {
      console.log('🤖 Sending message to database:', {
        sessionId,
        message,
        agentType,
        userId: this.user.id
      });

      const { data, error } = await supabase.rpc('process_multi_agent_chat', {
        p_user_id: this.user.id,
        p_session_id: sessionId,
        p_user_message: message,
        p_agent_type: agentType
      });

      if (error) {
        console.error('❌ Database chat error:', error);
        throw new Error(`Chat processing failed: ${error.message}`);
      }

      console.log('✅ Database chat response:', data);

      return {
        message: data.response || 'No response generated',
        agentType: data.agent_type || agentType,
        sessionId,
        status: 'success',
        metadata: {
          tokensUsed: data.tokens_used,
          processingTime: data.processing_time,
          agentReasoning: data.agent_reasoning
        }
      };
    } catch (error) {
      console.error('💥 Chat service error:', error);
      return {
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        agentType,
        sessionId,
        status: 'error'
      };
    }
  }

  async testDatabaseConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Use a simple select query instead of count(*) to avoid parsing issues
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('id')
        .eq('user_id', this.user?.id || 'test')
        .limit(1);

      if (error) {
        return {
          success: false,
          message: `Database connection failed: ${error.message}`
        };
      }

      // Try to get actual count using head() method
      const { count, error: countError } = await supabase
        .from('ai_chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.user?.id || 'test');

      const sessionCount = countError ? 0 : (count || 0);

      return {
        success: true,
        message: `Database connected successfully. User has ${sessionCount} sessions.`
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getSystemStats(): Promise<any> {
    if (!this.user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('id, agent_type, created_at')
        .eq('user_id', this.user.id);

      if (error) throw error;

      const stats = {
        totalMessages: data?.length || 0,
        agentBreakdown: data?.reduce((acc: any, msg) => {
          const agent = msg.agent_type || 'unknown';
          acc[agent] = (acc[agent] || 0) + 1;
          return acc;
        }, {}),
        lastActivity: data?.[0]?.created_at || 'Never'
      };

      return stats;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}