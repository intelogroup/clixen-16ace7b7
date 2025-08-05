import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Plus, User, Bot, Settings, MoreVertical, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { agentCoordinator } from '../lib/agents';

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

export default function StandardChat() {
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
        content: "Hi! I'm your AI workflow automation assistant. I can help you create powerful automations to connect your apps and streamline your work.\n\nWhat would you like to automate today?",
        timestamp: new Date(),
        status: 'complete'
      }]);
    }
  }, []);

  const quickSuggestions = [
    "Send me an email when someone fills out my contact form",
    "Post to Slack when I get a new customer order",
    "Save email attachments to Google Drive automatically",
    "Create calendar events from project management tasks"
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

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

      // Only save if there are user messages (meaningful conversation)
      const userMessages = newMessages.filter(m => m.type === 'user');
      if (userMessages.length === 0) return;

      // Create title from first user message
      const firstUserMessage = userMessages[0].content;
      const title = firstUserMessage.length > 30
        ? firstUserMessage.substring(0, 30) + '...'
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

      // Refresh sessions (debounced to avoid too many updates)
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
      content: "Hi! I'm ready to help you create a new workflow automation. What would you like to automate?",
      timestamp: new Date(),
      status: 'complete'
    }]);

    // Don't save the session until the user sends their first message
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
        toast.error('Failed to delete chat');
        return;
      }

      // If we're deleting the active session, create a new one
      if (activeSessionId === sessionId) {
        createNewChat();
      }

      // Refresh sessions list
      loadChatSessions();
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete chat');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const clearAllHistory = async () => {
    try {
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
      toast.success('All chat history cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
      toast.error('Failed to clear history');
    }
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

  const processMessage = async (userMessage: string) => {
    setIsGenerating(true);
    
    // Add loading message
    const loadingId = crypto.randomUUID();
    const loadingMessage: Message = {
      id: loadingId,
      type: 'assistant',
      content: 'Thinking...',
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

      // Call the agent coordinator
      const response = await agentCoordinator.handleNaturalConversation(userMessage, messages);
      
      // Remove loading message and add real response
      const updatedMessages = newMessages.filter(m => m.id !== loadingId);
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        type: 'assistant',
        content: response.response || 'I understand. Let me help you with that workflow automation.',
        timestamp: new Date(),
        status: 'complete'
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Save session (only save if we have an active session ID)
      if (activeSessionId) {
        await saveSession(activeSessionId, finalMessages);
      } else {
        // Create new session for first user message
        const newSessionId = crypto.randomUUID();
        setActiveSessionId(newSessionId);
        await saveSession(newSessionId, finalMessages);
      }

    } catch (error: any) {
      console.error('Error processing message:', error);
      
      // Remove loading message and show error
      const updatedMessages = newMessages.filter(m => m.id !== loadingId);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        type: 'assistant',
        content: error.message.includes('sign in') 
          ? 'Please sign in to continue using the AI assistant.'
          : 'I apologize, but I encountered an error. Please try again or rephrase your request.',
        timestamp: new Date(),
        status: 'error'
      };
      
      setMessages([...updatedMessages, errorMessage]);
      toast.error('Message failed to send');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);

    // Process the message
    await processMessage(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="w-3 h-3 animate-spin text-blue-400" />;
      case 'error':
        return <div className="w-3 h-3 rounded-full bg-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-white">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 280 }}
            exit={{ width: 0 }}
            className="bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={createNewChat}
                className="w-full flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors mb-3"
              >
                <Plus className="w-4 h-4" />
                New chat
              </button>

              {sessions.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
                      clearAllHistory();
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear all history
                </button>
              )}
            </div>

            {/* Chat Sessions */}
            <div className="flex-1 overflow-y-auto p-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative rounded-lg mb-1 transition-colors ${
                    activeSessionId === session.id
                      ? 'bg-gray-200'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <button
                    onClick={() => loadSession(session.id)}
                    className="w-full text-left p-3 pr-8"
                  >
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {session.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {session.lastMessage}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {session.timestamp.toLocaleDateString()}
                    </div>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this chat?')) {
                        deleteSession(session.id);
                      }
                    }}
                    className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                    title="Delete chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {sessions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-sm">No previous chats</div>
                  <div className="text-xs mt-1">Start a conversation to see your chat history</div>
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200">
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="font-semibold text-gray-900">Workflow Assistant</h1>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                AI
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Create automations with natural language
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-3xl mx-auto space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user' 
                        ? 'bg-black text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`rounded-2xl px-4 py-2 ${
                      message.type === 'user'
                        ? 'bg-black text-white'
                        : message.status === 'error'
                        ? 'bg-red-50 border border-red-200 text-red-900'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                      
                      {/* Status and timestamp */}
                      <div className={`flex items-center gap-2 mt-2 text-xs ${
                        message.type === 'user' 
                          ? 'text-gray-300' 
                          : 'text-gray-500'
                      }`}>
                        {getStatusIcon(message.status)}
                        <span>{formatTime(message.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Workflow Assistant..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
                rows={1}
                disabled={isGenerating}
                style={{ minHeight: '48px', maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
                onFocus={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isGenerating}
                className="absolute right-2 bottom-2 p-2 text-gray-400 hover:text-black disabled:opacity-30 disabled:hover:text-gray-400 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className={`w-5 h-5 transition-colors ${input.trim() ? 'text-black' : ''}`} />
                )}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Press Enter to send • Shift+Enter for new line
            </div>

            {/* Quick Suggestions */}
            {messages.length <= 1 && !input && (
              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-2">Try these examples:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {quickSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-left p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      💡 {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
