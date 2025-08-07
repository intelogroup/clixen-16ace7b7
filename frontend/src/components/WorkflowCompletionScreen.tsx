import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  ExternalLink, 
  Copy, 
  Download, 
  Play, 
  Settings, 
  BarChart3,
  Zap,
  Globe,
  Code2,
  TestTube,
  Clock,
  Users,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WorkflowCompletionScreenProps {
  workflow: {
    id: string;
    name: string;
    description: string;
    webhookUrl?: string;
    n8nUrl?: string;
    nodeCount: number;
    estimatedExecutions?: number;
    createdAt: Date;
    status: 'active' | 'inactive';
  };
  metrics?: {
    generationTime: number;
    deploymentTime: number;
    totalNodes: number;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedCost?: string;
  };
  onCreateAnother?: () => void;
  onViewDashboard?: () => void;
  onTestWorkflow?: () => void;
  onEditWorkflow?: () => void;
  onViewAnalytics?: () => void;
}

const WorkflowCompletionScreen: React.FC<WorkflowCompletionScreenProps> = ({
  workflow,
  metrics,
  onCreateAnother,
  onViewDashboard,
  onTestWorkflow,
  onEditWorkflow,
  onViewAnalytics
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success(`${type} copied to clipboard!`);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'complex': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-6"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Workflow Created Successfully! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Your <strong>{workflow.name}</strong> is ready to use
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Workflow Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-8"
          >
            {/* Workflow Info */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{workflow.name}</h2>
                  <p className="text-gray-600">{workflow.description}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  workflow.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {workflow.status}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Code2 className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-sm text-blue-600 font-medium">{workflow.nodeCount} Nodes</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <p className="text-sm text-green-600 font-medium">
                    {metrics ? formatDuration(metrics.generationTime + metrics.deploymentTime) : 'N/A'}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                  <p className="text-sm text-purple-600 font-medium">
                    {workflow.estimatedExecutions || 0} Runs
                  </p>
                </div>
                {metrics && (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 mx-auto mb-1">
                      <div className={`w-full h-full rounded-full flex items-center justify-center text-xs font-bold ${
                        getComplexityColor(metrics.complexity)
                      }`}>
                        {metrics.complexity[0].toUpperCase()}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium capitalize">{metrics.complexity}</p>
                  </div>
                )}
              </div>
            </div>

            {/* URLs */}
            {(workflow.webhookUrl || workflow.n8nUrl) && (
              <div className="space-y-3 mb-6">
                {workflow.webhookUrl && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Webhook URL</span>
                      <button
                        onClick={() => copyToClipboard(workflow.webhookUrl!, 'Webhook URL')}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        {copied === 'Webhook URL' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="bg-white rounded border p-3">
                      <code className="text-sm text-gray-800 font-mono break-all">
                        {workflow.webhookUrl}
                      </code>
                    </div>
                  </div>
                )}

                {workflow.n8nUrl && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">n8n Editor</span>
                      <a
                        href={workflow.n8nUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="bg-white rounded border p-3">
                      <code className="text-sm text-gray-800 font-mono break-all">
                        {workflow.n8nUrl}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Primary Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {onTestWorkflow && (
                <button
                  onClick={onTestWorkflow}
                  className="flex items-center justify-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all duration-200 font-medium"
                >
                  <TestTube className="w-5 h-5" />
                  <span>Test Workflow</span>
                </button>
              )}
              
              {onEditWorkflow && (
                <button
                  onClick={onEditWorkflow}
                  className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
                >
                  <Settings className="w-5 h-5" />
                  <span>Edit in n8n</span>
                </button>
              )}
            </div>
          </motion.div>

          {/* Side Actions */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            {/* Next Steps Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                Next Steps
              </h3>
              
              <div className="space-y-3">
                {onViewAnalytics && (
                  <button
                    onClick={onViewAnalytics}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">View Analytics</p>
                      <p className="text-sm text-gray-600">Monitor performance</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>
                )}

                {onViewDashboard && (
                  <button
                    onClick={onViewDashboard}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <Globe className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Dashboard</p>
                      <p className="text-sm text-gray-600">Manage all workflows</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>
                )}

                {onCreateAnother && (
                  <button
                    onClick={onCreateAnother}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <Plus className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">Create Another</p>
                      <p className="text-sm text-gray-600">Build more workflows</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Card */}
            {metrics && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Generation Stats</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Generation Time</span>
                    <span className="font-medium">{formatDuration(metrics.generationTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deployment Time</span>
                    <span className="font-medium">{formatDuration(metrics.deploymentTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Nodes</span>
                    <span className="font-medium">{metrics.totalNodes}</span>
                  </div>
                  {metrics.estimatedCost && (
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Est. Monthly Cost</span>
                      <span className="font-medium text-green-600">{metrics.estimatedCost}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Share Card */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-2 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Share Your Success
              </h3>
              <p className="text-blue-100 text-sm mb-4">
                Show others what you built with AI-powered automation
              </p>
              <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium w-full">
                Share Workflow
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowCompletionScreen;