import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { n8nApi } from '../lib/n8n';
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  BarChart3,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Activity,
  Calendar,
  Globe,
  Sparkles,
  Settings,
  Eye
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

export default function ProfessionalDashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [n8nStatus, setN8nStatus] = useState<{
    connected: boolean;
    message: string;
    version?: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadUserData(),
      loadWorkflows(),
      checkN8nConnection()
    ]);
    setLoading(false);
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
      console.error('Error loading workflows:', error);
    }
  };

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
        message: 'Connection test failed',
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': 
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'failed': 
        return 'bg-red-100 text-red-800 border-red-200';
      case 'deploying': 
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'draft': 
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'archived': 
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default: 
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'failed': return <XCircle className="w-3 h-3" />;
      case 'deploying': return <RefreshCw className="w-3 h-3 animate-spin" />;
      case 'draft': return <Clock className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 7) return formatDate(dateString);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const totalExecutions = workflows.reduce((sum, w) => sum + w.total_executions, 0);
  const avgSuccessRate = workflows.length > 0 
    ? Math.round(workflows.reduce((sum, w) => sum + w.success_rate, 0) / workflows.length)
    : 0;
  const activeWorkflows = workflows.filter(w => w.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Automation Hub</h1>
                  <p className="text-slate-600 text-sm">
                    {user?.profile?.name ? `Welcome back, ${user.profile.name}` : 'Manage your workflow automations'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200 disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                to="/chat"
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Workflow
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Connection Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl shadow-sm ${
                n8nStatus?.connected 
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white' 
                  : 'bg-gradient-to-br from-red-500 to-rose-600 text-white'
              }`}>
                {n8nStatus?.connected ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Automation Engine
                  </h2>
                  <div className={`w-2 h-2 rounded-full ${
                    n8nStatus?.connected ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
                <p className={`text-sm font-medium ${
                  n8nStatus?.connected ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {n8nStatus?.message || 'Checking connection status...'}
                </p>
                {n8nStatus?.version && (
                  <p className="text-xs text-slate-500 mt-1">
                    {n8nStatus.version}
                  </p>
                )}
              </div>
            </div>
            {n8nStatus?.message?.includes('demo mode') && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg border border-amber-200">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Demo Mode</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Workflows</p>
                <p className="text-3xl font-bold text-slate-900">
                  {workflows.length}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {workflows.filter(w => w.status === 'draft').length} in draft
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Active</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {activeWorkflows}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {Math.round((activeWorkflows / Math.max(workflows.length, 1)) * 100)}% of total
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-sm">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Executions</p>
                <p className="text-3xl font-bold text-slate-900">
                  {totalExecutions.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Last 30 days
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-sm">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Success Rate</p>
                <p className="text-3xl font-bold text-slate-900">
                  {avgSuccessRate}%
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Average across all workflows
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-sm">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Workflows Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Workflow Library</h2>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Activity className="w-4 h-4" />
                {workflows.length} workflows
              </div>
            </div>
          </div>
          
          {workflows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Ready to automate?
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Create your first AI-powered workflow to connect apps, automate tasks, and streamline your business processes.
              </p>
              <Link
                to="/chat"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Your First Workflow
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/60">
              <AnimatePresence>
                {workflows.map((workflow, index) => (
                  <motion.div 
                    key={workflow.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 hover:bg-slate-50/50 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                            {workflow.name}
                          </h3>
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(workflow.status)}`}>
                            {getStatusIcon(workflow.status)}
                            <span className="capitalize">{workflow.status}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                          {workflow.description}
                        </p>
                        <div className="flex items-center gap-6 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span>{workflow.node_count} nodes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            <span>{workflow.total_executions.toLocaleString()} runs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            <span>{workflow.success_rate}% success</span>
                          </div>
                          {workflow.last_run && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Last run {formatRelativeTime(workflow.last_run)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
                          title="View workflow"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
                          title={workflow.status === 'active' ? "Pause workflow" : "Start workflow"}
                        >
                          {workflow.status === 'active' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <button 
                          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete workflow"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold text-slate-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/chat"
              className="flex items-center p-5 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200 group"
            >
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mr-4 group-hover:scale-105 transition-transform shadow-sm">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">New Workflow</h3>
                <p className="text-sm text-slate-600">Create automation with AI assistance</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>
            
            <button className="flex items-center p-5 border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-all duration-200 group text-left">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl mr-4 group-hover:scale-105 transition-transform shadow-sm">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Analytics</h3>
                <p className="text-sm text-slate-600">Monitor performance and insights</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </button>
            
            <button className="flex items-center p-5 border border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/30 transition-all duration-200 group text-left">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl mr-4 group-hover:scale-105 transition-transform shadow-sm">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Templates</h3>
                <p className="text-sm text-slate-600">Browse pre-built workflow templates</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
