import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { simpleChatService } from '../lib/services/SimpleChatService';
import { 
  Send, 
  ArrowLeft, 
  RotateCcw, 
  Save, 
  Upload, 
  User, 
  Bot, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Wand2,
  Zap,
  MessageSquare,
  Clock,
  Star,
  Workflow,
  Play,
  Copy,
  Download,
  ChevronDown,
  Mic,
  MicOff,
  Globe
} from 'lucide-react';
import { designTokens } from '../styles/design-tokens';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface WorkflowState {
  id?: string;
  name: string;
  description?: string;
  status: 'draft' | 'generated' | 'saved' | 'deployed' | 'error';
  json_config?: any;
  n8n_workflow_id?: string;
}

const MessageBubble: React.FC<{ 
  message: Message; 
  index: number;
  isTyping?: boolean;
}> = ({ message, index, isTyping = false }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} group`}
    >
      {!isUser && (
        <motion.div 
          className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          <Bot className="w-5 h-5 text-white" />
        </motion.div>
      )}
      
      <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-2'}`}>
        <motion.div 
          className={`relative p-4 rounded-2xl shadow-lg backdrop-blur-sm border transition-all duration-300 group-hover:shadow-xl ${
            isUser 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-500/30 rounded-br-sm' 
              : 'bg-white/10 text-white border-white/20 rounded-bl-sm'
          }`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {/* Copy button */}
          <motion.button
            onClick={handleCopy}
            className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg ${
              isUser ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </motion.button>

          <div className="pr-8">
            {isTyping ? (
              <motion.div 
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-400">AI is thinking...</span>
              </motion.div>
            ) : (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            )}
          </div>
        </motion.div>
        
        <div className={`mt-2 text-xs text-gray-400 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {isUser && (
        <motion.div 
          className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          <User className="w-5 h-5 text-white" />
        </motion.div>
      )}
    </motion.div>
  );
};

const WorkflowActionCard: React.FC<{
  workflow: WorkflowState;
  onSave: () => void;
  onDeploy: () => void;
  onTestWorkflow: () => void;
  onWorkflowNameChange: (name: string) => void;
  isSaving: boolean;
  isDeploying: boolean;
}> = ({ workflow, onSave, onDeploy, onTestWorkflow, onWorkflowNameChange, isSaving, isDeploying }) => {
  const getStatusIcon = () => {
    switch (workflow.status) {
      case 'generated':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'saved':
        return <Save className="w-5 h-5 text-blue-400" />;
      case 'deployed':
        return <Upload className="w-5 h-5 text-purple-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (workflow.status) {
      case 'generated':
        return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      case 'saved':
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      case 'deployed':
        return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
      case 'error':
        return 'from-red-500/20 to-rose-500/20 border-red-500/30';
      default:
        return 'from-gray-500/20 to-slate-500/20 border-gray-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
          <Workflow className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white text-lg">Workflow Actions</h3>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm bg-gradient-to-r ${getStatusColor()} mt-1`}>
            {getStatusIcon()}
            <span className="capitalize">{workflow.status}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <motion.button
          onClick={onSave}
          disabled={workflow.status === 'draft' || workflow.status === 'saved' || isSaving}
          className="w-full p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 disabled:from-gray-500/20 disabled:to-gray-600/20 border border-blue-500/30 disabled:border-gray-500/30 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          whileHover={{ scale: workflow.status !== 'draft' && workflow.status !== 'saved' && !isSaving ? 1.02 : 1 }}
          whileTap={{ scale: workflow.status !== 'draft' && workflow.status !== 'saved' && !isSaving ? 0.98 : 1 }}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {workflow.status === 'saved' ? 'Saved' : 'Save Workflow'}
        </motion.button>
        
        <motion.button
          onClick={onDeploy}
          disabled={workflow.status === 'draft' || workflow.status === 'deployed' || isDeploying || !workflow.name.trim()}
          className="w-full p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 disabled:from-gray-500/20 disabled:to-gray-600/20 border border-purple-500/30 disabled:border-gray-500/30 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          whileHover={{ scale: workflow.status !== 'draft' && workflow.status !== 'deployed' && !isDeploying && workflow.name.trim() ? 1.02 : 1 }}
          whileTap={{ scale: workflow.status !== 'draft' && workflow.status !== 'deployed' && !isDeploying && workflow.name.trim() ? 0.98 : 1 }}
        >
          {isDeploying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {workflow.status === 'deployed' ? 'Deployed' : 'Deploy to n8n'}
        </motion.button>
        
        {!workflow.name.trim() && workflow.status === 'generated' && (
          <p className="text-xs text-yellow-400 mt-2 text-center">
            ⚠️ Please enter a workflow name before deploying
          </p>
        )}
      </div>

      {/* Workflow Name Input */}
      <motion.div 
        className="mt-6 pt-4 border-t border-white/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          Workflow Name
        </h4>
        <input
          type="text"
          value={workflow.name}
          onChange={(e) => onWorkflowNameChange(e.target.value)}
          placeholder="Enter workflow name..."
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 backdrop-blur-sm transition-all duration-300"
        />
        {workflow.description && (
          <p className="text-xs text-gray-400 mt-2">{workflow.description}</p>
        )}
      </motion.div>

      {/* Webhook URL Display */}
      {workflow.status === 'deployed' && workflow.n8n_workflow_id && (
        <motion.div 
          className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Webhook URL
            </h4>
            <motion.button
              onClick={onTestWorkflow}
              className="px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 text-green-400 text-xs rounded-lg font-medium transition-all duration-300 flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="w-3 h-3" />
              Test
            </motion.button>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs text-gray-300 bg-black/20 px-2 py-1 rounded flex-1 truncate">
              {`https://your-n8n-instance.com/webhook/${workflow.n8n_workflow_id}`}
            </code>
            <motion.button
              onClick={() => {
                const webhookUrl = `https://your-n8n-instance.com/webhook/${workflow.n8n_workflow_id}`;
                navigator.clipboard.writeText(webhookUrl);
                toast.success('Webhook URL copied to clipboard');
              }}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Copy className="w-3 h-3 text-gray-400" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default function StandardChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowState>({
    name: '',
    status: 'draft'
  });
  const [workflowName, setWorkflowName] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        navigate('/auth');
      }
    };
    getCurrentUser();
  }, [navigate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat session and welcome message
  useEffect(() => {
    const initializeSession = async () => {
      if (user && !sessionId) {
        try {
          const { data, error } = await supabase
            .from('ai_chat_sessions')
            .insert({
              user_id: user.id,
              title: 'New Workflow Chat',
              is_active: true
            })
            .select()
            .single();

          if (error) throw error;
          setSessionId(data.id);

          if (messages.length === 0) {
            const welcomeMessage: Message = {
              id: '1',
              role: 'assistant',
              content: `👋 **Welcome to Clixen AI!**

I'm your intelligent workflow automation assistant. I help you create powerful n8n workflows using simple, natural language.

**What I can help you with:**
🔄 Automate repetitive tasks
🔗 Connect different services and APIs
⏰ Create scheduled workflows
🪝 Set up webhooks and triggers
📊 Build data processing pipelines

**To get started**, just tell me what you'd like to automate! For example:
- "Send me a Slack message every morning at 9 AM"
- "When I receive an email, save the attachment to Google Drive"
- "Create a webhook that processes form submissions"

What would you like to automate today?`,
              timestamp: new Date().toISOString()
            };
            setMessages([welcomeMessage]);

            await supabase
              .from('ai_chat_messages')
              .insert({
                session_id: data.id,
                user_id: user.id,
                role: 'assistant',
                content: welcomeMessage.content
              });
          }
        } catch (error) {
          console.error('Error initializing session:', error);
        }
      }
    };

    initializeSession();
  }, [user, messages.length, sessionId]);

  // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        type: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      const result = await simpleChatService.handleNaturalConversation(
        userMessage.content,
        conversationHistory
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString(),
        metadata: result.scopeStatus?.workflow
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save messages to database
      if (sessionId && user) {
        try {
          await supabase
            .from('ai_chat_messages')
            .insert([
              {
                session_id: sessionId,
                user_id: user.id,
                role: 'user',
                content: userMessage.content
              },
              {
                session_id: sessionId,
                user_id: user.id,
                role: 'assistant',
                content: result.response,
                metadata: result.scopeStatus ? {
                  workflow_generated: result.scopeStatus.generated,
                  mode: result.mode,
                  questions: result.questions
                } : null
              }
            ]);
        } catch (dbError) {
          console.error('Error saving messages:', dbError);
        }
      }

      // If workflow was generated, update state
      if (result.scopeStatus?.generated && result.scopeStatus?.workflow) {
        setWorkflow({
          name: result.scopeStatus.workflow.name || 'Generated Workflow',
          description: result.scopeStatus.workflow.meta?.description,
          status: 'generated',
          json_config: result.scopeStatus.workflow
        });
        toast.success('Workflow generated successfully!');

        // Update session title with workflow name
        if (sessionId) {
          await supabase
            .from('ai_chat_sessions')
            .update({
              title: result.scopeStatus.workflow.name || 'Generated Workflow',
              metadata: { workflow_generated: true }
            })
            .eq('id', sessionId);
        }
      }

    } catch (error: any) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error processing your request: ${error.message}. Please try again or rephrase your request.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to process message');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle saving workflow
  const handleSaveWorkflow = async () => {
    if (!user || !workflow.json_config) {
      toast.error('No workflow to save');
      return;
    }

    setIsSaving(true);
    try {
      let conversationId: string;

      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: workflow.name || 'Untitled Workflow',
          status: 'completed',
          workflow_confirmed: true,
          workflow_summary: workflow.description,
          messages: messages
        })
        .select()
        .single();

      if (convError) throw convError;
      conversationId = convData.id;

      const { data, error } = await supabase
        .from('workflows')
        .insert({
          user_id: user.id,
          name: workflow.name,
          description: workflow.description,
          json_config: workflow.json_config,
          status: 'saved',
          user_intent: messages.find(m => m.role === 'user')?.content || ''
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('user_workflows')
        .insert({
          user_id: user.id,
          workflow_name: workflow.name,
          n8n_workflow_id: workflow.n8n_workflow_id || data.id.toString(),
          status: 'saved',
          workflow_type: 'generated'
        });

      setWorkflow(prev => ({ ...prev, id: data.id, status: 'saved' }));
      toast.success('Workflow saved successfully!');

      await supabase
        .from('usage_tracking')
        .insert({
          user_id: user.id,
          event_type: 'workflow_saved',
          workflow_id: data.id.toString(),
          metadata: { conversation_id: conversationId }
        });

    } catch (error: any) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deploying to n8n
  const handleDeployWorkflow = async () => {
    if (!user || !workflow.json_config) {
      toast.error('No workflow to deploy');
      return;
    }

    setIsDeploying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      setWorkflow(prev => ({
        ...prev,
        status: 'deployed',
        n8n_workflow_id: 'demo-' + Math.random().toString(36).slice(2)
      }));
      toast.success('Workflow deployed successfully!');

    } catch (error: any) {
      console.error('Error deploying workflow:', error);
      toast.error('Failed to deploy workflow');
      setWorkflow(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsDeploying(false);
    }
  };

  // Handle workflow name change
  const handleWorkflowNameChange = (name: string) => {
    setWorkflow(prev => ({ ...prev, name }));
  };

  // Handle testing workflow
  const handleTestWorkflow = () => {
    if (workflow.n8n_workflow_id) {
      const webhookUrl = `https://your-n8n-instance.com/webhook/${workflow.n8n_workflow_id}`;
      window.open(webhookUrl, '_blank');
      toast.success('Opening workflow test URL');
    } else {
      toast.error('No workflow ID available for testing');
    }
  };

  // Handle starting new chat
  const handleNewChat = async () => {
    try {
      if (sessionId) {
        await supabase
          .from('ai_chat_sessions')
          .update({ is_active: false })
          .eq('id', sessionId);
      }

      setMessages([]);
      setWorkflow({ name: '', status: 'draft' });
      setSessionId('');
      toast.success('New chat started');
    } catch (error) {
      console.error('Error starting new chat:', error);
      setMessages([]);
      setWorkflow({ name: '', status: 'draft' });
      setSessionId('');
      toast.success('New chat started');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>
      
      {/* Floating Orbs */}
      <motion.div 
        className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Header */}
      <motion.header 
        className="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate('/dashboard')}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-300 flex items-center gap-2 text-gray-300 hover:text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </motion.button>
            
            <div className="h-6 w-px bg-white/20" />
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">AI Workflow Chat</h1>
                <p className="text-sm text-gray-400">Create workflows with natural language</p>
              </div>
            </div>
          </div>
          
          <motion.button
            onClick={handleNewChat}
            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-300 flex items-center gap-2 text-gray-300 hover:text-white"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RotateCcw className="w-5 h-5" />
            <span className="hidden sm:inline">New Chat</span>
          </motion.button>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto px-4 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
          {/* Chat Area */}
          <div className="lg:col-span-3 flex flex-col">
            <motion.div 
              className="flex-1 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl flex flex-col overflow-hidden"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
                
                {isLoading && (
                  <MessageBubble
                    message={{
                      id: 'typing',
                      role: 'assistant',
                      content: '',
                      timestamp: new Date().toISOString()
                    }}
                    index={messages.length}
                    isTyping={true}
                  />
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <div className="border-t border-white/10 p-6 bg-white/5">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Describe the workflow you want to create..."
                      disabled={isLoading}
                      className="w-full pl-4 pr-12 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 backdrop-blur-sm transition-all duration-300"
                    />
                    <motion.button
                      type="button"
                      onClick={() => setIsListening(!isListening)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-300 ${
                        isListening ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400 hover:text-white'
                      }`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </motion.button>
                  </div>
                  
                  <motion.button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-2xl font-medium shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center gap-2"
                    whileHover={{ scale: !inputValue.trim() || isLoading ? 1 : 1.05 }}
                    whileTap={{ scale: !inputValue.trim() || isLoading ? 1 : 0.95 }}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    <span className="hidden sm:inline">Send</span>
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>

          {/* Workflow Actions Sidebar */}
          <div className="space-y-6">
            <WorkflowActionCard
              workflow={workflow}
              onSave={handleSaveWorkflow}
              onDeploy={handleDeployWorkflow}
              onTestWorkflow={handleTestWorkflow}
              onWorkflowNameChange={handleWorkflowNameChange}
              isSaving={isSaving}
              isDeploying={isDeploying}
            />

            {/* Tips */}
            <motion.div 
              className="p-6 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-medium text-white">Pro Tips</h4>
              </div>
              
              <ul className="text-sm space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  Be specific about data sources and formats
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
                  Mention timing and scheduling requirements
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  Include conditions and error handling
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-pink-400 rounded-full mt-2 flex-shrink-0" />
                  Specify desired output destinations
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
