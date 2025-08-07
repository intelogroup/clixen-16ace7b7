import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertCircle 
} from 'lucide-react';
import { designTokens } from '../styles/design-tokens';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface Workflow {
  id?: string;
  name: string;
  description?: string;
  status: 'draft' | 'generated' | 'saved' | 'deployed' | 'error';
  json_config?: any;
  n8n_workflow_id?: string;
}

export default function StandardChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow>({
    name: '',
    status: 'draft'
  });
  const [user, setUser] = useState<any>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Initialize chat with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        role: 'assistant',
        content: `Hi! I'm here to help you create n8n workflows using natural language. 

Simply describe what automation you'd like to build. For example:
• "Send me a daily email with the latest news from an RSS feed"
• "Post new GitHub issues to our Slack channel"
• "Backup database data to Google Drive every week"

What workflow would you like to create?`,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

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
      // Call workflow generator edge function
      const { data, error } = await supabase.functions.invoke('workflow-generator', {
        body: {
          user_message: userMessage.content,
          conversation_history: messages
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        metadata: data.workflow_data
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If workflow was generated, update state
      if (data.workflow_generated && data.workflow_data) {
        setWorkflow({
          name: data.workflow_data.name || 'Generated Workflow',
          description: data.workflow_data.description,
          status: 'generated',
          json_config: data.workflow_data.json_config
        });
        toast.success('Workflow generated successfully!');
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

      setWorkflow(prev => ({ ...prev, id: data.id, status: 'saved' }));
      toast.success('Workflow saved successfully!');

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
      const { data, error } = await supabase.functions.invoke('n8n-deployment', {
        body: {
          workflow_config: workflow.json_config,
          workflow_name: workflow.name
        }
      });

      if (error) throw error;

      setWorkflow(prev => ({ 
        ...prev, 
        status: 'deployed',
        n8n_workflow_id: data.workflow_id 
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

  // Handle starting new chat
  const handleNewChat = () => {
    setMessages([]);
    setWorkflow({ name: '', status: 'draft' });
    toast.success('New chat started');
  };

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'generated':
        return { icon: <CheckCircle size={16} />, color: designTokens.colors.success[500], text: 'Generated' };
      case 'saved':
        return { icon: <Save size={16} />, color: designTokens.colors.primary[500], text: 'Saved' };
      case 'deployed':
        return { icon: <Upload size={16} />, color: designTokens.colors.success[600], text: 'Deployed' };
      case 'error':
        return { icon: <XCircle size={16} />, color: designTokens.colors.error[500], text: 'Error' };
      default:
        return { icon: <AlertCircle size={16} />, color: designTokens.colors.gray[400], text: 'Draft' };
    }
  };

  const statusDisplay = getStatusDisplay(workflow.status);

  return (
    <div className="min-h-screen" style={{ backgroundColor: designTokens.colors.gray[50] }}>
      {/* Header */}
      <header className="border-b" style={{ 
        backgroundColor: designTokens.colors.white,
        borderColor: designTokens.colors.gray[200]
      }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              leftIcon={<ArrowLeft size={16} />}
            >
              Back to Dashboard
            </Button>
            <div className="h-6 w-px" style={{ backgroundColor: designTokens.colors.gray[200] }} />
            <h1 className="text-xl font-semibold" style={{ color: designTokens.colors.gray[900] }}>
              Create Workflow
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {workflow.status !== 'draft' && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm" 
                   style={{ 
                     backgroundColor: `${statusDisplay.color}10`,
                     color: statusDisplay.color 
                   }}>
                {statusDisplay.icon}
                {statusDisplay.text}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              leftIcon={<RotateCcw size={16} />}
            >
              New Chat
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border" style={{ 
              backgroundColor: designTokens.colors.white,
              borderColor: designTokens.colors.gray[200]
            }}>
              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                             style={{ backgroundColor: designTokens.colors.primary[100] }}>
                          <Bot size={16} style={{ color: designTokens.colors.primary[600] }} />
                        </div>
                      )}
                      
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'rounded-br-sm' 
                          : 'rounded-bl-sm'
                      }`} style={{
                        backgroundColor: message.role === 'user' 
                          ? designTokens.colors.primary[500]
                          : designTokens.colors.gray[100],
                        color: message.role === 'user' 
                          ? designTokens.colors.white 
                          : designTokens.colors.gray[800]
                      }}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {message.role === 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                             style={{ backgroundColor: designTokens.colors.gray[100] }}>
                          <User size={16} style={{ color: designTokens.colors.gray[600] }} />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                         style={{ backgroundColor: designTokens.colors.primary[100] }}>
                      <Bot size={16} style={{ color: designTokens.colors.primary[600] }} />
                    </div>
                    <div className="px-4 py-3 rounded-lg rounded-bl-sm flex items-center gap-2"
                         style={{ backgroundColor: designTokens.colors.gray[100] }}>
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm" style={{ color: designTokens.colors.gray[600] }}>
                        Thinking...
                      </span>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="border-t p-4" style={{ 
                borderColor: designTokens.colors.gray[200] 
              }}>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Describe the workflow you want to create..."
                      disabled={isLoading}
                      fullWidth
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    isLoading={isLoading}
                    rightIcon={!isLoading ? <Send size={16} /> : undefined}
                  >
                    Send
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Workflow Actions Sidebar */}
          <div className="space-y-4">
            <div className="rounded-lg border p-4" style={{ 
              backgroundColor: designTokens.colors.white,
              borderColor: designTokens.colors.gray[200]
            }}>
              <h3 className="font-semibold mb-4" style={{ color: designTokens.colors.gray[900] }}>
                Workflow Actions
              </h3>
              
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleSaveWorkflow}
                  disabled={workflow.status === 'draft' || workflow.status === 'saved'}
                  isLoading={isSaving}
                  leftIcon={<Save size={16} />}
                >
                  {workflow.status === 'saved' ? 'Saved' : 'Save Workflow'}
                </Button>
                
                <Button
                  fullWidth
                  onClick={handleDeployWorkflow}
                  disabled={workflow.status === 'draft' || workflow.status === 'deployed'}
                  isLoading={isDeploying}
                  leftIcon={<Upload size={16} />}
                >
                  {workflow.status === 'deployed' ? 'Deployed' : 'Deploy to n8n'}
                </Button>
              </div>

              {workflow.name && (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${designTokens.colors.gray[200]}` }}>
                  <h4 className="text-sm font-medium mb-2" style={{ color: designTokens.colors.gray[700] }}>
                    Current Workflow
                  </h4>
                  <p className="text-sm" style={{ color: designTokens.colors.gray[600] }}>
                    {workflow.name}
                  </p>
                  {workflow.description && (
                    <p className="text-xs mt-1" style={{ color: designTokens.colors.gray[500] }}>
                      {workflow.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-lg border p-4" style={{ 
              backgroundColor: designTokens.colors.primary[50],
              borderColor: designTokens.colors.primary[200]
            }}>
              <h4 className="font-medium mb-2" style={{ color: designTokens.colors.primary[700] }}>
                Tips for Better Results
              </h4>
              <ul className="text-sm space-y-1" style={{ color: designTokens.colors.primary[600] }}>
                <li>• Be specific about data sources</li>
                <li>• Mention timing requirements</li>
                <li>• Include desired output format</li>
                <li>• Specify any conditions or filters</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}