import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Zap, CheckCircle, XCircle, Bot, User, Cog, AlertTriangle, Plus, MessageSquare, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { agentCoordinator } from '../lib/agents';
import { AgentMonitor } from '../components/AgentMonitor';
import { WorkflowPhase } from '../lib/agents/types';
import PermissionModal from '../components/PermissionModal';
import OAuthManager from '../lib/oauth/OAuthManager';
import CentralizedAPIManager from '../lib/api/CentralizedAPIManager';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'generating' | 'deploying' | 'testing' | 'complete' | 'error';
  agentId?: string;
  phase?: string;
  progress?: number;
  suggestions?: string[];
  conversationMode?: 'greeting' | 'scoping' | 'validating' | 'creating' | 'completed';
  scopeStatus?: any;
  canProceed?: boolean;
  permissionStatus?: {
    required: boolean;
    granted: boolean;
    oauthServices?: [string, string[]][];
    centralizedAPIs?: string[];
  };
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
    lastUpdate: number;
    metadata: Record<string, any>;
  };
}

interface ChatSession {
  id: string;
  title: string;
  status: 'scoping' | 'validating' | 'creating' | 'completed';
  createdAt: Date;
  workflowId?: string;
}

export default function Chat() {
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [currentPhase, setCurrentPhase] = useState<WorkflowPhase>('understanding' as WorkflowPhase);
  const [overallProgress, setOverallProgress] = useState(0);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({});
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [conversationMode, setConversationMode] = useState<'greeting' | 'scoping' | 'validating' | 'creating' | 'completed'>('greeting');
  const [scopeData, setScopeData] = useState<any>({});
  const [canCreateWorkflow, setCanCreateWorkflow] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [requiredPermissions, setRequiredPermissions] = useState<any[]>([]);
  const [centralizedAPIs, setCentralizedAPIs] = useState<string[]>([]);
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get current user ID
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);

  // Handle OAuth callback if coming from OAuth flow
  useEffect(() => {
    if (location.state?.oauthComplete) {
      const { service, workflowContext } = location.state as any;
      toast.success(`Successfully connected to ${service}!`);
      
      // Resume workflow creation if context exists
      if (workflowContext?.workflowDescription) {
        setWorkflowDescription(workflowContext.workflowDescription);
        // Continue with workflow creation
        handleCreateWorkflow();
      }
    }
  }, [location]);

  // Initialize with greeting on mount
  useEffect(() => {
    const initChat = async () => {
      // Check if returning user by looking at localStorage
      const isReturningUser = localStorage.getItem('hasVisitedBefore') === 'true';
      localStorage.setItem('hasVisitedBefore', 'true');
      
      // Call greet_user action on OrchestratorAgent
      const greetingResponse = {
        message: isReturningUser 
          ? "Welcome back! Ready to create another automation?"
          : "Hi! I'm your workflow automation assistant. I can help you connect apps and automate repetitive tasks. What would you like to automate today?",
        suggestions: [
          "Send Slack notifications for new form submissions",
          "Sync Google Sheets with a database",
          "Process emails automatically",
          "Generate reports from multiple sources"
        ],
        mode: 'greeting'
      };
      
      setMessages([{
        id: '1',
        type: 'assistant',
        content: greetingResponse.message,
        timestamp: new Date(),
        agentId: 'orchestrator',
        suggestions: greetingResponse.suggestions,
        conversationMode: 'greeting'
      }]);
    };
    
    if (messages.length === 0) {
      initChat();
    }
  }, []);

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
          currentTask: data.payload.state?.currentTask,
          lastUpdate: Date.now(),
          metadata: data.payload.state?.metadata || {}
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

  // Save conversation to Supabase
  const saveConversationToSupabase = async (messages: Message[], sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const conversationData = {
        user_id: user.id,
        title: messages.find(m => m.type === 'user')?.content?.substring(0, 50) + '...' || 'New Conversation',
        messages: JSON.stringify(messages),
        status: 'active',
        workflow_summary: messages.filter(m => m.type === 'assistant').slice(-1)[0]?.content?.substring(0, 200) || ''
      };

      const { data, error } = await supabase
        .from('conversations')
        .upsert(conversationData)
        .select()
        .single();

      if (error) {
        console.error('Error saving conversation:', error);
      } else {
        console.log('Conversation saved:', data?.id);
      }
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };

  // Auto-save conversations periodically
  useEffect(() => {
    if (messages.length > 1) {
      const timer = setTimeout(() => {
        saveConversationToSupabase(messages, activeSessionId);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [messages, activeSessionId]);

  // Load previous conversations on mount
  useEffect(() => {
    const loadPreviousConversations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error loading conversations:', error);
          return;
        }

        if (data && data.length > 0) {
          // Convert conversations to sessions
          const loadedSessions = data.map(conv => ({
            id: conv.id,
            title: conv.title,
            status: conv.status as 'scoping' | 'creating' | 'completed' | 'error',
            createdAt: new Date(conv.created_at),
            messages: conv.messages ? JSON.parse(conv.messages) : []
          }));

          setSessions(loadedSessions);
          
          // If there's a conversation from URL or set active to most recent
          if (loadedSessions.length > 0 && !activeSessionId) {
            const mostRecent = loadedSessions[0];
            setActiveSessionId(mostRecent.id);
            if (mostRecent.messages) {
              setMessages(mostRecent.messages);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };

    loadPreviousConversations();
  }, []);

  // Load specific conversation when activeSessionId changes
  useEffect(() => {
    if (activeSessionId && sessions.length > 0) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session && session.messages && session.messages.length > 0) {
        setMessages(session.messages);
      }
    }
  }, [activeSessionId, sessions]);

  const startNewChat = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Workflow',
      status: 'scoping',
      createdAt: new Date()
    };
    
    setSessions([...sessions, newSession]);
    setActiveSessionId(newSession.id);
    setConversationId(undefined);
    setConversationMode('greeting');
    setScopeData({});
    setCanCreateWorkflow(false);
    
    // Reset messages with new greeting
    setMessages([{
      id: crypto.randomUUID(),
      type: 'assistant',
      content: "Let's create a new workflow! What would you like to automate?",
      timestamp: new Date(),
      agentId: 'orchestrator',
      conversationMode: 'greeting'
    }]);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Add user message with the suggestion
    addMessage({ type: 'user', content: suggestion });
    
    // Process the suggestion as a normal message
    await processUserMessage(suggestion);
  };

  const processUserMessage = async (message: string) => {
    setIsGenerating(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let response;
      
      // Handle conversation based on current mode
      if (conversationMode === 'greeting' || conversationMode === 'scoping') {
        // Use the natural conversation handler
        response = await agentCoordinator.handleNaturalConversation(message, messages);
        
        // Update conversation state
        setConversationMode(response.mode);
        setScopeData(response.scopeStatus || scopeData);
        setCanCreateWorkflow(response.canProceed);
        
        // Add assistant response
        addMessage({
          type: 'assistant',
          content: response.response,
          agentId: 'orchestrator',
          conversationMode: response.mode,
          scopeStatus: response.scopeStatus,
          canProceed: response.canProceed
        });
        
        // If we have all info and can proceed, show the create button
        if (response.canProceed && response.mode === 'validating') {
          setShowAgentPanel(true);
        }
      } else if (conversationMode === 'creating') {
        // Actually create the workflow
        if (!conversationId) {
          response = await agentCoordinator.startConversation(user.id, JSON.stringify(scopeData));
          setConversationId(response.conversationId);
        } else {
          response = await agentCoordinator.continueConversation(conversationId, message);
        }
      }

      // Add assistant response
      addMessage({
        type: 'assistant',
        content: response.response,
        agentId: 'orchestrator',
        phase: response.phase,
        progress: 'progress' in response ? response.progress : 0,
        status: response.phase === 'completed' ? 'complete' : 'generating',
        permissionStatus: response.permissionStatus,
        scopeStatus: response.scopeStatus,
        canProceed: response.canProceed
      });

      // Update UI state
      setCurrentPhase(response.phase);
      setOverallProgress('progress' in response ? response.progress : 0);
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
  
  const generateWorkflow = processUserMessage; // Alias for backward compatibility

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message immediately
    addMessage({ type: 'user', content: userMessage });
    
    await processUserMessage(userMessage);
  };

  const handleCreateWorkflow = async () => {
    // Check if we need permissions first
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.permissionStatus && !lastMessage.permissionStatus.granted) {
      // Need to show permission modal
      const oauthServices = lastMessage.permissionStatus.oauthServices || [];
      const centralApis = lastMessage.permissionStatus.centralizedAPIs || [];
      
      if (oauthServices.length > 0) {
        // Prepare permission checks for OAuth services
        const permissionChecks = [];
        for (const [service, scopes] of oauthServices) {
          permissionChecks.push({
            service,
            hasAccess: false,
            requiredScopes: scopes,
            missingScopes: scopes
          });
        }
        
        setRequiredPermissions(permissionChecks);
        setCentralizedAPIs(centralApis);
        setWorkflowDescription(scopeData.trigger ? 
          `${scopeData.trigger} → ${scopeData.actions?.join(', ')} → ${scopeData.output}` :
          'Your workflow automation'
        );
        setShowPermissionModal(true);
        return;
      }
    }
    
    // Proceed with workflow creation
    setConversationMode('creating');
    setIsGenerating(true);
    
    addMessage({
      type: 'system',
      content: '🚀 Starting workflow creation with your specifications...',
      status: 'generating'
    });
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Create a temporary context for the orchestrator
      const tempContext = {
        conversationId: `temp-${Date.now()}`,
        userId: user.id,
        userRequirements: [],
        agentStates: {},
        executionHistory: [],
        validationResults: [],
        sharedMemory: {}
      };
      
      // Import OrchestratorAgent directly
      const { OrchestratorAgent } = await import('../lib/agents/OrchestratorAgent');
      const orchestrator = new OrchestratorAgent(tempContext);
      
      // Create the workflow
      const result = await orchestrator.processTask({
        action: 'create_workflow',
        input: {}
      });
      
      if (result.success) {
        setConversationMode('completed');
        addMessage({
          type: 'assistant',
          content: result.message,
          status: 'complete',
          agentId: 'orchestrator',
          workflow: {
            id: result.workflowId || 'new-workflow',
            name: 'Automated Workflow',
            nodeCount: 5
          }
        });
        
        toast.success('Workflow created successfully!');
      } else {
        addMessage({
          type: 'assistant',
          content: result.message,
          status: 'error',
          agentId: 'orchestrator'
        });
        
        toast.error('Failed to create workflow');
      }
    } catch (error: any) {
      addMessage({
        type: 'assistant',
        content: `Error creating workflow: ${error.message}`,
        status: 'error',
        agentId: 'orchestrator'
      });
      
      toast.error('Failed to create workflow');
    } finally {
      setIsGenerating(false);
    }
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
      {/* Chat Sessions Sidebar */}
      <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <button
            onClick={startNewChat}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeSessionId === session.id
                    ? 'bg-zinc-800 text-white'
                    : 'hover:bg-zinc-900 text-zinc-400'
                }`}
              >
                <div className="text-sm font-medium truncate">{session.title}</div>
                <div className="text-xs text-zinc-500">
                  {session.status} • {new Date(session.createdAt).toLocaleTimeString()}
                </div>
              </button>
            ))}
            {sessions.length === 0 && (
              <div className="text-center text-zinc-600 py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start a new chat to create a workflow</p>
              </div>
            )}
          </div>
        </div>
      </div>

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
                  
                  {/* Workflow Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-zinc-400 mb-2">Popular workflows to get you started:</p>
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
                        >
                          🚀 {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Create Workflow Button */}
                  {message.canProceed && conversationMode === 'validating' && (
                    <div className="mt-4">
                      <button
                        onClick={handleCreateWorkflow}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating Workflow...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Create Workflow
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setConversationMode('scoping')}
                        className="w-full mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                      >
                        Modify Requirements
                      </button>
                    </div>
                  )}
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

      {/* Enhanced Agent Monitor Panel */}
      {showAgentPanel && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 480, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="border-l border-zinc-800 bg-white overflow-y-auto"
        >
          <div className="p-4">
            <AgentMonitor 
              agentStates={agentStatus}
              currentPhase={currentPhase}
              overallProgress={overallProgress}
              conversationId={conversationId}
            />
          </div>
        </motion.div>
      )}

      {/* Permission Modal */}
      <PermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        userId={userId || ''}
        requiredPermissions={requiredPermissions}
        centralizedAPIs={centralizedAPIs}
        workflowDescription={workflowDescription}
        onPermissionsGranted={() => {
          setShowPermissionModal(false);
          toast.success('Permissions granted! Creating your workflow...');
          // Continue with workflow creation after permissions are granted
          handleCreateWorkflow();
        }}
      />
    </div>
  );
}