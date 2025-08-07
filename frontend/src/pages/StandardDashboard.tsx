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
  ArrowRight
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

export default function StandardDashboard() {
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
    toast.success('Data refreshed');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': 
        return 'bg-red-100 text-red-800 border-red-200';
      case 'deploying': 
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': 
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'archived': 
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">
                  Manage your workflow automations
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <Link
                  to="/chat"
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Workflow
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${
                n8nStatus?.connected 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-red-100 text-red-600'
              }`}>
                {n8nStatus?.connected ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  n8n Connection Status
                </h2>
                <p className={`text-sm ${
                  n8nStatus?.connected ? 'text-green-600' : 'text-red-600'
                }`}>
                  {n8nStatus?.message || 'Checking connection...'}
                </p>
                {n8nStatus?.version && (
                  <p className="text-xs text-gray-500 mt-1">
                    Version: {n8nStatus.version}
                  </p>
                )}
              </div>
            </div>
            {n8nStatus?.message?.includes('demo mode') && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full border border-yellow-200">
                Demo Mode
              </span>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Workflows</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {workflows.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {workflows.filter(w => w.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Executions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {workflows.reduce((sum, w) => sum + w.total_executions, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Play className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {workflows.length > 0 
                    ? Math.round(workflows.reduce((sum, w) => sum + w.success_rate, 0) / workflows.length)
                    : 0
                  }%
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Workflows Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl border border-gray-200"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Workflows</h2>
          </div>
          
          {workflows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No workflows yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first AI-powered workflow automation to get started.
              </p>
              <Link
                to="/chat"
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Workflow
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              <AnimatePresence>
                {workflows.map((workflow, index) => (
                  <motion.div 
                    key={workflow.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-medium text-gray-900 truncate">
                            {workflow.name}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(workflow.status)}`}>
                            {workflow.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 truncate">
                          {workflow.description}
                        </p>
                        <div className="flex items-center gap-6 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {workflow.node_count} nodes
                          </span>
                          <span className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            {workflow.total_executions} runs
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            {workflow.success_rate}% success
                          </span>
                          {workflow.last_run && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(workflow.last_run)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button 
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={workflow.status === 'active' ? "Pause workflow" : "Start workflow"}
                        >
                          {workflow.status === 'active' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <button 
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
          className="bg-white rounded-xl border border-gray-200 p-6 mt-8"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/chat"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="p-2 bg-blue-100 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Create Workflow</h3>
                <p className="text-sm text-gray-600">Build a new automation with AI</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
            
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group text-left">
              <div className="p-2 bg-green-100 rounded-lg mr-4 group-hover:bg-green-200 transition-colors">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">View Analytics</h3>
                <p className="text-sm text-gray-600">Monitor performance metrics</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>
            
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group text-left">
              <div className="p-2 bg-purple-100 rounded-lg mr-4 group-hover:bg-purple-200 transition-colors">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Templates</h3>
                <p className="text-sm text-gray-600">Browse workflow templates</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
