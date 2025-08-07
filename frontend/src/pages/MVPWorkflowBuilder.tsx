/**
 * MVP Workflow Builder - Complete user journey implementation
 * 
 * This component provides a complete MVP experience with:
 * - Auth integration
 * - AI chat for workflow creation
 * - Real-time n8n testing and healing
 * - Visual workflow building
 * - Deployment and monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { workflowHealer, HealingResult } from '../lib/healing/N8nWorkflowHealer';
import { n8nApi } from '../lib/n8n';
import WorkflowTestingPanel from '../components/WorkflowTestingPanel';
import { supabase } from '../lib/supabase';

interface WorkflowNode {
  id: string;
  type: string;
  position: [number, number];
  parameters: any;
}

interface Workflow {
  id?: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: any;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

const MVPWorkflowBuilder: React.FC = () => {
  const { user } = useAuth();
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<string>('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [n8nStatus, setN8nStatus] = useState<{ connected: boolean; message: string } | null>(null);

  // Initialize
  useEffect(() => {
    loadUserWorkflows();
    checkN8nConnection();
    
    // Add welcome message
    setChatHistory([{
      role: 'system',
      content: '👋 Welcome to Clixen! I\'m your AI workflow assistant. Tell me what you want to automate and I\'ll help you build it.',
      timestamp: new Date().toISOString()
    }]);
  }, [user]);

  const loadUserWorkflows = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const checkN8nConnection = async () => {
    try {
      const result = await n8nApi.testConnection();
      setN8nStatus({ connected: result.success, message: result.message });
    } catch (error) {
      setN8nStatus({ 
        connected: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      });
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || isAiThinking) return;

    const userMessage = {
      role: 'user' as const,
      content: chatMessage,
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setChatMessage('');
    setIsAiThinking(true);

    try {
      // Call AI chat system via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-chat-system', {
        body: {
          message: chatMessage,
          context: 'workflow-builder',
          user_id: user?.id,
          conversation_history: chatHistory.slice(-10) // Last 10 messages for context
        }
      });

      if (error) throw error;

      const aiResponse = {
        role: 'assistant' as const,
        content: data.response || 'I apologize, but I encountered an error processing your request.',
        timestamp: new Date().toISOString()
      };

      setChatHistory(prev => [...prev, aiResponse]);

      // If AI generated a workflow, parse and set it
      if (data.workflow) {
        const generatedWorkflow: Workflow = {
          name: data.workflow.name || `Generated Workflow ${Date.now()}`,
          description: data.workflow.description || 'AI-generated workflow',
          nodes: data.workflow.nodes || [],
          connections: data.workflow.connections || {},
          active: false
        };
        setCurrentWorkflow(generatedWorkflow);
      }

    } catch (error) {
      console.error('AI chat error:', error);
      const errorResponse = {
        role: 'assistant' as const,
        content: '🔧 I\'m currently in demo mode. Try asking me to "create a simple webhook workflow" or "build an email automation".',
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorResponse]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const createBasicWorkflow = () => {
    const basicWorkflow: Workflow = {
      name: 'New Workflow',
      description: 'A basic workflow template',
      nodes: [
        {
          id: 'start',
          type: 'n8n-nodes-base.start',
          position: [250, 300],
          parameters: {}
        },
        {
          id: 'set',
          type: 'n8n-nodes-base.set',
          position: [450, 300],
          parameters: {
            values: {
              string: [
                {
                  name: 'message',
                  value: 'Hello from Clixen!'
                }
              ]
            }
          }
        }
      ],
      connections: {
        start: {
          main: [
            [
              {
                node: 'set',
                type: 'main',
                index: 0
              }
            ]
          ]
        }
      },
      active: false
    };

    setCurrentWorkflow(basicWorkflow);
  };

  const saveWorkflow = async () => {
    if (!currentWorkflow || !user) return;

    setIsCreating(true);
    try {
      const workflowData = {
        ...currentWorkflow,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      if (currentWorkflow.id) {
        // Update existing
        const { error } = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', currentWorkflow.id);
        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('workflows')
          .insert([workflowData])
          .select()
          .single();
        if (error) throw error;
        setCurrentWorkflow(prev => prev ? { ...prev, id: data.id } : null);
      }

      await loadUserWorkflows();
      alert('✅ Workflow saved successfully!');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('❌ Failed to save workflow. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const deployWorkflow = async () => {
    if (!currentWorkflow) return;

    setDeploymentStatus('Testing workflow...');
    
    try {
      // First, heal the workflow
      const healingResult = await workflowHealer.healWorkflow(currentWorkflow, {
        userId: user?.id,
        sessionId: 'current-session'
      });

      if (!healingResult.success && healingResult.needsManualReview) {
        setDeploymentStatus('❌ Workflow has critical issues that need manual review');
        return;
      }

      const workflowToDeploy = healingResult.healedWorkflow || currentWorkflow;
      
      setDeploymentStatus('Deploying to n8n...');
      
      // Deploy to n8n
      const deployed = await n8nApi.createWorkflow(workflowToDeploy);
      
      setDeploymentStatus('Activating workflow...');
      
      // Activate workflow
      await n8nApi.toggleWorkflow(deployed.id, true);
      
      setDeploymentStatus('✅ Workflow deployed and activated successfully!');
      
      // Update local workflow with n8n ID
      setCurrentWorkflow(prev => prev ? { 
        ...prev, 
        id: deployed.id,
        active: true 
      } : null);

    } catch (error) {
      console.error('Deployment failed:', error);
      setDeploymentStatus(`❌ Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleWorkflowHealed = (healedWorkflow: any) => {
    setCurrentWorkflow(healedWorkflow);
    setChatHistory(prev => [...prev, {
      role: 'system',
      content: '🔧 I\'ve automatically fixed some issues in your workflow. Please review the changes.',
      timestamp: new Date().toISOString()
    }]);
  };

  const handleTestComplete = (result: HealingResult) => {
    const message = result.success 
      ? `✅ Workflow validation passed! Found and fixed ${result.fixes.length} issues.`
      : `⚠️ Workflow validation found ${result.errors.length} issues. ${result.needsManualReview ? 'Manual review needed.' : 'Some fixes were applied automatically.'}`;
    
    setChatHistory(prev => [...prev, {
      role: 'system',
      content: message,
      timestamp: new Date().toISOString()
    }]);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Please Sign In</h1>
          <p className="text-gray-600 mt-2">You need to be authenticated to use the workflow builder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">🤖 Clixen Workflow Builder</h1>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  n8nStatus?.connected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm text-gray-600">
                  {n8nStatus?.connected ? 'n8n Connected' : 'n8n Disconnected'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">👋 {user.email}</span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* AI Chat Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900">🤖 AI Assistant</h2>
                <p className="text-sm text-gray-600">Describe what you want to automate</p>
              </div>
              
              <div className="p-4">
                {/* Chat History */}
                <div className="h-96 overflow-y-auto space-y-3 mb-4">
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : message.role === 'system'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  
                  {isAiThinking && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 px-3 py-2 rounded-lg text-sm text-gray-800">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                          AI is thinking...
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="e.g., Create a webhook that sends emails"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isAiThinking}
                  />
                  <button
                    type="submit"
                    disabled={!chatMessage.trim() || isAiThinking}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Workflow Builder */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              
              {/* Workflow Header */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {currentWorkflow ? currentWorkflow.name : 'No Workflow Selected'}
                    </h2>
                    {currentWorkflow?.description && (
                      <p className="text-sm text-gray-600 mt-1">{currentWorkflow.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!currentWorkflow && (
                      <button
                        onClick={createBasicWorkflow}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        ➕ Create Basic Workflow
                      </button>
                    )}
                    
                    {currentWorkflow && (
                      <>
                        <button
                          onClick={saveWorkflow}
                          disabled={isCreating}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                        >
                          {isCreating ? '💾 Saving...' : '💾 Save'}
                        </button>
                        
                        <button
                          onClick={deployWorkflow}
                          disabled={!n8nStatus?.connected}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300"
                        >
                          🚀 Deploy
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {deploymentStatus && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                    {deploymentStatus}
                  </div>
                )}
              </div>

              {/* Workflow Visualization */}
              {currentWorkflow && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">🔧 Workflow Structure</h3>
                  
                  <div className="space-y-4">
                    {/* Nodes */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Nodes ({currentWorkflow.nodes.length})</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentWorkflow.nodes.map((node, index) => (
                          <div key={node.id} className="p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {node.type.includes('start') ? '▶️' : 
                                 node.type.includes('webhook') ? '🔗' :
                                 node.type.includes('set') ? '⚙️' :
                                 node.type.includes('function') ? '🔧' : '📦'}
                              </span>
                              <div>
                                <p className="text-sm font-medium">{node.id}</p>
                                <p className="text-xs text-gray-500">{node.type.split('.').pop()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Connections */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Connections ({Object.keys(currentWorkflow.connections).length})
                      </h4>
                      <div className="text-sm text-gray-600">
                        {Object.keys(currentWorkflow.connections).length > 0 ? (
                          <ul className="space-y-1">
                            {Object.entries(currentWorkflow.connections).map(([source, connections]) => (
                              <li key={source} className="flex items-center gap-2">
                                <span>{source}</span>
                                <span>→</span>
                                <span>
                                  {Object.values(connections as any).flat().flat()
                                    .map((conn: any) => conn.node).join(', ')}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">No connections defined</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Workflow Testing Panel */}
              <WorkflowTestingPanel
                workflow={currentWorkflow}
                onWorkflowHealed={handleWorkflowHealed}
                onTestComplete={handleTestComplete}
              />

              {/* User Workflows */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h3 className="text-md font-semibold text-gray-900 mb-4">📁 Your Workflows ({workflows.length})</h3>
                
                {workflows.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {workflows.map((workflow) => (
                      <div
                        key={workflow.id}
                        className="p-4 border border-gray-200 rounded-md hover:border-blue-300 cursor-pointer"
                        onClick={() => setCurrentWorkflow(workflow)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                            <p className="text-sm text-gray-600">{workflow.nodes.length} nodes</p>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            workflow.active ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                        </div>
                        
                        {workflow.description && (
                          <p className="text-xs text-gray-500 mt-2">{workflow.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl">📝</span>
                    <p className="mt-2">No workflows yet</p>
                    <p className="text-sm">Create your first workflow to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MVPWorkflowBuilder;
