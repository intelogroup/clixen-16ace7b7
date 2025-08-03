import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Zap, CheckCircle, XCircle, Bot, User, Cog, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { agentCoordinator } from '../lib/agents';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'generating' | 'deploying' | 'testing' | 'complete' | 'error';
  agentId?: string;
  phase?: string;
  progress?: number;
  workflow?: {
    id: string;
    name: string;
    webhookUrl?: string;
    nodeCount: number;
  };
}

interface AgentStatus {
  [agentId: string]: {
    id: string;
    name: string;
    status: 'idle' | 'thinking' | 'working' | 'waiting' | 'error' | 'completed';
    progress: number;
    currentTask?: string;
  };
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI workflow assistant powered by a team of specialist agents. Describe the workflow you want to create, and I\'ll coordinate with my agents to build it for you.',
      timestamp: new Date(),
      agentId: 'orchestrator',
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState('understanding');
  const [overallProgress, setOverallProgress] = useState(0);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({});
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Set up agent coordinator event listeners
    const handlePhaseChange = (data: any) => {
      setCurrentPhase(data.newPhase);
      setOverallProgress(data.progress);
      
      addMessage({
        type: 'system',
        content: `Phase changed to: ${data.newPhase}`,
        phase: data.newPhase,
        progress: data.progress
      });
    };

    const handleAgentMessage = (data: any) => {
      setAgentStatus(prev => ({
        ...prev,
        [data.fromAgent]: {
          id: data.fromAgent,
          name: data.fromAgent.replace('-', ' '),
          status: data.payload.state?.status || 'idle',
          progress: data.payload.state?.progress || 0,
          currentTask: data.payload.state?.currentTask
        }
      }));
    };

    const handleTaskCompleted = (data: any) => {
      if (data.result.workflowId) {
        addMessage({
          type: 'assistant',
          content: `✅ Task completed by ${data.agentId}: ${data.taskId}`,
          agentId: data.agentId,
          status: 'complete'
        });
      }
    };

    agentCoordinator.on('phase_change', handlePhaseChange);
    agentCoordinator.on('agent_message', handleAgentMessage);
    agentCoordinator.on('task_completed', handleTaskCompleted);

