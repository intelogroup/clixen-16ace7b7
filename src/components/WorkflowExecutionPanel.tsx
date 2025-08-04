/**
 * Workflow Execution Panel Component
 * Shows how to use the Netlify API client in React
 */

import React, { useState, useEffect } from 'react';
import { supabaseAPI } from '../lib/api/supabase-edge-client';
import { supabase } from '../lib/supabase';

interface ExecutionStatus {
  id: string;
  status: 'queued' | 'running' | 'success' | 'error';
  workflow_id: string;
  execution_time_ms?: number;
  output_data?: any;
  error_message?: string;
}

interface UsageStats {
  tier: string;
  usage: {
    executions: { used: number; limit: number; percentage: number };
    aiTokens: { used: number; limit: number; percentage: number };
    storage: { used: number; limit: number; percentage: number };
  };
  cost: {
    totalCost: number;
    baseCost: number;
    executionCost: number;
    aiCost: number;
  };
}

export const WorkflowExecutionPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [userRequest, setUserRequest] = useState('');
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [executions, setExecutions] = useState<ExecutionStatus[]>([]);

  // Load initial data
  useEffect(() => {
    loadUsageStats();
    loadExecutionHistory();
    subscribeToUpdates();
  }, []);

  // Load usage statistics
  const loadUsageStats = async () => {
    try {
      const stats = await supabaseAPI.getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  };

  // Load execution history
  const loadExecutionHistory = async () => {
    try {
      const history = await supabaseAPI.getUserExecutions();
      setExecutions(history);
    } catch (error) {
      console.error('Failed to load execution history:', error);
    }
  };

  // Subscribe to real-time updates
  const subscribeToUpdates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Subscribe to execution updates
    supabaseAPI.subscribeToExecutions(user.id, (payload) => {
      console.log('Execution update:', payload);
      loadExecutionHistory();
    });

    // Subscribe to notifications
    supabaseAPI.subscribeToNotifications(user.id, (payload) => {
      console.log('New notification:', payload);
      // Show notification to user
    });
  };

  // Generate and execute workflow
  const handleGenerateWorkflow = async () => {
    if (!userRequest.trim()) return;

    setLoading(true);
    try {
      // 1. Generate workflow with AI
      const workflow = await supabaseAPI.generateWorkflow(userRequest, 'balanced');
      console.log('Generated workflow:', workflow);

      // 2. Execute the workflow
      const execution = await supabaseAPI.executeWorkflow(workflow.id, {
        userInput: userRequest,
      });

      setExecutionStatus({
        id: execution.executionId,
        status: 'queued',
        workflow_id: workflow.id,
      });

      // 3. Poll for status updates
      const finalStatus = await supabaseAPI.pollExecutionStatus(
        execution.executionId,
        (status) => {
          setExecutionStatus(status);
        }
      );

      setExecutionStatus(finalStatus);
      
      // 4. Refresh usage stats
      await loadUsageStats();
      await loadExecutionHistory();

    } catch (error: any) {
      console.error('Workflow generation failed:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Usage Stats */}
      {usageStats && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-4">Usage Statistics ({usageStats.tier})</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Executions</div>
              <div className="text-lg font-semibold">
                {usageStats.usage.executions.used} / {usageStats.usage.executions.limit}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${usageStats.usage.executions.percentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600">AI Tokens</div>
              <div className="text-lg font-semibold">
                {usageStats.usage.aiTokens.used} / {usageStats.usage.aiTokens.limit}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${usageStats.usage.aiTokens.percentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Monthly Cost</div>
              <div className="text-lg font-semibold">
                ${(usageStats.cost.totalCost / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Generator */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Generate Workflow</h2>
        
        <textarea
          className="w-full p-3 border rounded-lg mb-4"
          rows={4}
          placeholder="Describe what you want to automate..."
          value={userRequest}
          onChange={(e) => setUserRequest(e.target.value)}
          disabled={loading}
        />

        <button
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          onClick={handleGenerateWorkflow}
          disabled={loading || !userRequest.trim()}
        >
          {loading ? 'Processing...' : 'Generate & Execute'}
        </button>

        {/* Current Execution Status */}
        {executionStatus && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Execution {executionStatus.id.slice(0, 8)}</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                executionStatus.status === 'success' ? 'bg-green-100 text-green-800' :
                executionStatus.status === 'error' ? 'bg-red-100 text-red-800' :
                executionStatus.status === 'running' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {executionStatus.status}
              </span>
            </div>
            
            {executionStatus.execution_time_ms && (
              <div className="text-sm text-gray-600 mt-2">
                Execution time: {executionStatus.execution_time_ms}ms
              </div>
            )}
            
            {executionStatus.error_message && (
              <div className="text-sm text-red-600 mt-2">
                Error: {executionStatus.error_message}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Execution History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recent Executions</h2>
        
        <div className="space-y-3">
          {executions.map((exec) => (
            <div key={exec.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">Workflow {exec.workflow_id.slice(0, 8)}</div>
                <div className="text-sm text-gray-600">
                  {new Date(exec.created_at).toLocaleString()}
                </div>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-sm ${
                exec.status === 'success' ? 'bg-green-100 text-green-800' :
                exec.status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {exec.status}
              </span>
            </div>
          ))}
          
          {executions.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No executions yet. Generate your first workflow above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};