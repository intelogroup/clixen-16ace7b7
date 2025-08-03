import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { n8nApi } from '../lib/n8n';
import { workflowGenerator } from '../lib/workflowGenerator';
import { PlusIcon, PlayIcon, PauseIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ClockIcon, BeakerIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'deploying' | 'active' | 'failed' | 'archived';
  node_count: number;
  total_executions: number;
  success_rate: number;
  last_run: string | null;
  created_at: string;
}

export default function Dashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [n8nStatus, setN8nStatus] = useState<{
    connected: boolean;
    message: string;
    version?: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadUserData();
    loadWorkflows();
    checkN8nConnection();
  }, []);

  const checkN8nConnection = async () => {
    try {
      const result = await n8nApi.testConnection();
      setN8nStatus({
        connected: result.success,
        message: result.message,
        version: result.version,
      });
    } catch (error) {
      setN8nStatus({
        connected: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    }
  };

  const handleGenerateTestWorkflow = async (type: 'webhook' | 'scheduled') => {
    setIsGenerating(true);
    
    try {
      toast.success(`Generating ${type} workflow...`);
      
      // Generate the workflow
      const workflow = await workflowGenerator.generateSimpleWorkflow(type);
      
      // Deploy to n8n
      const result = await workflowGenerator.deployWorkflow(workflow);
      
      if (result.success) {
        toast.success(`${workflow.name} deployed successfully!`);
        
        // Test the workflow
        const testResult = await workflowGenerator.testWorkflow(
          result.workflowId!,
          result.webhookUrl
        );
        
        if (testResult.success) {
          toast.success(`Workflow test passed! ${testResult.message}`);
          if (result.webhookUrl) {
            navigator.clipboard.writeText(result.webhookUrl);
            toast.success('Webhook URL copied to clipboard!');
          }
        } else {
          toast.error(`Workflow test failed: ${testResult.message}`);
        }
        
        // Reload workflows to show the new one
        loadWorkflows();
      } else {
        toast.error(`Deployment failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Workflow generation error:', error);
      toast.error('Failed to generate workflow');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setUser({ ...user, profile });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('user_workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error: any) {
      toast.error('Failed to load workflows');
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'failed': return 'text-red-400 bg-red-400/10';
      case 'deploying': return 'text-yellow-400 bg-yellow-400/10';
      case 'draft': return 'text-gray-400 bg-gray-400/10';
      case 'archived': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-mono">Dashboard</h1>
          <p className="text-zinc-400 mt-1">
            Manage your AI-powered n8n workflows
          </p>
        </div>
        <Link
          to="/chat"
          className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-white/90 transition-colors flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Create Workflow</span>
        </Link>
      </div>

      {/* n8n Status Card */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">n8n Server Status</h2>
            {n8nStatus ? (
              <div className="flex items-center space-x-2">
                {n8nStatus.connected ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircleIcon className="w-5 h-5 text-red-400" />
                )}
                <span className={n8nStatus.connected ? 'text-green-400' : 'text-red-400'}>
                  {n8nStatus.message}
                </span>
                {n8nStatus.version && (
                  <span className="text-zinc-500">({n8nStatus.version})</span>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-yellow-400 animate-spin" />
                <span className="text-yellow-400">Testing connection...</span>
              </div>
            )}
          </div>
          <button
            onClick={checkN8nConnection}
            className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6">
          <div className="text-sm font-medium text-zinc-400">Total Workflows</div>
          <div className="text-2xl font-bold mt-1">{workflows.length}</div>
        </div>
        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6">
          <div className="text-sm font-medium text-zinc-400">Active</div>
          <div className="text-2xl font-bold mt-1 text-green-400">
            {workflows.filter(w => w.status === 'active').length}
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6">
          <div className="text-sm font-medium text-zinc-400">Total Executions</div>
          <div className="text-2xl font-bold mt-1">
            {workflows.reduce((sum, w) => sum + w.total_executions, 0)}
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6">
          <div className="text-sm font-medium text-zinc-400">Success Rate</div>
          <div className="text-2xl font-bold mt-1">
            {workflows.length > 0 
              ? Math.round(workflows.reduce((sum, w) => sum + w.success_rate, 0) / workflows.length)
              : 0
            }%
          </div>
        </div>
      </div>

      {/* Workflows List */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-lg">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Your Workflows</h2>
        </div>
        
        {workflows.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-zinc-500 mb-4">
              <PlusIcon className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
            <p className="text-zinc-400 mb-4">
              Create your first AI-powered n8n workflow to get started.
            </p>
            <Link
              to="/chat"
              className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-white/90 transition-colors inline-flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Workflow</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-sm font-medium text-white truncate">
                        {workflow.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
                        {workflow.status}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1 truncate">
                      {workflow.description}
                    </p>
                    <div className="flex items-center space-x-6 mt-2 text-xs text-zinc-500">
                      <span>{workflow.node_count} nodes</span>
                      <span>{workflow.total_executions} executions</span>
                      <span>{workflow.success_rate}% success rate</span>
                      {workflow.last_run && (
                        <span>Last run: {formatDate(workflow.last_run)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {workflow.status === 'active' ? (
                      <button className="p-2 text-zinc-400 hover:text-white transition-colors" title="Pause workflow">
                        <PauseIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button className="p-2 text-zinc-400 hover:text-white transition-colors" title="Start workflow">
                        <PlayIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button className="p-2 text-zinc-400 hover:text-red-400 transition-colors" title="Delete workflow">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/chat"
            className="flex items-center p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          >
            <PlusIcon className="w-6 h-6 mr-3" />
            <div>
              <h3 className="font-medium">Create New Workflow</h3>
              <p className="text-sm text-zinc-400">Use AI to generate a new n8n workflow</p>
            </div>
          </Link>
          
          <button 
            onClick={() => handleGenerateTestWorkflow('webhook')}
            disabled={isGenerating || !n8nStatus?.connected}
            className="flex items-center p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BeakerIcon className="w-6 h-6 mr-3" />
            <div>
              <h3 className="font-medium">Test Webhook</h3>
              <p className="text-sm text-zinc-400">Generate & deploy a simple webhook workflow</p>
            </div>
          </button>
          
          <button 
            onClick={() => handleGenerateTestWorkflow('scheduled')}
            disabled={isGenerating || !n8nStatus?.connected}
            className="flex items-center p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClockIcon className="w-6 h-6 mr-3" />
            <div>
              <h3 className="font-medium">Test Scheduler</h3>
              <p className="text-sm text-zinc-400">Generate & deploy a simple scheduled workflow</p>
            </div>
          </button>
          
          <button className="flex items-center p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-left">
            <PlayIcon className="w-6 h-6 mr-3" />
            <div>
              <h3 className="font-medium">View Analytics</h3>
              <p className="text-sm text-zinc-400">Monitor workflow performance and usage</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}