    return () => {
      agentCoordinator.off('phase_change', handlePhaseChange);
      agentCoordinator.off('agent_message', handleAgentMessage);
      agentCoordinator.off('task_completed', handleTaskCompleted);
    };
  }, []);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  };

  const generateWorkflow = async (intent: string) => {
    setIsGenerating(true);
    setShowAgentPanel(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let response;
      
      if (!conversationId) {
        // Start new conversation with agent coordinator
        response = await agentCoordinator.startConversation(user.id, intent);
        setConversationId(response.conversationId);
      } else {
        // Continue existing conversation
        response = await agentCoordinator.continueConversation(conversationId, intent);
      }

      // Add assistant response
      addMessage({
        type: 'assistant',
        content: response.response,
        agentId: 'orchestrator',
        phase: response.phase,
        progress: response.progress,
        status: response.phase === 'completed' ? 'complete' : 'generating'
      });

      // Update UI state
      setCurrentPhase(response.phase);
      setOverallProgress(response.progress);
      setAgentStatus(response.agentStatus);

      if (response.phase === 'completed') {
        toast.success('Workflow created successfully!');
        
        // Add completion message with details
        setTimeout(() => {
          addMessage({
            type: 'system',
            content: '🎉 Workflow deployment completed! Your automation is now live and ready to use.',
            status: 'complete'
          });
        }, 1000);
      }

    } catch (error: any) {
      console.error('Error in generateWorkflow:', error);
      
      addMessage({
        type: 'assistant',
        content: `I encountered an error: ${error.message}

This might be due to:
• Network connectivity issues
• OpenAI API rate limits
• n8n server connectivity

Would you like to try again?`,
        status: 'error',
        agentId: 'orchestrator'
      });

      toast.error('Failed to process request');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const intent = input.trim();
    setInput('');
    
    // Add user message immediately
    addMessage({ type: 'user', content: intent });
    
    await generateWorkflow(intent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const StatusIcon = ({ status }: { status?: Message['status'] }) => {
    switch (status) {
      case 'generating':
      case 'deploying':
      case 'testing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const AgentIcon = ({ agentId }: { agentId?: string }) => {
    switch (agentId) {
      case 'orchestrator':
        return <Bot className="w-4 h-4 text-purple-400" />;
      case 'workflow-designer':
        return <Cog className="w-4 h-4 text-blue-400" />;
      case 'deployment-agent':
        return <Zap className="w-4 h-4 text-green-400" />;
      default:
        return <Bot className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'working':
      case 'thinking':
        return 'text-blue-400 bg-blue-400/10';
      case 'completed':
        return 'text-green-400 bg-green-400/10';
      case 'error':
        return 'text-red-400 bg-red-400/10';
      case 'waiting':
        return 'text-yellow-400 bg-yellow-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Progress Header */}
        {conversationId && (
          <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium">Phase: {currentPhase}</div>
                  <div className="text-xs text-zinc-400">({overallProgress}%)</div>
                </div>
                <div className="w-32 bg-zinc-800 rounded-full h-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => setShowAgentPanel(!showAgentPanel)}
                className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
              >
                {showAgentPanel ? 'Hide' : 'Show'} Agents
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-white text-black'
                      : message.type === 'system'
                      ? 'bg-blue-950/30 text-blue-200 border border-blue-800/30'
                      : 'bg-zinc-900 text-white border border-zinc-800'
                  }`}
                >
                  {(message.status || message.agentId) && (
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      {message.agentId && <AgentIcon agentId={message.agentId} />}
                      {message.status && <StatusIcon status={message.status} />}
                      <span className="text-zinc-400">
                        {message.agentId && (
                          <span className="capitalize mr-2">{message.agentId.replace('-', ' ')}</span>
                        )}
                        {message.status && (
                          <span className="capitalize">{message.status.replace('_', ' ')}</span>
                        )}
                      </span>
                      {message.progress !== undefined && (
                        <span className="text-zinc-500">({message.progress}%)</span>
                      )}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap font-mono text-sm">
                    {message.content}
                  </div>
                  {message.workflow && (
                    <div className="mt-3 pt-3 border-t border-zinc-700">
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Zap className="w-3 h-3" />
                        <span>{message.workflow.nodeCount} nodes</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-6 border-t border-zinc-800">
          <div className="relative max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your workflow... (e.g., 'Send me an email when someone fills out my form')"
              className="w-full px-4 py-3 pr-12 bg-zinc-900 text-white placeholder-zinc-500 rounded-xl border border-zinc-800 focus:border-white/20 focus:outline-none resize-none font-mono text-sm"
              rows={3}
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="absolute right-2 bottom-2 p-2 text-white disabled:opacity-30 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="mt-2 text-center">
            <span className="text-xs text-zinc-500 font-mono">
              Press Enter to send • Shift+Enter for new line
            </span>
          </div>
        </form>
      </div>

      {/* Agent Status Panel */}
      {showAgentPanel && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="border-l border-zinc-800 bg-zinc-950/50 overflow-hidden"
        >
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Agent Status
            </h3>
            
            <div className="space-y-3">
              {Object.entries(agentStatus).map(([agentId, status]) => (
                <div key={agentId} className="p-3 bg-zinc-900 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AgentIcon agentId={agentId} />
                      <span className="text-sm font-medium capitalize">
                        {status.name}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getAgentStatusColor(status.status)}`}>
                      {status.status}
                    </span>
                  </div>
                  
                  {status.progress > 0 && (
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>Progress</span>
                        <span>{status.progress}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1">
                        <div 
                          className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {status.currentTask && (
                    <div className="text-xs text-zinc-400">
                      <div className="font-medium mb-1">Current Task:</div>
                      <div className="truncate">{status.currentTask}</div>
                    </div>
                  )}
                </div>
              ))}
              
              {Object.keys(agentStatus).length === 0 && (
                <div className="text-center text-zinc-500 py-8">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">No active agents</div>
                  <div className="text-xs">Start a conversation to see agent activity</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}