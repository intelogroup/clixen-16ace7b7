import { AIModel } from '../../components/ModelSelector';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
  error?: string;
}

export class AIModelService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }

  async streamChat(
    model: AIModel,
    messages: ChatMessage[],
    onStream: (response: StreamingResponse) => void
  ): Promise<void> {
    try {
      const functionName = this.getFunctionName(model);
      const response = await fetch(`${this.supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          model,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            onStream({ content: '', isComplete: true });
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  onStream({ 
                    content: data.content, 
                    isComplete: false 
                  });
                }
                if (data.error) {
                  onStream({ 
                    content: '', 
                    isComplete: true, 
                    error: data.error 
                  });
                  return;
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Stream chat error:', error);
      onStream({ 
        content: '', 
        isComplete: true, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private getFunctionName(model: AIModel): string {
    if (model.startsWith('gpt-')) {
      return 'openai-chat';
    } else if (model.startsWith('claude-')) {
      return 'claude-chat';
    }
    throw new Error(`Unsupported model: ${model}`);
  }

  async sendMessage(
    model: AIModel,
    messages: ChatMessage[]
  ): Promise<string> {
    try {
      const functionName = this.getFunctionName(model);
      const response = await fetch(`${this.supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          model,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.content || data.message || 'No response received';
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }
}

export const aiModelService = new AIModelService();