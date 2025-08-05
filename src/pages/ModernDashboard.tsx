import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { n8nApi } from '../lib/n8n';
import { workflowGenerator } from '../lib/workflowGenerator';
import { 
  PlusCircle, 
  Activity, 
  BarChart3, 
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
  ArrowRight,
  RefreshCw,
  Layers,
  Bot
} from 'lucide-react';
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

const statsCards = [
  { 
    title: 'Total Workflows', 
    icon: Layers, 
    color: 'from-purple-500 to-purple-700',
    bgColor: 'bg-purple-500/10',
    getValue: (workflows: Workflow[]) => workflows.length 
  },
  { 
    title: 'Active', 
    icon: Activity, 
    color: 'from-green-500 to-green-700',
    bgColor: 'bg-green-500/10',
    getValue: (workflows: Workflow[]) => workflows.filter(w => w.status === 'active').length 
  },
  { 
    title: 'Total Executions', 
    icon: Zap, 
    color: 'from-blue-500 to-blue-700',
    bgColor: 'bg-blue-500/10',
    getValue: (workflows: Workflow[]) => workflows.reduce((sum, w) => sum + w.total_executions, 0) 
  },
  { 
    title: 'Success Rate', 
    icon: TrendingUp, 
    color: 'from-amber-500 to-amber-700',
    bgColor: 'bg-amber-500/10',
    getValue: (workflows: Workflow[]) => {
      const active = workflows.filter(w => w.status === 'active');
      if (active.length === 0) return '0%';
      const avgRate = active.reduce((sum, w) => sum + w.success_rate, 0) / active.length;
      return `${Math.round(avgRate)}%`;
    }
  }
];

const quickActions = [
  {
    title: 'Create New Workflow',
    description: 'Use AI to generate a new n8n workflow',
    icon: Bot,
    action: 'create',
    gradient: 'from-purple-600 to-pink-600'
  },
  {
    title: 'Generate Webhook Workflow',
    description: 'Generate & deploy a simple webhook workflow',
    icon: Zap,
    action: 'webhook',
    gradient: 'from-blue-600 to-cyan-600'
  },
  {
    title: 'Generate Scheduled Workflow',
    description: 'Generate & deploy a simple scheduled workflow',
    icon: Clock,
    action: 'scheduled',
    gradient: 'from-green-600 to-emerald-600'
  },
  {
    title: 'Monitor Performance',
    description: 'Monitor workflow performance and usage',
    icon: BarChart3,
    action: 'analytics',
    gradient: 'from-orange-600 to-red-600'
  }
];

export default function ModernDashboard() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [n8nStatus, setN8nStatus] = useState<{
    connected: boolean;
    message: string;
    version?: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWorkflows(), checkN8nConnection()]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleQuickAction = async (action: string) => {
    if (action === 'create') {
      navigate('/chat');
    } else if (action === 'analytics') {
      toast.success('Analytics coming soon!');
    } else if (action === 'webhook' || action === 'scheduled') {
      setIsGenerating(true);
      try {
        const workflow = await workflowGenerator.generateSimpleWorkflow(action as 'webhook' | 'scheduled');
        const result = await workflowGenerator.deployWorkflow(workflow);
        
        if (result.success) {
          toast.success(`${workflow.name} deployed successfully!`);
          if (result.webhookUrl) {
            navigator.clipboard.writeText(result.webhookUrl);
            toast.success('Webhook URL copied to clipboard!');
          }
          loadWorkflows();
        } else {
          toast.error(`Deployment failed: ${result.message}`);
        }
      } catch (error) {
        toast.error('Failed to generate workflow');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle2;
      case 'failed': return AlertCircle;
      case 'deploying': return RefreshCw;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'deploying': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'draft': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      case 'archived': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="p-2 rounded-lg glass border border-white/10 hover:border-purple-400/50 transition-all"
            disabled={refreshing}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
        <p className="text-gray-400">Manage your AI-powered n8n workflows</p>
      </div>

      {/* n8n Server Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className={`p-4 rounded-lg glass border ${
          n8nStatus?.connected ? 'border-green-400/20' : 'border-red-400/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                n8nStatus?.connected ? 'bg-green-400' : 'bg-red-400'
              } animate-pulse`} />
              <span className="font-medium">n8n Server Status</span>
            </div>
            <span className="text-sm text-gray-400">
              {n8nStatus?.connected ? `Connected • v${n8nStatus.version}` : 'Disconnected'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-modern group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-6 h-6 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} />
              </div>
              <Sparkles className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-sm text-gray-400 mb-1">{stat.title}</h3>
            <p className="text-2xl font-bold">{stat.getValue(workflows)}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction(action.action)}
              disabled={isGenerating}
              className="p-6 rounded-lg glass-dark border border-white/10 hover:border-purple-400/50 transition-all text-left group"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.gradient} p-3 mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-full h-full text-white" />
              </div>
              <h3 className="font-semibold mb-2">{action.title}</h3>
              <p className="text-sm text-gray-400">{action.description}</p>
              <ArrowRight className="w-4 h-4 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Workflows List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Your Workflows</h2>
          <Link
            to="/chat"
            className="btn-modern btn-primary flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Workflow</span>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 skeleton rounded-lg" />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 glass rounded-lg border border-white/10"
          >
            <Layers className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
            <p className="text-gray-400 mb-6">Create your first AI-powered n8n workflow to get started.</p>
            <Link
              to="/chat"
              className="btn-modern btn-primary inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Workflow</span>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {workflows.map((workflow, index) => {
                const StatusIcon = getStatusIcon(workflow.status);
                return (
                  <motion.div
                    key={workflow.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="card-modern group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg group-hover:text-purple-400 transition-colors">
                            {workflow.name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(workflow.status)} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {workflow.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{workflow.description}</p>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Layers className="w-4 h-4" />
                            {workflow.node_count} nodes
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-4 h-4" />
                            {workflow.total_executions} runs
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {workflow.success_rate}% success
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {workflow.last_run ? formatDate(workflow.last_run) : 'Never run'}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}