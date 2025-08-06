import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Zap, 
  Clock, 
  MemoryStick, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Database,
  Cpu,
  Network,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { contextManager } from '../lib/agents/ContextManager';

interface PerformanceMetrics {
  memory: {
    current: number;
    peak: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  response: {
    current: number;
    p95: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  errors: {
    count: number;
    rate: number;
    lastError?: string;
  };
  circuitBreakers: {
    openai: 'closed' | 'open' | 'half-open';
    n8n: 'closed' | 'open' | 'half-open';
  };
  agents: {
    active: number;
    idle: number;
    error: number;
    thinking: number;
  };
  context: {
    activeContexts: number;
    taskLocks: number;
    memoryItems: number;
    messages: number;
  };
}

interface AgentPerformanceDashboardProps {
  conversationId?: string;
  isVisible?: boolean;
  onToggle?: () => void;
}

export default function AgentPerformanceDashboard({ 
  conversationId,
  isVisible = false,
  onToggle 
}: AgentPerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memory: { current: 0, peak: 0, average: 0, trend: 'stable' },
    response: { current: 0, p95: 0, average: 0, trend: 'stable' },
    errors: { count: 0, rate: 0 },
    circuitBreakers: { openai: 'closed', n8n: 'closed' },
    agents: { active: 0, idle: 0, error: 0, thinking: 0 },
    context: { activeContexts: 0, taskLocks: 0, memoryItems: 0, messages: 0 }
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    
    try {
      // Get context manager stats
      const contextStats = contextManager.getStats();
      
      // Simulate other metrics (in production these would come from real monitoring)
      const newMetrics: PerformanceMetrics = {
        memory: {
          current: Math.random() * 100 + 20, // 20-120 MB
          peak: Math.random() * 150 + 50,    // 50-200 MB
          average: Math.random() * 80 + 30,  // 30-110 MB
          trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any
        },
        response: {
          current: Math.random() * 2000 + 500, // 500-2500ms
          p95: Math.random() * 3000 + 1000,    // 1-4s
          average: Math.random() * 1500 + 800, // 800-2300ms
          trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any
        },
        errors: {
          count: Math.floor(Math.random() * 5),
          rate: Math.random() * 2, // 0-2%
          lastError: Math.random() > 0.7 ? 'OpenAI API timeout' : undefined
        },
        circuitBreakers: {
          openai: ['closed', 'closed', 'closed', 'half-open', 'open'][Math.floor(Math.random() * 5)] as any,
          n8n: ['closed', 'closed', 'half-open'][Math.floor(Math.random() * 3)] as any
        },
        agents: {
          active: Math.floor(Math.random() * 3) + 1,
          idle: Math.floor(Math.random() * 2),
          error: Math.floor(Math.random() * 2),
          thinking: Math.floor(Math.random() * 2)
        },
        context: {
          activeContexts: contextStats.activeContexts,
          taskLocks: contextStats.totalTaskLocks,
          memoryItems: contextStats.totalMemoryItems,
          messages: contextStats.totalMessages
        }
      };

      setMetrics(newMetrics);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      refreshMetrics();
      const interval = setInterval(refreshMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const getStatusColor = (status: string, value?: number, threshold?: number): string => {
    if (status === 'error' || status === 'open') return 'text-red-500';
    if (status === 'warning' || status === 'half-open') return 'text-yellow-500';
    if (status === 'thinking' || status === 'working') return 'text-blue-500';
    if (value && threshold && value > threshold) return 'text-red-500';
    return 'text-green-500';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-red-500" />;
      case 'down': return <TrendingUp className="w-3 h-3 text-green-500 rotate-180" />;
      default: return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getCircuitBreakerIcon = (state: string) => {
    switch (state) {
      case 'open': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'half-open': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors z-50"
        title="Show Performance Dashboard"
      >
        <Activity className="w-5 h-5" />
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed top-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Performance Monitor
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshMetrics}
              disabled={isRefreshing}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              title="Refresh Metrics"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onToggle}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Hide Dashboard"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* System Resources */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">System Resources</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MemoryStick className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium">Memory</span>
                  </div>
                  {getTrendIcon(metrics.memory.trend)}
                </div>
                <div className="mt-1">
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {metrics.memory.current.toFixed(1)}MB
                  </div>
                  <div className="text-xs text-gray-500">
                    Peak: {metrics.memory.peak.toFixed(1)}MB
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium">Response</span>
                  </div>
                  {getTrendIcon(metrics.response.trend)}
                </div>
                <div className="mt-1">
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {metrics.response.current.toFixed(0)}ms
                  </div>
                  <div className="text-xs text-gray-500">
                    P95: {metrics.response.p95.toFixed(0)}ms
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Circuit Breakers */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Circuit Breakers</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center space-x-2">
                  <Network className="w-4 h-4 text-purple-500" />
                  <span className="text-sm">OpenAI API</span>
                </div>
                <div className="flex items-center space-x-1">
                  {getCircuitBreakerIcon(metrics.circuitBreakers.openai)}
                  <span className={`text-xs font-medium capitalize ${getStatusColor(metrics.circuitBreakers.openai)}`}>
                    {metrics.circuitBreakers.openai}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">n8n API</span>
                </div>
                <div className="flex items-center space-x-1">
                  {getCircuitBreakerIcon(metrics.circuitBreakers.n8n)}
                  <span className={`text-xs font-medium capitalize ${getStatusColor(metrics.circuitBreakers.n8n)}`}>
                    {metrics.circuitBreakers.n8n}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Status */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Agent Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Active: {metrics.agents.active}</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Idle: {metrics.agents.idle}</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <Cpu className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Thinking: {metrics.agents.thinking}</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm">Error: {metrics.agents.error}</span>
              </div>
            </div>
          </div>

          {/* Context Management */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Context Management</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Active Contexts</span>
                <span className="font-medium">{metrics.context.activeContexts}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Task Locks</span>
                <span className="font-medium">{metrics.context.taskLocks}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Memory Items</span>
                <span className="font-medium">{metrics.context.memoryItems}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Messages</span>
                <span className="font-medium">{metrics.context.messages}</span>
              </div>
            </div>
          </div>

          {/* Error Information */}
          {(metrics.errors.count > 0 || metrics.errors.lastError) && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Issues</h4>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    {metrics.errors.count} errors ({metrics.errors.rate.toFixed(1)}% rate)
                  </span>
                </div>
                {metrics.errors.lastError && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Latest: {metrics.errors.lastError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}