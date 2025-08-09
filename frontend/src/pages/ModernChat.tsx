import React, { useState, useRef, useEffect } from 'react';
import {
  SendHorizontal,
  MessageCircle,
  BookmarkCheck,
  Zap,
  Lightbulb,
  Timer,
  CheckSquare,
  AlertTriangle,
  User,
  Bot,
  Sparkles,
  Target,
  Settings,
  FileCode
} from 'lucide-react';
import { WorkflowService } from '../lib/services/workflowService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function ModernChat() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: `👋 **Welcome to Clixen AI!**

I'm your intelligent workflow automation assistant. I can help with general questions and create powerful n8n workflows using natural conversation.

**What I can help you with:**
💬 Answer questions and have natural conversations
🔄 Automate repetitive tasks and workflows
🔗 Connect different services and APIs
⏰ Create scheduled workflows
🪝 Set up webhooks and triggers
📊 Build data processing pipelines

**Examples of what you can ask:**
- General questions: "What is 2+3?" or "How does automation work?"
- Automation requests: "Send me a Slack message every morning at 9 AM"
- Workflow ideas: "Help me automate email processing"

Feel free to ask me anything or tell me about a task you'd like to automate!`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState('draft');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    const sendMessageStart = Date.now();
    e.preventDefault();

    console.log('🚀 [MODERN-CHAT] handleSendMessage triggered', {
      inputLength: inputValue.length,
      inputPreview: inputValue.substring(0, 50) + (inputValue.length > 50 ? '...' : ''),
      isLoading,
      messagesCount: messages.length,
      timestamp: new Date().toISOString()
    });

    if (!inputValue.trim() || isLoading) {
      console.log('⚠️ [MODERN-CHAT] handleSendMessage blocked:', {
        reason: !inputValue.trim() ? 'empty input' : 'already loading',
        inputValue: inputValue,
        isLoading
      });
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    console.log('📝 [MODERN-CHAT] Adding user message:', {
      messageId: userMessage.id,
      content: userMessage.content.substring(0, 100) + '...',
      contentLength: userMessage.content.length
    });

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Use real AI chat service
    try {
      // Convert message format for SimpleChatService
      const conversationHistory = messages.map(msg => ({
        type: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      console.log('🤖 [MODERN-CHAT] Calling SimpleChatService:', {
        userMessage: userMessage.content.substring(0, 100) + '...',
        historyLength: conversationHistory.length,
        timestamp: new Date().toISOString()
      });

      // Simplified chat - call Supabase Edge Function directly
      const { data, error } = await supabase.functions.invoke('ai-chat-simple', {
        body: {
          message: userMessage.content,
          history: conversationHistory
        }
      });
      
      if (error) throw error;
      const result = data;

      console.log('✅ [MODERN-CHAT] SimpleChatService response received:', {
        hasResponse: !!result.response,
        responseLength: result.response?.length || 0,
        mode: result.mode,
        needsMoreInfo: result.needsMoreInfo,
        canProceed: result.canProceed,
        questionsCount: result.questions?.length || 0,
        hasScopeStatus: !!result.scopeStatus,
        workflowGenerated: result.scopeStatus?.generated || false
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: result.response,
        timestamp: new Date().toISOString()
      };

      console.log('🤖 [MODERN-CHAT] Adding assistant message:', {
        messageId: assistantMessage.id,
        contentLength: assistantMessage.content.length,
        contentPreview: assistantMessage.content.substring(0, 100) + '...'
      });

      setMessages(prev => [...prev, assistantMessage]);

      // Update workflow status based on AI response
      if (result.scopeStatus?.generated) {
        console.log('🎉 [MODERN-CHAT] Workflow generated!', {
          workflowName: result.scopeStatus.workflow?.name,
          workflowNodes: result.scopeStatus.workflow?.nodes?.length || 0
        });
        setWorkflowStatus('generated');
        toast.success('🎉 Workflow generated successfully!');
      } else if (result.mode === 'validating') {
        console.log('🔍 [MODERN-CHAT] Moving to validation phase');
        setWorkflowStatus('validating');
      } else {
        console.log('🔄 [MODERN-CHAT] Staying in current workflow status:', workflowStatus);
      }

    } catch (error) {
      const duration = Date.now() - sendMessageStart;
      console.error('❌ [MODERN-CHAT] Chat error after', duration + 'ms:', {
        error: error.message || error,
        stack: error.stack,
        userMessage: userMessage.content.substring(0, 100) + '...',
        messagesCount: messages.length,
        timestamp: new Date().toISOString()
      });

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'I apologize, but I encountered an error. Please try again or rephrase your question.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to process message');
    } finally {
      const totalDuration = Date.now() - sendMessageStart;
      console.log('🏁 [MODERN-CHAT] handleSendMessage completed', {
        duration: `${totalDuration}ms`,
        finalMessagesCount: messages.length + 2, // +1 user +1 assistant
        success: true
      });
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'validating':
        return {
          label: 'Refining',
          className: 'badge-warning',
          icon: <Timer className="w-3 h-3" />
        };
      case 'generated':
        return {
          label: 'Generated',
          className: 'badge-success',
          icon: <CheckSquare className="w-3 h-3" />
        };
      case 'saved':
        return {
          label: 'Saved', 
          className: 'badge-info',
          icon: <BookmarkCheck className="w-3 h-3" />
        };
      case 'deployed':
        return { 
          label: 'Deployed', 
          className: 'badge-success',
          icon: <Zap className="w-3 h-3" />
        };
      default:
        return { 
          label: 'Draft', 
          className: 'badge-warning',
          icon: <Timer className="w-3 h-3" />
        };
    }
  };

  const quickTemplates = [
    'Email to Slack notification',
    'Schedule daily reports',
    'Form to spreadsheet sync',
    'File backup automation',
    'Lead processing workflow',
    'Social media post scheduler'
  ];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Main Chat Area */}
      <div className="flex-1 clean-card flex flex-col h-[calc(100vh-200px)] lg:h-auto">
        {/* Chat Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Workflow Chat</h1>
                <p className="text-gray-600 text-sm">Create workflows with natural language</p>
              </div>
            </div>
            <button className="btn-clean btn-secondary text-sm">
              <Cog className="w-4 h-4" />
              New Chat
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div 
                className={`max-w-[80%] p-4 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 border border-gray-200 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <input
              value={inputValue}
              onChange={(e) => {
                const newValue = e.target.value;
                console.log('📝 [MODERN-CHAT] Input changed:', {
                  from: inputValue.length,
                  to: newValue.length,
                  preview: newValue.substring(0, 20) + (newValue.length > 20 ? '...' : '')
                });
                setInputValue(newValue);
              }}
              placeholder="Describe the workflow you want to create..."
              disabled={isLoading}
              className="input-clean flex-1"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={`btn-clean ${
                !inputValue.trim() || isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {isLoading ? (
                <div className="spinner-clean" />
              ) : (
                <SendHorizontal className="w-4 h-4" />
              )}
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 space-y-6">
        {/* Workflow Status */}
        <div className="clean-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
              Workflow Status
            </h3>
          </div>
          
          <div className={`badge-clean ${getStatusConfig(workflowStatus).className} mb-4`}>
            {getStatusConfig(workflowStatus).icon}
            {getStatusConfig(workflowStatus).label}
          </div>

          <div className="space-y-3">
            <button 
              className={`btn-clean w-full ${
                workflowStatus === 'draft' 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'btn-secondary'
              }`}
              disabled={workflowStatus === 'draft'}
            >
              <BookmarkCheck className="w-4 h-4" />
              Save Workflow
            </button>
            
            <button 
              className={`btn-clean w-full ${
                workflowStatus === 'draft' 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'btn-primary'
              }`}
              disabled={workflowStatus === 'draft'}
            >
              <Zap className="w-4 h-4" />
              Deploy to n8n
            </button>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="clean-card p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center mb-4">
            <Lightbulb className="w-5 h-5 mr-2 text-blue-600" />
            <h4 className="text-lg font-semibold text-blue-900">Pro Tips</h4>
          </div>
          
          <ul className="space-y-3 text-sm text-blue-800">
            <li className="flex items-start space-x-2">
              <Target className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Be specific about data sources and formats</span>
            </li>
            <li className="flex items-start space-x-2">
              <Timer className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Mention timing and scheduling requirements</span>
            </li>
            <li className="flex items-start space-x-2">
              <Settings className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Include conditions and error handling</span>
            </li>
            <li className="flex items-start space-x-2">
              <FileCode className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Specify desired output destinations</span>
            </li>
          </ul>
        </div>

        {/* Quick Templates */}
        <div className="clean-card p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Templates</h4>
          <div className="space-y-2">
            {quickTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => setInputValue(template)}
                className="w-full text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-lg text-gray-700 hover:text-gray-900 transition-colors"
              >
                {template}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
