import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Plus,
  MessageSquare,
  ChevronRight,
  Layers,
  Code2,
  Workflow
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { agentCoordinator } from '../lib/agents';
import { WorkflowPhase } from '../lib/agents/types';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'typing' | 'generating' | 'complete' | 'error';
  agentId?: string;
  phase?: keyof typeof phaseInfo;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  lastMessage?: string;
}

const phaseInfo = {
  understanding: {
    title: 'Understanding Requirements',
    icon: Bot,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10'
  },
  designing: {
    title: 'Designing Workflow',
    icon: Layers,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10'
  },
  building: {
    title: 'Building Components',
    icon: Code2,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10'
  },
  deploying: {
    title: 'Deploying to n8n',
    icon: Zap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10'
  },
  testing: {
    title: 'Testing & Validation',
    icon: CheckCircle2,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10'
  },
  complete: {
    title: 'Workflow Ready',
    icon: Workflow,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10'
  }
};

const suggestedPrompts = [
  {
    title: 'Email Automation',
    prompt: 'Create a workflow that monitors Gmail for specific emails and saves attachments to Google Drive',
    icon: '📧'
  },
  {
    title: 'Data Sync',
    prompt: 'Build a workflow to sync data between Airtable and Google Sheets every hour',
    icon: '🔄'
  },
  {
    title: 'Social Media',
    prompt: 'Create a workflow that posts to Twitter when a new blog post is published',
    icon: '🐦'
  },
  {
    title: 'Webhook Handler',
    prompt: 'Build a webhook receiver that processes form submissions and sends notifications',
    icon: '🔗'
  }
];

export default function ModernChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<keyof typeof phaseInfo>('understanding');
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadSessions();
    // Welcome message
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'assistant',
        content: "Hi! I'm your AI workflow assistant. I can help you create powerful n8n workflows using natural language. What would you like to automate today?",
        timestamp: new Date(),
        status: 'complete'
      }]);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
      status: 'complete'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    // Show typing indicator
    const typingMessage: Message = {
      id: `typing-${Date.now()}`,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'typing'
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Initialize agent coordinator
      const sessionId = activeSessionId || `session-${Date.now()}`;
      if (!activeSessionId) setActiveSessionId(sessionId);

      // Subscribe to agent events
      agentCoordinator.on('phaseChange', (phase: WorkflowPhase) => {
        // Map WorkflowPhase to our phaseInfo keys
        const phaseMap: Record<WorkflowPhase, keyof typeof phaseInfo> = {
          'understanding': 'understanding',
          'designing': 'designing',
          'building': 'building',
          'deploying': 'deploying',
          'testing': 'testing',
          'complete': 'complete'
        };
        setCurrentPhase(phaseMap[phase] || 'understanding');
      });

      agentCoordinator.on('message', (data: any) => {
        if (data.agentId === 'orchestrator') {
          // Update the typing message with actual content
          setMessages(prev => {
            const filtered = prev.filter(m => !m.id.startsWith('typing-'));
            return [...filtered, {
              id: Date.now().toString(),
              type: 'assistant',
              content: data.content,
              timestamp: new Date(),
              status: 'complete',
              phase: currentPhase,
              agentId: data.agentId
            }];
          });
        }
      });

      // Send message to agents
      await agentCoordinator.sendMessage(userMessage.content);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to process your request');
      // Remove typing indicator
      setMessages(prev => prev.filter(m => !m.id.startsWith('typing-')));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Workflow Chat',
      createdAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setMessages([{
      id: '1',
      type: 'assistant',
      content: "Let's create a new workflow! What would you like to automate?",
      timestamp: new Date(),
      status: 'complete'
    }]);
    setShowSessions(false);
  };

  return (
    <div className="flex h-screen">
      {/* Sessions Sidebar - Desktop */}
      <div className="hidden lg:block w-80 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="p-4 border-b border-[var(--border-primary)]">
          <button
            onClick={createNewSession}
            className="w-full btn-modern btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`w-full p-4 text-left hover:bg-white/5 transition-colors border-b border-[var(--border-primary)] ${
                activeSessionId === session.id ? 'bg-white/5' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-medium truncate">{session.title}</h3>
                  <p className="text-sm text-gray-400 truncate">{session.lastMessage || 'No messages yet'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Phase Indicator */}
        <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSessions(!showSessions)}
                className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold">AI Workflow Creator</h1>
            </div>
            
            {/* Phase Indicator */}
            {isGenerating && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${phaseInfo[currentPhase].bgColor}`}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  {(() => {
                    const PhaseIcon = phaseInfo[currentPhase].icon;
                    return <PhaseIcon className={`w-4 h-4 ${phaseInfo[currentPhase].color}`} />;
                  })()}
                </motion.div>
                <span className={`text-sm font-medium ${phaseInfo[currentPhase].color}`}>
                  {phaseInfo[currentPhase].title}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {suggestedPrompts.map((prompt, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handlePromptClick(prompt.prompt)}
                  className="p-4 rounded-lg glass border border-white/10 hover:border-purple-400/50 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{prompt.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1 group-hover:text-purple-400 transition-colors">
                        {prompt.title}
                      </h3>
                      <p className="text-sm text-gray-400">{prompt.prompt}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 p-2 flex-shrink-0">
                    <Bot className="w-full h-full text-white" />
                  </div>
                )}
                
                <div className={`max-w-2xl ${message.type === 'user' ? 'order-1' : 'order-2'}`}>
                  <div className={`p-4 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30' 
                      : 'glass border border-white/10'
                  }`}>
                    {message.status === 'typing' ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 rounded-full bg-purple-400"
                              animate={{ y: [0, -8, 0] }}
                              transition={{
                                duration: 0.8,
                                delay: i * 0.1,
                                repeat: Infinity,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-400">AI is thinking...</span>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.phase && (
                          <div className="mt-2 flex items-center gap-2">
                            {(() => {
                              const PhaseIcon = phaseInfo[message.phase].icon;
                              return <PhaseIcon className={`w-3 h-3 ${phaseInfo[message.phase].color}`} />;
                            })()}
                            <span className={`text-xs ${phaseInfo[message.phase].color}`}>
                              {phaseInfo[message.phase].title}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className={`mt-1 text-xs text-gray-500 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 p-2 flex-shrink-0 order-2">
                    <User className="w-full h-full text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-[var(--border-primary)] p-4 bg-[var(--bg-secondary)]">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your workflow... (e.g., 'Send me an email when someone fills out my form')"
                className="w-full p-4 pr-12 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg resize-none focus:outline-none focus:border-purple-400/50 transition-colors"
                rows={3}
                disabled={isGenerating}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all ${
                  input.trim() && !isGenerating
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-110'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Press Enter to send • Shift+Enter for new line
              </p>
              {isGenerating && (
                <p className="text-xs text-purple-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI agents are working on your workflow
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sessions Overlay */}
      <AnimatePresence>
        {showSessions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowSessions(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-80 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] z-50"
            >
              {/* Copy sessions content from desktop */}
              <div className="p-4 border-b border-[var(--border-primary)]">
                <button
                  onClick={createNewSession}
                  className="w-full btn-modern btn-primary flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100vh-80px)]">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setShowSessions(false);
                    }}
                    className={`w-full p-4 text-left hover:bg-white/5 transition-colors border-b border-[var(--border-primary)] ${
                      activeSessionId === session.id ? 'bg-white/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 overflow-hidden">
                        <h3 className="font-medium truncate">{session.title}</h3>
                        <p className="text-sm text-gray-400 truncate">{session.lastMessage || 'No messages yet'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}