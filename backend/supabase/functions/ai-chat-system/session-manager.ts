import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Session management utilities for AI chat system
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface SessionListItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Get user's chat sessions with message previews
export const getUserSessions = async (userId: string): Promise<SessionListItem[]> => {
  try {
    const { data: sessions, error } = await supabase
      .from('ai_chat_sessions')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        ai_chat_messages(content, created_at, role)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }

    return sessions?.map(session => {
      const messages = (session as any).ai_chat_messages || [];
      const lastMessage = messages[messages.length - 1];
      
      return {
        id: session.id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        message_count: messages.length,
        last_message_preview: lastMessage 
          ? (lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : ''))
          : 'No messages yet',
      };
    }) || [];
  } catch (error) {
    console.error('Error in getUserSessions:', error);
    return [];
  }
};

// Create a new chat session with intelligent title generation
export const createNewSession = async (
  userId: string, 
  firstMessage?: string
): Promise<ChatSession | null> => {
  try {
    // Generate intelligent title from first message
    let title = 'New AI Chat';
    if (firstMessage) {
      // Extract key topics or create a short summary
      const words = firstMessage.split(' ').slice(0, 5);
      title = words.join(' ');
      if (firstMessage.length > title.length) {
        title += '...';
      }
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);
      // Limit title length
      if (title.length > 50) {
        title = title.substring(0, 47) + '...';
      }
    }

    const { data: newSession, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        user_id: userId,
        title,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating new session:', error);
      return null;
    }

    return newSession;
  } catch (error) {
    console.error('Error in createNewSession:', error);
    return null;
  }
};

// Update session title
export const updateSessionTitle = async (
  sessionId: string,
  userId: string,
  newTitle: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ai_chat_sessions')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating session title:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateSessionTitle:', error);
    return false;
  }
};

// Archive a session
export const archiveSession = async (
  sessionId: string,
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ai_chat_sessions')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error archiving session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in archiveSession:', error);
    return false;
  }
};

// Delete a session and all its messages
export const deleteSession = async (
  sessionId: string,
  userId: string
): Promise<boolean> => {
  try {
    // Delete messages first (due to foreign key constraint)
    const { error: messagesError } = await supabase
      .from('ai_chat_messages')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (messagesError) {
      console.error('Error deleting session messages:', messagesError);
      return false;
    }

    // Delete agent states
    await supabase
      .from('ai_agent_states')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    // Delete session
    const { error: sessionError } = await supabase
      .from('ai_chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (sessionError) {
      console.error('Error deleting session:', sessionError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteSession:', error);
    return false;
  }
};

// Get session with full details
export const getSessionDetails = async (
  sessionId: string,
  userId: string
): Promise<ChatSession | null> => {
  try {
    const { data: session, error } = await supabase
      .from('ai_chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching session details:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error in getSessionDetails:', error);
    return null;
  }
};