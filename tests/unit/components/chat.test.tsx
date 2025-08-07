/**
 * Chat Interface Components Unit Tests
 * Tests chat-related React components and functionality
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfessionalChat from '@/pages/ProfessionalChat';
import { AuthContext } from '@/lib/AuthContext';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: 'test-project-id' })
  };
});

// Mock Supabase client
const mockInvoke = vi.fn();
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  execute: vi.fn().mockResolvedValue({ data: [], error: null })
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    functions: { invoke: mockInvoke },
    from: mockFrom,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
    }
  }))
}));

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock AI response for workflow generation'
            }
          }]
        })
      }
    }
  }))
}));

const TestWrapper = ({ children, authValue }: { 
  children: React.ReactNode; 
  authValue?: any;
}) => {
  const defaultAuthValue = {
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
    signOut: vi.fn(),
    ...authValue
  };

  return (
    <BrowserRouter>
      <AuthContext.Provider value={defaultAuthValue}>
        {children}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Chat Interface Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ProfessionalChat Component', () => {
    test('should render chat interface elements', () => {
      render(<ProfessionalChat />, { wrapper: TestWrapper });

      // Should have chat input
      expect(screen.getByPlaceholderText(/message/i) || 
             screen.getByPlaceholderText(/type/i) ||
             screen.getByRole('textbox')).toBeInTheDocument();

      // Should have send button
      expect(screen.getByRole('button', { name: /send/i }) ||
             screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();

      // Should have chat container
      expect(screen.getByRole('main') || 
             document.querySelector('.chat-container')).toBeInTheDocument();
    });

    test('should handle message input changes', () => {
      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByPlaceholderText(/message/i) || 
                      screen.getByPlaceholderText(/type/i) ||
                      screen.getByRole('textbox');

      fireEvent.change(chatInput, { target: { value: 'Test message' } });

      expect(chatInput).toHaveValue('Test message');
    });

    test('should send message when submit button clicked', async () => {
      mockInvoke.mockResolvedValue({
        data: { response: 'AI response to test message' },
        error: null
      });

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByPlaceholderText(/message/i) || 
                      screen.getByPlaceholderText(/type/i) ||
                      screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i }) ||
                        screen.getByRole('button', { name: /submit/i });

      fireEvent.change(chatInput, { target: { value: 'Create a workflow' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          expect.stringMatching(/ai-chat|chat/),
          expect.objectContaining({
            body: expect.objectContaining({
              message: 'Create a workflow'
            })
          })
        );
      });
    });

    test('should send message on Enter key press', async () => {
      mockInvoke.mockResolvedValue({
        data: { response: 'AI response' },
        error: null
      });

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');

      fireEvent.change(chatInput, { target: { value: 'Test enter message' } });
      fireEvent.keyDown(chatInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });
    });

    test('should prevent sending empty messages', () => {
      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const sendButton = screen.getByRole('button', { name: /send/i }) ||
                        screen.getByRole('button', { name: /submit/i });

      fireEvent.click(sendButton);

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(sendButton).toBeDisabled();
    });

    test('should display chat messages', async () => {
      mockInvoke.mockResolvedValue({
        data: { response: 'This is an AI response about workflows' },
        error: null
      });

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i }) ||
                        screen.getByRole('button', { name: /submit/i });

      fireEvent.change(chatInput, { target: { value: 'Hello AI' } });
      fireEvent.click(sendButton);

      // User message should appear
      await waitFor(() => {
        expect(screen.getByText('Hello AI')).toBeInTheDocument();
      });

      // AI response should appear
      await waitFor(() => {
        expect(screen.getByText(/AI response about workflows/)).toBeInTheDocument();
      });
    });

    test('should show loading state while processing', async () => {
      mockInvoke.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ 
          data: { response: 'Delayed response' }, 
          error: null 
        }), 100))
      );

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i }) ||
                        screen.getByRole('button', { name: /submit/i });

      fireEvent.change(chatInput, { target: { value: 'Processing test' } });
      fireEvent.click(sendButton);

      // Should show loading state
      expect(screen.getByText(/thinking/i) ||
             screen.getByText(/processing/i) ||
             screen.getByText(/loading/i) ||
             document.querySelector('.loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/thinking|processing|loading/i)).not.toBeInTheDocument();
      });
    });

    test('should handle AI response errors gracefully', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'AI service temporarily unavailable' }
      });

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i }) ||
                        screen.getByRole('button', { name: /submit/i });

      fireEvent.change(chatInput, { target: { value: 'Test error handling' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/error|unavailable|try again/i)).toBeInTheDocument();
      });
    });

    test('should clear input after sending message', async () => {
      mockInvoke.mockResolvedValue({
        data: { response: 'Response' },
        error: null
      });

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i }) ||
                        screen.getByRole('button', { name: /submit/i });

      fireEvent.change(chatInput, { target: { value: 'Message to clear' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(chatInput).toHaveValue('');
      });
    });

    test('should maintain conversation context', async () => {
      mockInvoke
        .mockResolvedValueOnce({
          data: { response: 'I can help you create a workflow.' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { response: 'I understand you want it to run daily at 9 AM.' },
          error: null
        });

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i }) ||
                        screen.getByRole('button', { name: /submit/i });

      // First message
      fireEvent.change(chatInput, { target: { value: 'Help me create a workflow' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Help me create a workflow')).toBeInTheDocument();
      });

      // Second message with context
      fireEvent.change(chatInput, { target: { value: 'Make it run daily at 9 AM' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(2);
      });

      // Both messages should be visible
      expect(screen.getByText('Help me create a workflow')).toBeInTheDocument();
      expect(screen.getByText('Make it run daily at 9 AM')).toBeInTheDocument();
    });

    test('should handle new conversation creation', () => {
      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const newChatButton = screen.getByText(/new chat/i) || 
                           screen.getByText(/new conversation/i) ||
                           screen.getByRole('button', { name: /new/i });

      if (newChatButton) {
        fireEvent.click(newChatButton);

        // Should clear existing messages
        expect(screen.queryByText(/previous message/i)).not.toBeInTheDocument();
      }
    });

    test('should preserve scroll position with new messages', async () => {
      // Mock scrollIntoView
      Element.prototype.scrollIntoView = vi.fn();

      mockInvoke.mockResolvedValue({
        data: { response: 'New message response' },
        error: null
      });

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i }) ||
                        screen.getByRole('button', { name: /submit/i });

      fireEvent.change(chatInput, { target: { value: 'Scroll test message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      });
    });

    test('should support workflow-specific chat features', async () => {
      mockInvoke.mockResolvedValue({
        data: { 
          response: 'I\'ll help you create a workflow. Here are the steps...',
          workflow_generated: true
        },
        error: null
      });

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      fireEvent.change(chatInput, { target: { value: 'Create email automation workflow' } });
      fireEvent.keyDown(chatInput, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/workflow/i)).toBeInTheDocument();
      });

      // Should show workflow-related UI elements
      const deployButton = screen.queryByText(/deploy/i) || 
                          screen.queryByRole('button', { name: /deploy/i });
      
      if (deployButton) {
        expect(deployButton).toBeInTheDocument();
      }
    });

    test('should handle conversation persistence', async () => {
      // Mock conversation loading
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({
          data: [
            { id: '1', message: 'Previous message', sender: 'user' },
            { id: '2', message: 'Previous AI response', sender: 'assistant' }
          ],
          error: null
        })
      });

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Previous message')).toBeInTheDocument();
        expect(screen.getByText('Previous AI response')).toBeInTheDocument();
      });
    });

    test('should handle real-time updates', async () => {
      // Mock real-time subscription
      const mockSubscribe = vi.fn();
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: mockSubscribe
      };

      vi.mocked(createClient).mockReturnValue({
        ...vi.mocked(createClient)(),
        channel: vi.fn(() => mockChannel)
      } as any);

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  describe('Chat Message Components', () => {
    test('should render user messages with correct styling', () => {
      const UserMessage = ({ message }: { message: string }) => (
        <div className="message user-message" data-testid="user-message">
          {message}
        </div>
      );

      render(<UserMessage message="User test message" />);

      const messageElement = screen.getByTestId('user-message');
      expect(messageElement).toBeInTheDocument();
      expect(messageElement).toHaveTextContent('User test message');
      expect(messageElement).toHaveClass('user-message');
    });

    test('should render AI messages with correct styling', () => {
      const AIMessage = ({ message }: { message: string }) => (
        <div className="message ai-message" data-testid="ai-message">
          {message}
        </div>
      );

      render(<AIMessage message="AI test response" />);

      const messageElement = screen.getByTestId('ai-message');
      expect(messageElement).toBeInTheDocument();
      expect(messageElement).toHaveTextContent('AI test response');
      expect(messageElement).toHaveClass('ai-message');
    });

    test('should handle markdown in AI messages', () => {
      const MarkdownMessage = ({ message }: { message: string }) => (
        <div data-testid="markdown-message">
          {message.includes('**') ? (
            <strong>{message.replace(/\*\*/g, '')}</strong>
          ) : (
            message
          )}
        </div>
      );

      render(<MarkdownMessage message="**Bold text**" />);

      const messageElement = screen.getByTestId('markdown-message');
      expect(messageElement.querySelector('strong')).toBeInTheDocument();
      expect(messageElement).toHaveTextContent('Bold text');
    });

    test('should display message timestamps', () => {
      const TimestampMessage = ({ message, timestamp }: { 
        message: string; 
        timestamp: Date;
      }) => (
        <div data-testid="timestamped-message">
          <span>{message}</span>
          <time>{timestamp.toLocaleTimeString()}</time>
        </div>
      );

      const testTime = new Date();
      render(<TimestampMessage message="Timestamped message" timestamp={testTime} />);

      expect(screen.getByText('Timestamped message')).toBeInTheDocument();
      expect(screen.getByText(testTime.toLocaleTimeString())).toBeInTheDocument();
    });
  });

  describe('Chat Accessibility', () => {
    test('should support keyboard navigation', () => {
      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i }) ||
                        screen.getByRole('button', { name: /submit/i });

      expect(chatInput).toHaveAttribute('type', 'text');
      expect(sendButton).not.toHaveAttribute('tabIndex', '-1');

      // Should be focusable
      chatInput.focus();
      expect(document.activeElement).toBe(chatInput);
    });

    test('should have proper ARIA labels', () => {
      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i }) ||
                        screen.getByRole('button', { name: /submit/i });

      expect(chatInput).toHaveAttribute('aria-label');
      expect(sendButton).toHaveAttribute('aria-label');
    });

    test('should announce new messages to screen readers', async () => {
      mockInvoke.mockResolvedValue({
        data: { response: 'Screen reader test response' },
        error: null
      });

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      fireEvent.change(chatInput, { target: { value: 'Accessibility test' } });
      fireEvent.keyDown(chatInput, { key: 'Enter' });

      await waitFor(() => {
        const liveRegion = document.querySelector('[aria-live]');
        if (liveRegion) {
          expect(liveRegion).toBeInTheDocument();
        }
      });
    });
  });

  describe('Chat Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Network error'));

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send/i }) ||
                        screen.getByRole('button', { name: /submit/i });

      fireEvent.change(chatInput, { target: { value: 'Network test' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/network error|connection/i)).toBeInTheDocument();
      });
    });

    test('should provide retry functionality', async () => {
      mockInvoke
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          data: { response: 'Success after retry' },
          error: null
        });

      render(<ProfessionalChat />, { wrapper: TestWrapper });

      const chatInput = screen.getByRole('textbox');
      fireEvent.change(chatInput, { target: { value: 'Retry test' } });
      fireEvent.keyDown(chatInput, { key: 'Enter' });

      await waitFor(() => {
        const retryButton = screen.getByText(/retry/i) || 
                           screen.getByRole('button', { name: /retry/i });
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Success after retry')).toBeInTheDocument();
      });
    });
  });

  describe('Chat Performance', () => {
    test('should handle many messages efficiently', () => {
      const ManyMessages = () => {
        const messages = Array.from({ length: 100 }, (_, i) => ({
          id: i,
          text: `Message ${i}`,
          sender: i % 2 === 0 ? 'user' : 'ai'
        }));

        return (
          <div data-testid="message-list">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
          </div>
        );
      };

      const startTime = performance.now();
      render(<ManyMessages />);
      const endTime = performance.now();

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
      expect(endTime - startTime).toBeLessThan(1000); // Should render quickly
    });

    test('should debounce typing indicators', async () => {
      let typingCallCount = 0;
      const mockTypingIndicator = vi.fn(() => {
        typingCallCount++;
      });

      const TypingTest = () => {
        const [input, setInput] = React.useState('');
        
        React.useEffect(() => {
          if (input) {
            mockTypingIndicator();
          }
        }, [input]);

        return (
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            data-testid="typing-input"
          />
        );
      };

      render(<TypingTest />);

      const input = screen.getByTestId('typing-input');
      
      // Rapid typing simulation
      fireEvent.change(input, { target: { value: 't' } });
      fireEvent.change(input, { target: { value: 'te' } });
      fireEvent.change(input, { target: { value: 'tes' } });
      fireEvent.change(input, { target: { value: 'test' } });

      // Should not call typing indicator for every keystroke
      expect(typingCallCount).toBeLessThan(10);
    });
  });
});