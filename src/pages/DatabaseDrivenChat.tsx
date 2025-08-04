import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { DatabaseChatService, MultiAgentResponse, ChatMessage, AgentType } from '../lib/services/DatabaseChatService';
import { Send, Bot, User, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

const DatabaseDrivenChat: React.FC = () => {
  const { user } = useAuth();
  const [chatService, setChatService] = useState<DatabaseChatService | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<string>('Initializing...');
  const [agentStatus, setAgentStatus] = useState<AgentType>('orchestrator');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat service and create session
  useEffect(() => {
    if (user) {
      const service = new DatabaseChatService(user);
      setChatService(service);
      initializeChat(service);
    }
  }, [user]);

  const initializeChat = async (service: DatabaseChatService) => {
    try {
      setSystemStatus('Testing database connection...');
      const testResult = await service.testDatabaseConnection();
      
      if (!testResult.success) {
        setSystemStatus(`❌ ${testResult.message}`);
        return;
      }

      setSystemStatus('Creating chat session...');
      const session = await service.createSession('Database-Driven Chat');
      setCurrentSessionId(session.id);
      setSystemStatus(`✅ Connected - Session: ${session.id.substring(0, 8)}`);
      
      // Load conversation history
      const history = await service.getConversationHistory(session.id);
      setMessages(history);
    } catch (error) {
      console.error('Chat initialization error:', error);
      setSystemStatus(`❌ Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const messageToSend = messageText || input.trim();
    if (!messageToSend || !chatService || !currentSessionId) return;

    // Handle debug commands
    if (messageToSend.startsWith('/')) {
      await handleDebugCommand(messageToSend);
      setInput('');
      return;
    }

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: currentSessionId,
      user_id: user?.id || '',
      content: messageToSend,
      role: 'user',
      created_at: new Date().toISOString(),
      metadata: {}
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setSystemStatus('🤖 Processing with AI agents...');

    try {
      const response: MultiAgentResponse = await chatService.sendMessage(
        currentSessionId,
        messageToSend,
        agentStatus
      );

      // Add AI response
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        session_id: currentSessionId,
        user_id: user?.id || '',
        content: response.message,
        role: 'assistant',
        agent_type: response.agentType,
        created_at: new Date().toISOString(),
        metadata: response.metadata
      };

      setMessages(prev => [...prev, aiMessage]);
      setSystemStatus(`✅ Response from ${response.agentType} agent`);
    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        session_id: currentSessionId,
        user_id: user?.id || '',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'assistant',
        agent_type: 'system',
        created_at: new Date().toISOString(),
        metadata: {}
      };
      setMessages(prev => [...prev, errorMessage]);
      setSystemStatus('❌ Message failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebugCommand = async (command: string) => {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/debug':
        await handleSendMessage('Show me the current system status and debug information');
        break;
      case '/stats':
        if (chatService) {
          const stats = await chatService.getSystemStats();
          setMessages(prev => [...prev, {
            id: `stats-${Date.now()}`,
            session_id: currentSessionId,
            user_id: user?.id || '',
            content: `📊 **System Stats**\n\n${JSON.stringify(stats, null, 2)}`,
            role: 'assistant',
            agent_type: 'system',
            created_at: new Date().toISOString(),
            metadata: {}
          }]);
        }
        break;
      case '/test-db':
        if (chatService) {
          const testResult = await chatService.testDatabaseConnection();
          setMessages(prev => [...prev, {
            id: `test-${Date.now()}`,
            session_id: currentSessionId,
            user_id: user?.id || '',
            content: `🔌 **Database Test**\n\n${testResult.success ? '✅' : '❌'} ${testResult.message}`,
            role: 'assistant',
            agent_type: 'system',
            created_at: new Date().toISOString(),
            metadata: {}
          }]);
        }
        break;
      case '/agent':
        const newAgent = parts[1] as AgentType;
        if (['orchestrator', 'workflow_designer', 'deployment'].includes(newAgent)) {
          setAgentStatus(newAgent);
          setSystemStatus(`🔄 Switched to ${newAgent} agent`);
        }
        break;
      default:
        setMessages(prev => [...prev, {
          id: `help-${Date.now()}`,
          session_id: currentSessionId,
          user_id: user?.id || '',
          content: `🤖 **Available Commands:**\n\n/debug - Show system debug info\n/stats - Show usage statistics\n/test-db - Test database connection\n/agent [orchestrator|workflow_designer|deployment] - Switch agent type`,
          role: 'assistant',
          agent_type: 'system',
          created_at: new Date().toISOString(),
          metadata: {}
        }]);
    }
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  };

  const getAgentIcon = (agentType?: AgentType) => {
    switch (agentType) {
      case 'orchestrator': return <Bot className="w-4 h-4 text-blue-500" />;
      case 'workflow_designer': return <Zap className="w-4 h-4 text-purple-500" />;
      case 'deployment': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'system': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <Bot className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access the chat system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Database-Driven AI Chat</h1>
            <p className="text-sm text-gray-600">Multi-Agent Workflow System</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">{systemStatus}</span>
            </div>
            <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
              {getAgentIcon(agentStatus)}
              <span className="text-sm font-medium capitalize">{agentStatus.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Welcome to Database-Driven Chat</h3>
            <p className="mb-4">Start a conversation with our AI agents:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-white p-4 rounded-lg border">
                <Bot className="w-8 h-8 text-blue-500 mb-2" />
                <h4 className="font-medium">Orchestrator</h4>
                <p className="text-sm text-gray-600">Main conversation manager</p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <Zap className="w-8 h-8 text-purple-500 mb-2" />
                <h4 className="font-medium">Workflow Designer</h4>
                <p className="text-sm text-gray-600">n8n workflow specialist</p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                <h4 className="font-medium">Deployment</h4>
                <p className="text-sm text-gray-600">Production deployment</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border shadow-sm'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center space-x-2 mb-1">
                    {getAgentIcon(message.agent_type)}
                    <span className="text-xs font-medium text-gray-600 capitalize">
                      {message.agent_type?.replace('_', ' ') || 'AI'}
                    </span>
                  </div>
                )}
                <div
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  className={`text-sm ${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}
                />
                {message.metadata?.tokensUsed && (
                  <div className="text-xs text-gray-400 mt-1">
                    Tokens: {message.metadata.tokensUsed}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border shadow-sm rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400 animate-spin" />
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message... (or /help for commands)"
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || !currentSessionId}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !input.trim() || !currentSessionId}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-full p-2 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 text-center">
          Commands: /debug, /stats, /test-db, /agent [type]
        </div>
      </div>
    </div>
  );
};

export default DatabaseDrivenChat;