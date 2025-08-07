// Enhanced agent monitoring component with real-time status updates
import React, { useState, useEffect } from 'react';
import { AgentState, WorkflowPhase } from '../lib/agents/types';
import { errorHandler, ErrorMetrics, ErrorSeverity } from '../lib/agents/ErrorHandler';
import { 
  Brain, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Zap,
  TrendingUp,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';

interface AgentMonitorProps {
  agentStates: Record<string, AgentState>;
  currentPhase: WorkflowPhase;
  overallProgress: number;
  conversationId?: string;
}

interface AgentMetrics {
  tasksCompleted: number;
  averageResponseTime: number;
  successRate: number;
  lastActivity: number;
}

export const AgentMonitor: React.FC<AgentMonitorProps> = ({
  agentStates,
  currentPhase,
  overallProgress,
  conversationId
}) => {
  const [errorMetrics, setErrorMetrics] = useState<ErrorMetrics | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<Record<string, AgentMetrics>>({});
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  useEffect(() => {
    // Update error metrics every 5 seconds
    const interval = setInterval(() => {
      setErrorMetrics(errorHandler.getMetrics());
    }, 5000);

    // Subscribe to error events
    const unsubscribe = errorHandler.onError((error) => {
      console.log('New error detected:', error);
      setErrorMetrics(errorHandler.getMetrics());
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Calculate agent metrics from states
    const metrics: Record<string, AgentMetrics> = {};
    
    Object.entries(agentStates).forEach(([agentId, state]) => {
      metrics[agentId] = {
        tasksCompleted: state.metadata?.tasksCompleted || 0,
        averageResponseTime: state.metadata?.avgResponseTime || 0,
        successRate: state.metadata?.successRate || 100,
        lastActivity: state.lastUpdate
      };
    });
    
    setAgentMetrics(metrics);
  }, [agentStates]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'thinking':
        return <Brain className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'working':
        return <Activity className="w-4 h-4 text-green-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPhaseColor = (phase: WorkflowPhase) => {
    switch (phase) {
      case 'understanding':
        return 'bg-blue-500';
      case 'designing':
        return 'bg-purple-500';
      case 'building':
        return 'bg-yellow-500';
      case 'testing':
        return 'bg-orange-500';
      case 'deploying':
        return 'bg-red-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAgentTypeColor = (agentId: string) => {
    if (agentId === 'orchestrator') return 'border-purple-500 bg-purple-50';
    if (agentId.includes('designer')) return 'border-blue-500 bg-blue-50';
    if (agentId.includes('deployment')) return 'border-green-500 bg-green-50';
    return 'border-gray-500 bg-gray-50';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getHealthStatus = () => {
    if (!errorMetrics) return 'healthy';
    if (errorMetrics.errorRate > 10) return 'critical';
    if (errorMetrics.errorRate > 5) return 'warning';
    return 'healthy';
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Header with Overall Status */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Agent System Monitor</h2>
          {conversationId && (
            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
              {conversationId.slice(0, 8)}...
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* System Health Indicator */}
          <div className="flex items-center space-x-2">
            {healthStatus === 'healthy' && (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-600">System Healthy</span>
              </>
            )}
            {healthStatus === 'warning' && (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-yellow-600">Performance Issues</span>
              </>
            )}
            {healthStatus === 'critical' && (
              <>
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-600">Critical Errors</span>
              </>
            )}
          </div>
          
          {/* Refresh Indicator */}
          <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
        </div>
      </div>

      {/* Phase Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Current Phase: <span className="capitalize">{currentPhase}</span>
          </span>
          <span className="text-sm text-gray-500">{overallProgress}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-2 ${getPhaseColor(currentPhase)} transition-all duration-500 ease-out`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        
        {/* Phase Steps */}
        <div className="flex justify-between mt-2">
          {['understanding', 'designing', 'building', 'testing', 'deploying', 'completed'].map((phase) => (
            <div 
              key={phase}
              className={`text-xs ${currentPhase === phase ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}
            >
              {phase.charAt(0).toUpperCase() + phase.slice(1, 3)}
            </div>
          ))}
        </div>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(agentStates).map(([agentId, state]) => {
          const metrics = agentMetrics[agentId];
          const isExpanded = expandedAgent === agentId;
          
          return (
            <div
              key={agentId}
              className={`border-2 rounded-lg p-4 transition-all duration-200 cursor-pointer
                ${getAgentTypeColor(agentId)} hover:shadow-md`}
              onClick={() => setExpandedAgent(isExpanded ? null : agentId)}
            >
              {/* Agent Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(state.status)}
                  <span className="font-medium text-gray-900">{state.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {state.progress > 0 && state.progress < 100 && (
                    <span className="text-xs text-gray-500">{state.progress}%</span>
                  )}
                </div>
              </div>

              {/* Current Task */}
              {state.currentTask && (
                <div className="text-sm text-gray-600 mb-2 truncate">
                  <span className="font-medium">Task:</span> {state.currentTask}
                </div>
              )}

              {/* Mini Progress Bar */}
              {state.progress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-1 mb-3">
                  <div 
                    className="h-1 bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
              )}

              {/* Metrics (Expandable) */}
              {isExpanded && metrics && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tasks Completed:</span>
                    <span className="font-medium">{metrics.tasksCompleted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg Response:</span>
                    <span className="font-medium">{formatTime(metrics.averageResponseTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Success Rate:</span>
                    <span className={`font-medium ${
                      metrics.successRate >= 90 ? 'text-green-600' : 
                      metrics.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {metrics.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Active:</span>
                    <span className="font-medium">
                      {new Date(metrics.lastActivity).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error Metrics Section */}
      {errorMetrics && errorMetrics.totalErrors > 0 && (
        <div className="border-t pt-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowErrorDetails(!showErrorDetails)}
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="font-medium text-gray-900">Error Metrics</span>
              <span className="text-sm text-gray-500">
                ({errorMetrics.totalErrors} total errors)
              </span>
            </div>
            <span className="text-sm text-gray-400">
              {showErrorDetails ? 'Hide' : 'Show'} Details
            </span>
          </div>
          
          {showErrorDetails && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-red-50 rounded p-2">
                <div className="text-red-600 font-medium">Critical</div>
                <div className="text-2xl font-bold text-red-700">
                  {errorMetrics.errorsBySeverity.get(ErrorSeverity.CRITICAL) || 0}
                </div>
              </div>
              <div className="bg-orange-50 rounded p-2">
                <div className="text-orange-600 font-medium">High</div>
                <div className="text-2xl font-bold text-orange-700">
                  {errorMetrics.errorsBySeverity.get(ErrorSeverity.HIGH) || 0}
                </div>
              </div>
              <div className="bg-yellow-50 rounded p-2">
                <div className="text-yellow-600 font-medium">Medium</div>
                <div className="text-2xl font-bold text-yellow-700">
                  {errorMetrics.errorsBySeverity.get(ErrorSeverity.MEDIUM) || 0}
                </div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-600 font-medium">Low</div>
                <div className="text-2xl font-bold text-gray-700">
                  {errorMetrics.errorsBySeverity.get(ErrorSeverity.LOW) || 0}
                </div>
              </div>
              
              {/* Error Rate */}
              <div className="col-span-2 md:col-span-4 mt-2">
                <div className="flex items-center justify-between bg-gray-50 rounded p-2">
                  <span className="text-gray-600">Error Rate</span>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className={`w-4 h-4 ${
                      errorMetrics.errorRate > 5 ? 'text-red-500' : 'text-green-500'
                    }`} />
                    <span className="font-medium">
                      {errorMetrics.errorRate} errors/min
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Last Error */}
              {errorMetrics.lastError && (
                <div className="col-span-2 md:col-span-4 mt-2 bg-red-50 rounded p-2">
                  <div className="text-sm text-red-600 font-medium mb-1">Last Error</div>
                  <div className="text-xs text-red-700">
                    {errorMetrics.lastError.message}
                  </div>
                  <div className="text-xs text-red-500 mt-1">
                    Agent: {errorMetrics.lastError.agentId} • 
                    {new Date(errorMetrics.lastError.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Performance Indicators */}
      <div className="border-t pt-4 flex items-center justify-around text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <Zap className="w-3 h-3" />
          <span>Real-time Updates</span>
        </div>
        <div className="flex items-center space-x-1">
          <Activity className="w-3 h-3" />
          <span>{Object.keys(agentStates).length} Active Agents</span>
        </div>
        <div className="flex items-center space-x-1">
          <CheckCircle className="w-3 h-3" />
          <span>Auto-Recovery Enabled</span>
        </div>
      </div>
    </div>
  );
};