import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { n8nApi } from '../lib/n8n';
import { workflowGenerator } from '../lib/workflowGenerator';
import { PlusIcon, PlayIcon, PauseIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ClockIcon, BeakerIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { LoadingSpinner, SkeletonStatCard, SkeletonWorkflowCard, LoadingOverlay } from '../components/LoadingStates';
import { AnimatedCard, AnimatedButton, staggerContainer, staggerItem, fadeIn } from '../components/AnimationUtils';

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

export default function EnhancedDashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [n8nStatus, setN8nStatus] = useState<{
    connected: boolean;
    message: string;
    version?: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

      // Only show error toast if it's a real connection failure (not demo mode fallback)
      if (!result.success && !result.message.includes('demo mode')) {
        toast.error(`n8n connection failed: ${result.message}`);
      } else if (!result.success && result.message.includes('demo mode')) {
        toast.success('Running in demo mode - workflows will be simulated');
      }
    } catch (error) {
      console.error('n8n connection check error:', error);
      setN8nStatus({
        connected: false,
        message: 'Connection test failed - running in demo mode',
      });
      toast.error('n8n connection test failed - switching to demo mode');
    }
  };

  const handleGenerateTestWorkflow = async (type: 'webhook' | 'scheduled') => {
    setIsGenerating(true);
    setActionLoading(type);
    
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
      setActionLoading(null);
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
      <motion.div 
        className="space-y-8"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        {/* Header Skeleton */}
        <motion.div className="flex justify-between items-center" variants={staggerItem}>
          <div>
            <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse" />
        </motion.div>

        {/* Status Card Skeleton */}
        <motion.div 
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 animate-pulse"
          variants={staggerItem}
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg" />
            <div className="flex-1">
              <div className="h-5 w-32 bg-zinc-800 rounded mb-2" />
              <div className="h-4 w-48 bg-zinc-800 rounded" />
            </div>
            <div className="h-8 w-16 bg-zinc-800 rounded" />
          </div>
        </motion.div>

        {/* Stats Cards Skeleton */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerItem}
        >
          {[1, 2, 3, 4].map(i => (
            <SkeletonStatCard key={i} />
          ))}
        </motion.div>

        {/* Workflows Section Skeleton */}
        <motion.div 
          className="bg-zinc-900/50 border border-zinc-800 rounded-lg"
          variants={staggerItem}
        >
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => (
              <SkeletonWorkflowCard key={i} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-8"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* Header */}
      <motion.div 
        className="flex justify-between items-center"
        variants={staggerItem}
      >
        <div>
          <h1 className="text-3xl font-bold font-mono">Dashboard</h1>
          <p className="text-zinc-400 mt-1">
            Manage your AI-powered n8n workflows
          </p>
        </div>
        <Link to="/chat">
          <AnimatedButton variant="primary" className="flex items-center space-x-2">
            <PlusIcon className="w-4 h-4" />
            <span>Create Workflow</span>
          </AnimatedButton>
        </Link>
      </motion.div>

      {/* n8n Status Card */}
      <AnimatedCard className="p-6" variants={staggerItem}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.div 
              className={`p-3 rounded-lg ${n8nStatus?.connected ? 'bg-green-500/10' : 'bg-red-500/10'}`}
              whileHover={{ scale: 1.05 }}
            >
              {n8nStatus?.connected ? (
                <CheckCircleIcon className="w-6 h-6 text-green-400" />
              ) : (
                <XCircleIcon className="w-6 h-6 text-red-400" />
              )}
            </motion.div>
            <div>
              <h2 className="text-lg font-semibold mb-1">n8n Server Status</h2>
              {n8nStatus ? (
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${n8nStatus.connected ? 'text-green-400' : 'text-red-400'}`}>
                    {n8nStatus.message}
                  </span>
                  {n8nStatus.version && (
                    <motion.span 
                      className="text-zinc-500 text-sm bg-zinc-800 px-2 py-1 rounded"
                      whileHover={{ scale: 1.05 }}
                    >
                      v{n8nStatus.version}
                    </motion.span>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-yellow-400">Testing connection...</span>
                </div>
              )}
            </div>
          </div>
          <AnimatedButton 
            variant="ghost" 
            onClick={checkN8nConnection}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Refresh
          </AnimatedButton>
        </div>
      </AnimatedCard>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={staggerItem}
      >
        <AnimatedCard className="p-6 group" hoverScale={1.03}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
                Total Workflows
              </div>
              <motion.div 
                className="text-3xl font-bold mt-2 text-white"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {workflows.length}
              </motion.div>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <BeakerIcon className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-6 group" hoverScale={1.03}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
                Active
              </div>
              <motion.div 
                className="text-3xl font-bold mt-2 text-green-400"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                {workflows.filter(w => w.status === 'active').length}
              </motion.div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-6 group" hoverScale={1.03}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
                Total Executions
              </div>
              <motion.div 
                className="text-3xl font-bold mt-2 text-white"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                {workflows.reduce((sum, w) => sum + w.total_executions, 0).toLocaleString()}
              </motion.div>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <PlayIcon className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-6 group" hoverScale={1.03}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
                Success Rate
              </div>
              <motion.div 
                className="text-3xl font-bold mt-2 text-white"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                {workflows.length > 0 
                  ? Math.round(workflows.reduce((sum, w) => sum + w.success_rate, 0) / workflows.length)
                  : 0
                }%
              </motion.div>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </AnimatedCard>
      </motion.div>

      {/* Workflows List */}
      <motion.div 
        className="bg-zinc-900/50 border border-white/10 rounded-lg"
        variants={staggerItem}
      >
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Your Workflows</h2>
        </div>
        
        {workflows.length === 0 ? (
          <motion.div 
            className="text-center py-12"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <motion.div 
              className="text-zinc-500 mb-4"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <PlusIcon className="w-12 h-12 mx-auto" />
            </motion.div>
            <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
            <p className="text-zinc-400 mb-4">
              Create your first AI-powered n8n workflow to get started.
            </p>
            <Link to="/chat">
              <AnimatedButton variant="primary" className="inline-flex items-center space-x-2">
                <PlusIcon className="w-4 h-4" />
                <span>Create Workflow</span>
              </AnimatedButton>
            </Link>
          </motion.div>
        ) : (
          <motion.div 
            className="divide-y divide-white/10"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence>
              {workflows.map((workflow) => (
                <motion.div 
                  key={workflow.id} 
                  className="px-6 py-4 hover:bg-white/5 transition-colors"
                  variants={fadeIn}
                  layout
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-white truncate">
                          {workflow.name}
                        </h3>
                        <motion.span 
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}
                          whileHover={{ scale: 1.05 }}
                        >
                          {workflow.status}
                        </motion.span>
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
                      <motion.button 
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title={workflow.status === 'active' ? "Pause workflow" : "Start workflow"}
                      >
                        {workflow.status === 'active' ? (
                          <PauseIcon className="w-4 h-4" />
                        ) : (
                          <PlayIcon className="w-4 h-4" />
                        )}
                      </motion.button>
                      <motion.button 
                        className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Delete workflow"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        className="bg-zinc-900/50 border border-white/10 rounded-lg p-6"
        variants={staggerItem}
      >
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={staggerContainer}
        >
          <motion.div variants={staggerItem}>
            <Link
              to="/chat"
              className="flex items-center p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <PlusIcon className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-medium">Create New Workflow</h3>
                <p className="text-sm text-zinc-400">Use AI to generate a new n8n workflow</p>
              </div>
            </Link>
          </motion.div>
          
          <motion.div variants={staggerItem}>
            <LoadingOverlay loading={actionLoading === 'webhook'}>
              <button 
                onClick={() => handleGenerateTestWorkflow('webhook')}
                disabled={isGenerating || !n8nStatus?.connected}
                className="flex items-center p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group w-full h-full"
              >
                <BeakerIcon className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                <div>
                  <h3 className="font-medium">Test Webhook</h3>
                  <p className="text-sm text-zinc-400">Generate & deploy a simple webhook workflow</p>
                </div>
              </button>
            </LoadingOverlay>
          </motion.div>
          
          <motion.div variants={staggerItem}>
            <LoadingOverlay loading={actionLoading === 'scheduled'}>
              <button 
                onClick={() => handleGenerateTestWorkflow('scheduled')}
                disabled={isGenerating || !n8nStatus?.connected}
                className="flex items-center p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group w-full h-full"
              >
                <ClockIcon className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                <div>
                  <h3 className="font-medium">Test Scheduler</h3>
                  <p className="text-sm text-zinc-400">Generate & deploy a simple scheduled workflow</p>
                </div>
              </button>
            </LoadingOverlay>
          </motion.div>
          
          <motion.div variants={staggerItem}>
            <button className="flex items-center p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-left group w-full h-full">
              <PlayIcon className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-medium">View Analytics</h3>
                <p className="text-sm text-zinc-400">Monitor workflow performance and usage</p>
              </div>
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
