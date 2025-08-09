import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LoadingButton } from '../components/LoadingButton';
import { ArrowLeft, Plus, Send, MessageCircle, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
}

interface Workflow {
  id: string;
  name: string;
  status: 'draft' | 'deployed' | 'error' | 'generating';
  webhook_url?: string;
  created_at: string;
}

const StandardChat: React.FC = () => {
  const navigate = useNavigate();
  const { projectId, conversationId } = useParams();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [conversationTitle, setConversationTitle] = useState('New Conversation');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load conversation history
  useEffect(() => {
    const loadConversation = async () => {
      if (!user || !conversationId || conversationId === 'new') return;

      try {
        const { data: conversation } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('user_id', user.id)
          .single();

        if (conversation) {
          setConversationTitle(conversation.title || 'Workflow Chat');
          setMessages(conversation.messages || []);
          
          // Load associated workflow if exists
          if (conversation.workflow_id) {
            const { data: workflow } = await supabase
              .from('workflows')
              .select('*')
              .eq('id', conversation.workflow_id)
              .single();
            
            if (workflow) {
              setCurrentWorkflow(workflow);
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
    };

    loadConversation();
  }, [conversationId, user]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Mark user message as sent
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
      ));

      // Call the workflow generator
      const { data, error } = await supabase.functions.invoke('ai-chat-simple', {
        body: {
          message: userMessage.content,
          conversationHistory: messages,
          userId: user.id,
          projectId,
          conversationId: conversationId === 'new' ? null : conversationId
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If workflow was generated
      if (data.workflowGenerated) {
        setIsGeneratingWorkflow(true);
        setCurrentWorkflow({
          id: data.workflowId,
          name: data.workflowName,
          status: 'generating',
          created_at: new Date().toISOString()
        });

        // Update conversation title if it's a new conversation
        if (conversationId === 'new' && data.conversationId) {
          setConversationTitle(data.workflowName || 'Workflow Chat');
          navigate(`/projects/${projectId}/chat/${data.conversationId}`, { replace: true });
        }
      }

      // If workflow was deployed
      if (data.workflowDeployed && data.webhookUrl) {
        setCurrentWorkflow(prev => prev ? {
          ...prev,
          status: 'deployed',
          webhook_url: data.webhookUrl
        } : null);

        const deploymentMessage: Message = {
          id: crypto.randomUUID(),
          role: 'system',
          content: `✅ Workflow deployed successfully! Your webhook URL is ready.`,
          timestamp: new Date().toISOString(),
          status: 'sent'
        };

        setMessages(prev => [...prev, deploymentMessage]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      setMessages(prev => [...prev, errorMessage]);
      
      // Mark user message as error
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
      ));
    } finally {
      setIsLoading(false);
      setIsGeneratingWorkflow(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewChat = () => {
    navigate(`/projects/${projectId}/chat/new`);
    setMessages([]);
    setCurrentWorkflow(null);
    setConversationTitle('New Conversation');
    inputRef.current?.focus();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <Loader2 className="h-3 w-3 animate-spin text-gray-400" />;
      case 'sent':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const EmptyState = () => (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <MessageCircle className="h-12 w-12 text-gray-300 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Start a conversation
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Describe the workflow you'd like to create using natural language. I'll ask clarifying questions and help you build it.
        </p>
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium">Try asking:</p>
          <div className="space-y-1 text-xs text-gray-500">
            <p>"Create a workflow that sends me an email when someone fills out my contact form"</p>
            <p>"Set up automated social media posting from my blog RSS feed"</p>
            <p>"Build a data sync between my CRM and email marketing tool"</p>
          </div>
        </div>
      </div>
    </div>
  );

  const ChatMessage = ({ message }: { message: Message }) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] sm:max-w-[70%] ${isUser ? 'order-2' : 'order-1'}`}>
          <div
            className={`
              px-4 py-3 rounded-2xl text-sm leading-relaxed
              ${isUser 
                ? 'bg-blue-500 text-white rounded-br-md' 
                : isSystem
                ? 'bg-green-50 text-green-800 border border-green-200 rounded-bl-md'
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }
            `}
          >
            {message.content}
          </div>
          <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-400">
              {formatTimestamp(message.timestamp)}
            </span>
            {isUser && getStatusIcon(message.status)}
          </div>
        </div>
      </div>
    );
  };

  const WorkflowStatus = () => {
    if (!currentWorkflow) return null;

    return (
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`
              h-2 w-2 rounded-full 
              ${currentWorkflow.status === 'deployed' ? 'bg-green-500' : 
                currentWorkflow.status === 'generating' ? 'bg-yellow-500 animate-pulse' : 
                currentWorkflow.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}
            `} />
            <div>
              <p className="text-sm font-medium text-gray-900">{currentWorkflow.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {currentWorkflow.status === 'generating' ? 'Generating workflow...' : 
                 currentWorkflow.status === 'deployed' ? 'Deployed' : 
                 currentWorkflow.status}
              </p>
            </div>
          </div>
          {currentWorkflow.webhook_url && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(currentWorkflow.webhook_url!)}
              className="text-xs"
            >
              Copy Webhook
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="p-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {conversationTitle}
              </h1>
              <p className="text-xs text-gray-500">Workflow Assistant</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={startNewChat}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>
      </div>

      {/* Workflow Status */}
      <WorkflowStatus />

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-4 space-y-1">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isGeneratingWorkflow && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[70%]">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Generating your workflow...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe the workflow you want to create..."
              className="pr-12 resize-none min-h-[44px] rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          <LoadingButton
            onClick={handleSendMessage}
            loading={isLoading}
            disabled={!inputMessage.trim() || isLoading}
            className="rounded-full h-11 w-11 p-0 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300"
          >
            <Send className="h-5 w-5" />
          </LoadingButton>
        </div>
        <p className="text-xs text-gray-400 mt-2 px-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default StandardChat;