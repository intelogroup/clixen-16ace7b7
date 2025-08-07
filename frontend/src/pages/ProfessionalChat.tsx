import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Loader2, 
  Plus, 
  User, 
  Bot, 
  MoreVertical, 
  Trash2, 
  X, 
  Sparkles,
  Zap,
  ArrowUp,
  PanelLeft,
  Clock,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { simpleChatService } from '../lib/services/SimpleChatService';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'generating' | 'complete' | 'error';
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

export default function ProfessionalChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0 && !activeSessionId) {
      setMessages([{
        id: crypto.randomUUID(),
        type: 'assistant',
        content: "Hello! I'm Clixen, your intelligent workflow automation assistant.\n\nI can help you create sophisticated automations by simply describing what you want to achieve. From simple task connections to complex multi-step workflows—I'll handle the technical details while you focus on your business logic.\n\nWhat process would you like to automate?",
        timestamp: new Date(),
        status: 'complete'
      }]);
    }
  }, []);

  const quickSuggestions = [
    {
      icon: "📧",
      title: "Email Automation",
      description: "Trigger email notifications from form submissions"
    },
    {
      icon: "💬",
      title: "Team Notifications", 
      description: "Send Slack alerts for important business events"
    },
    {
      icon: "📁",
      title: "File Management",
      description: "Automatically organize and backup documents"
    },
    {
      icon: "📅",
      title: "Calendar Sync",
      description: "Create events from project updates"
    }
  ];

  // Load chat sessions
  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, messages, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading sessions:', error);
        return;
      }

      if (data) {
        const loadedSessions = data.map(conv => {
          const messages = conv.messages ? JSON.parse(conv.messages) : [];
          const lastMessage = messages[messages.length - 1]?.content || 'New conversation';
          
          return {
            id: conv.id,
            title: conv.title || 'New Chat',
            lastMessage: lastMessage.substring(0, 50) + (lastMessage.length > 50 ? '...' : ''),
            timestamp: new Date(conv.created_at)
          };
        });
        
        setSessions(loadedSessions);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  };

  const saveSession = async (sessionId: string, newMessages: Message[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userMessages = newMessages.filter(m => m.type === 'user');
      if (userMessages.length === 0) return;

      const firstUserMessage = userMessages[0].content;
      const title = firstUserMessage.length > 35 
        ? firstUserMessage.substring(0, 35) + '...' 
        : firstUserMessage;
      
      await supabase
        .from('conversations')
        .upsert({
          id: sessionId,
          user_id: user.id,
          title,
          messages: JSON.stringify(newMessages),
          status: 'active'
        });
      
      setTimeout(() => loadChatSessions(), 1000);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  };

  const createNewChat = () => {
    const newSessionId = crypto.randomUUID();
    setActiveSessionId(newSessionId);
    setMessages([{
      id: crypto.randomUUID(),
      type: 'assistant',
      content: "Ready to build something amazing? Describe the workflow or automation you have in mind, and I'll help bring it to life.",
      timestamp: new Date(),
      status: 'complete'
    }]);
  };

  const loadSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('messages')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Error loading session:', error);
        return;
      }

      if (data?.messages) {
        const loadedMessages = JSON.parse(data.messages);
        setMessages(loadedMessages);
        setActiveSessionId(sessionId);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      setDeletingSessionId(sessionId);
      
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', sessionId);
      
      if (error) {
        console.error('Error deleting session:', error);
        toast.error('Failed to delete conversation');
        return;
      }
      
      if (activeSessionId === sessionId) {
        createNewChat();
      }
      
      loadChatSessions();
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete conversation');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const clearAllHistory = async () => {
    try {
      setClearingHistory(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error clearing history:', error);
        toast.error('Failed to clear history');
        return;
      }
      
      setSessions([]);
      createNewChat();
      toast.success('All conversations cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
      toast.error('Failed to clear history');
    } finally {
      setClearingHistory(false);
    }
  };

  const processMessage = async (userMessage: string) => {
    setIsGenerating(true);
    
    const loadingId = crypto.randomUUID();
    const loadingMessage: Message = {
      id: loadingId,
      type: 'assistant',
      content: 'Processing your request...',
      timestamp: new Date(),
      status: 'generating'
    };

    const newMessages = [...messages, loadingMessage];
    setMessages(newMessages);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to continue');
      }

      const response = await simpleChatService.handleNaturalConversation(userMessage, messages);
      
      const updatedMessages = newMessages.filter(m => m.id !== loadingId);
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        type: 'assistant',
        content: response.response || 'I understand your request. Let me help you create that automation with the right workflow structure and connections.',
        timestamp: new Date(),
        status: 'complete'
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      if (activeSessionId) {
        await saveSession(activeSessionId, finalMessages);
      } else {
        const newSessionId = crypto.randomUUID();
        setActiveSessionId(newSessionId);
        await saveSession(newSessionId, finalMessages);
      }

    } catch (error: any) {
      console.error('Error processing message:', error);
      
      const updatedMessages = newMessages.filter(m => m.id !== loadingId);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        type: 'assistant',
        content: error.message.includes('sign in') 
          ? 'Please sign in to continue using the workflow assistant.'
          : 'I apologize, but I encountered an issue processing your request. Please try rephrasing or contact support if the problem persists.',
        timestamp: new Date(),
        status: 'error'
      };
      
      setMessages([...updatedMessages, errorMessage]);
      toast.error('Failed to process message');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');

    const userMsg: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    await processMessage(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setInput(suggestion.description);
    inputRef.current?.focus();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="flex h-screen bg-slate-50/50">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="p-5 border-b border-slate-200/60">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-slate-900 text-lg">Conversations</span>
                </div>
              </div>
              
              <button
                onClick={createNewChat}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md group"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                <span className="font-medium">New conversation</span>
              </button>
              
              {sessions.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all conversation history? This action cannot be undone.')) {
                      clearAllHistory();
                    }
                  }}
                  disabled={clearingHistory}
                  className="w-full flex items-center gap-3 px-4 py-2.5 mt-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 text-sm disabled:opacity-50"
                >
                  {clearingHistory ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{clearingHistory ? 'Clearing...' : 'Clear all history'}</span>
                </button>
              )}
            </div>

            {/* Chat Sessions */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative rounded-xl transition-all duration-200 ${
                      activeSessionId === session.id
                        ? 'bg-slate-100/80 shadow-sm'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <button
                      onClick={() => loadSession(session.id)}
                      className="w-full text-left p-4 pr-10"
                    >
                      <div className="font-medium text-slate-900 mb-1 truncate text-sm">
                        {session.title}
                      </div>
                      <div className="text-xs text-slate-500 truncate mb-2">
                        {session.lastMessage}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(session.timestamp)}
                      </div>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this conversation?')) {
                          deleteSession(session.id);
                        }
                      }}
                      disabled={deletingSessionId === session.id}
                      className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all duration-200 disabled:cursor-not-allowed shadow-sm"
                      title="Delete conversation"
                    >
                      {deletingSessionId === session.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
                
                {sessions.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-1">No conversations yet</p>
                    <p className="text-xs text-slate-500">Start your first automation chat</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <PanelLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-slate-900">Clixen AI</h1>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-slate-500 font-medium">Online</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-500">
              Workflow Automation Assistant
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-4 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                      message.type === 'user' 
                        ? 'bg-gradient-to-br from-slate-900 to-slate-700 text-white' 
                        : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <Bot className="w-5 h-5" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`rounded-2xl px-5 py-4 shadow-sm ${
                      message.type === 'user'
                        ? 'bg-slate-900 text-white'
                        : message.status === 'error'
                        ? 'bg-red-50 border border-red-100 text-red-900'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                      
                      {/* Timestamp and status */}
                      <div className={`flex items-center gap-2 mt-3 text-xs ${
                        message.type === 'user' 
                          ? 'text-slate-300' 
                          : 'text-slate-500'
                      }`}>
                        {message.status === 'generating' && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        <span>{formatTime(message.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Typing indicator */}
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-4 max-w-[85%]">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 p-6">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/30 transition-all duration-200">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the workflow you'd like to create..."
                  className="w-full px-5 py-4 pr-14 bg-transparent border-none resize-none focus:outline-none text-slate-900 placeholder-slate-500 text-sm leading-relaxed"
                  rows={1}
                  disabled={isGenerating}
                  style={{ minHeight: '56px', maxHeight: '160px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 160) + 'px';
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isGenerating}
                  className="absolute right-2 bottom-2 p-3 text-slate-400 hover:text-white hover:bg-slate-900 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowUp className={`w-5 h-5 transition-colors ${input.trim() ? 'text-slate-900' : ''}`} />
                  )}
                </button>
              </div>
            </form>
            
            <div className="mt-3 text-center">
              <span className="text-xs text-slate-500">
                Press Enter to send • Shift+Enter for new line
              </span>
            </div>
            
            {/* Quick Suggestions */}
            {messages.length <= 1 && !input && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="text-sm font-medium text-slate-700 mb-3">Popular automation ideas:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {quickSuggestions.map((suggestion, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{suggestion.icon}</span>
                        <div>
                          <h4 className="font-medium text-slate-900 text-sm group-hover:text-blue-900 transition-colors">
                            {suggestion.title}
                          </h4>
                          <p className="text-xs text-slate-600 mt-1 group-hover:text-blue-700 transition-colors">
                            {suggestion.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
