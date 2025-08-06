import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChatBubbleLeftRightIcon, 
  CogIcon, 
  PlayIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ClockIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthContext';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  agent?: string;
  result?: any;
  error?: string;
}

interface WorkflowCreationWizardProps {
  onWorkflowCreated?: (workflow: any) => void;
  onClose?: () => void;
}

export const WorkflowCreationWizard: React.FC<WorkflowCreationWizardProps> = ({
  onWorkflowCreated,
  onClose
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    agent?: string;
    timestamp: Date;
  }>>([]);
  
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    {
      id: 'understanding',
      name: 'Understanding Requirements',
      description: 'AI agent analyzes your workflow needs',
      status: 'pending',
      agent: 'orchestrator'
    },
    {
      id: 'design',
      name: 'Workflow Design',
      description: 'Creating optimized n8n workflow structure',
      status: 'pending',
      agent: 'workflow_designer'
    },
    {
      id: 'validation',
      name: 'Validation & Testing',
      description: 'Ensuring workflow integrity and performance',
      status: 'pending',
      agent: 'deployment'
    },
    {
      id: 'deployment',
      name: 'Deployment Ready',
      description: 'Workflow ready for production deployment',
      status: 'pending',
      agent: 'deployment'
    }
  ]);

  const [workflowPreview, setWorkflowPreview] = useState<any>(null);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    const message = userInput.trim();
    setUserInput('');
    setIsProcessing(true);

    // Add user message to conversation
    setConversation(prev => [...prev, {
      role: 'user',
      content: message,
      timestamp: new Date()
    }]);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat-system`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          user_id: user?.id,
          context: {
            mode: 'workflow_creation',
            conversation_history: conversation.slice(-5), // Last 5 messages for context
            current_step: currentStep
          }
        })
      });

      // Read the response body first
      const responseText = await response.text();
      
      // Try to parse as JSON, but handle errors gracefully
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        data = { error: 'Invalid response format', raw: responseText };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || responseText}`);
      }
      
      // Add AI response to conversation
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'I received your message and I\'m processing it.',
        agent: data.agent || 'orchestrator',
        timestamp: new Date()
      }]);

      // Update workflow steps based on AI response
      if (data.workflow_progress) {
        updateWorkflowProgress(data.workflow_progress);
      }

      // If we have a workflow preview, update it
      if (data.workflow_preview) {
        setWorkflowPreview(data.workflow_preview);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setConversation(prev => [...prev, {
        role: 'system',
        content: `Error: ${error.message}. Please try again.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateWorkflowProgress = (progress: any) => {
    setWorkflowSteps(prev => prev.map(step => {
      if (progress[step.id]) {
        return {
          ...step,
          status: progress[step.id].status,
          result: progress[step.id].result,
          error: progress[step.id].error
        };
      }
      return step;
    }));

    // Auto-advance current step if needed
    const nextIncomplete = workflowSteps.findIndex(step => 
      step.status === 'pending' || step.status === 'in_progress'
    );
    if (nextIncomplete !== -1 && nextIncomplete !== currentStep) {
      setCurrentStep(nextIncomplete);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'in_progress':
        return <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <CogIcon className="w-6 h-6 text-blue-500" />
        </motion.div>;
      case 'error':
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />;
      default:
        return <ClockIcon className="w-6 h-6 text-gray-400" />;
    }
  };

  const getAgentIcon = (agent?: string) => {
    switch (agent) {
      case 'orchestrator':
        return <SparklesIcon className="w-4 h-4 text-purple-500" />;
      case 'workflow_designer':
        return <DocumentTextIcon className="w-4 h-4 text-blue-500" />;
      case 'deployment':
        return <CloudArrowUpIcon className="w-4 h-4 text-green-500" />;
      default:
        return <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  // Initial greeting
  useEffect(() => {
    setConversation([{
      role: 'assistant',
      content: 'Hello! I\'m your AI workflow creation assistant. I\'ll help you build a custom n8n workflow step by step. What kind of automation would you like to create?',
      agent: 'orchestrator',
      timestamp: new Date()
    }]);
  }, []);

  return (
    <div className="flex h-full bg-white rounded-lg shadow-xl overflow-hidden">
      {/* Workflow Progress Sidebar */}
      <div className="w-80 bg-gradient-to-b from-indigo-50 to-purple-50 border-r border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Workflow Creation</h2>
          <p className="text-sm text-gray-600">AI-powered workflow generation</p>
        </div>

        <div className="space-y-4">
          {workflowSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border-2 transition-all ${
                step.status === 'completed'
                  ? 'bg-green-50 border-green-200'
                  : step.status === 'in_progress'
                  ? 'bg-blue-50 border-blue-200'
                  : step.status === 'error'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{step.name}</h3>
                    {step.agent && getAgentIcon(step.agent)}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{step.description}</p>
                  
                  {step.status === 'in_progress' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="bg-blue-500 h-2 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '60%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
                      />
                    </div>
                  )}
                  
                  {step.error && (
                    <p className="text-xs text-red-600 mt-1">{step.error}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Workflow Preview */}
        {workflowPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-white rounded-lg border border-gray-200"
          >
            <h3 className="font-semibold text-gray-900 mb-2">Workflow Preview</h3>
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium">Name:</span> {workflowPreview.name}
              </div>
              <div>
                <span className="font-medium">Nodes:</span> {workflowPreview.nodes?.length || 0}
              </div>
              <div>
                <span className="font-medium">Trigger:</span> {workflowPreview.trigger || 'Manual'}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">AI Workflow Assistant</h1>
              <p className="text-sm text-gray-500">Powered by Multi-Agent AI System</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {conversation.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-3xl p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    : message.role === 'system'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-gray-50 text-gray-900'
                }`}>
                  {message.role !== 'user' && message.agent && (
                    <div className="flex items-center space-x-2 mb-2 text-sm opacity-75">
                      {getAgentIcon(message.agent)}
                      <span className="capitalize">{message.agent.replace('_', ' ')} Agent</span>
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap">
                    {message.content}
                  </div>
                  
                  <div className="text-xs mt-2 opacity-60">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-3 text-gray-500"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <CogIcon className="w-5 h-5" />
              </motion.div>
              <span>AI agents are working...</span>
            </motion.div>
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200 p-6 bg-white">
          <div className="flex space-x-4">
            <div className="flex-1">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe the workflow you want to create..."
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={3}
                disabled={isProcessing}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isProcessing}
              className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              <span>Send</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Quick suggestions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {['Email automation', 'Data sync workflow', 'Social media scheduler', 'File processing'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setUserInput(suggestion)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
