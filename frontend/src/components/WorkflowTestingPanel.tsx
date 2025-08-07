/**
 * Workflow Testing Panel - Real-time n8n workflow validation and healing
 * 
 * This component provides a comprehensive interface for testing workflows
 * against the n8n engine and applying automatic healing when errors are found.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { workflowHealer, WorkflowError, HealingResult } from '../lib/healing/N8nWorkflowHealer';
import { n8nApi } from '../lib/n8n';

interface WorkflowTestingPanelProps {
  workflow?: any;
  onWorkflowHealed?: (healedWorkflow: any) => void;
  onTestComplete?: (result: HealingResult) => void;
  className?: string;
}

export const WorkflowTestingPanel: React.FC<WorkflowTestingPanelProps> = ({
  workflow,
  onWorkflowHealed,
  onTestComplete,
  className = ''
}) => {
  const [isTestingWorkflow, setIsTestingWorkflow] = useState(false);
  const [testResult, setTestResult] = useState<HealingResult | null>(null);
  const [n8nConnection, setN8nConnection] = useState<{ connected: boolean; message: string } | null>(null);
  const [testingStage, setTestingStage] = useState<string>('');

  // Test n8n connection on mount
  useEffect(() => {
    testN8nConnection();
  }, []);

  const testN8nConnection = async () => {
    try {
      const result = await n8nApi.testConnection();
      setN8nConnection({ connected: result.success, message: result.message });
    } catch (error) {
      setN8nConnection({ 
        connected: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      });
    }
  };

  const testWorkflow = useCallback(async () => {
    if (!workflow) return;

    setIsTestingWorkflow(true);
    setTestResult(null);
    setTestingStage('Initializing test...');

    try {
      setTestingStage('Validating workflow structure...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Visual delay

      setTestingStage('Testing against n8n engine...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setTestingStage('Analyzing errors...');
      const result = await workflowHealer.healWorkflow(workflow, { 
        userId: 'current-user', // TODO: Get from auth context
        sessionId: 'current-session'
      });

      setTestingStage('Applying automatic fixes...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setTestResult(result);
      onTestComplete?.(result);

      if (result.healedWorkflow && result.success) {
        onWorkflowHealed?.(result.healedWorkflow);
      }

      setTestingStage('Test complete');
    } catch (error) {
      setTestResult({
        success: false,
        originalWorkflow: workflow,
        errors: [{
          id: 'testing-error',
          type: 'validation',
          severity: 'critical',
          message: error instanceof Error ? error.message : 'Testing failed',
          suggestions: ['Try again', 'Check workflow structure'],
          autoFixable: false
        }],
        fixes: [],
        needsManualReview: true
      });
    } finally {
      setIsTestingWorkflow(false);
      setTestingStage('');
    }
  }, [workflow, onWorkflowHealed, onTestComplete]);

  const getSeverityColor = (severity: WorkflowError['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-50';
      case 'high': return 'text-orange-500 bg-orange-50';
      case 'medium': return 'text-yellow-500 bg-yellow-50';
      case 'low': return 'text-blue-500 bg-blue-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getTypeIcon = (type: WorkflowError['type']) => {
    switch (type) {
      case 'validation': return '🔍';
      case 'node': return '⚙️';
      case 'connection': return '🔗';
      case 'execution': return '▶️';
      case 'syntax': return '📝';
      default: return '❓';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Workflow Testing</h3>
            <p className="text-sm text-gray-600">Validate and heal n8n workflows automatically</p>
          </div>
          <div className="flex items-center gap-2">
            {/* n8n Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                n8nConnection?.connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-gray-600">
                {n8nConnection?.connected ? 'n8n Connected' : 'n8n Disconnected'}
              </span>
            </div>
            
            <button
              onClick={testWorkflow}
              disabled={!workflow || isTestingWorkflow || !n8nConnection?.connected}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isTestingWorkflow ? '🔄 Testing...' : '🧪 Test Workflow'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Connection Status */}
        {!n8nConnection?.connected && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <span className="text-red-500">❌</span>
              <span className="text-red-700 font-medium">n8n Connection Failed</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{n8nConnection?.message}</p>
            <button
              onClick={testN8nConnection}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Testing Progress */}
        {isTestingWorkflow && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-blue-700 font-medium">Testing in Progress</span>
            </div>
            <p className="text-blue-600 text-sm mt-1">{testingStage}</p>
          </div>
        )}

        {/* Test Results */}
        {testResult && (
          <div className="space-y-4">
            {/* Summary */}
            <div className={`p-4 rounded-md border ${
              testResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className={testResult.success ? 'text-green-500' : 'text-red-500'}>
                  {testResult.success ? '✅' : '❌'}
                </span>
                <span className={`font-medium ${
                  testResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {testResult.success ? 'Workflow Validated Successfully' : 'Workflow Has Issues'}
                </span>
              </div>
              
              <div className="mt-2 text-sm space-y-1">
                <p className={testResult.success ? 'text-green-600' : 'text-red-600'}>
                  Found {testResult.errors.length} issues, applied {testResult.fixes.length} automatic fixes
                </p>
                {testResult.needsManualReview && (
                  <p className="text-orange-600">⚠️ Manual review recommended for remaining issues</p>
                )}
              </div>
            </div>

            {/* Applied Fixes */}
            {testResult.fixes.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-medium text-green-800 mb-2">🔧 Automatic Fixes Applied</h4>
                <ul className="space-y-1">
                  {testResult.fixes.map((fix, index) => (
                    <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {fix}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Remaining Errors */}
            {testResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800">🔍 Issues Found</h4>
                {testResult.errors.map((error, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md border ${getSeverityColor(error.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getTypeIcon(error.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{error.message}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            error.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {error.severity}
                          </span>
                        </div>
                        
                        {error.nodeId && (
                          <p className="text-xs mt-1 opacity-75">
                            Node: {error.nodeId} {error.nodeType && `(${error.nodeType})`}
                          </p>
                        )}
                        
                        {error.suggestions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium opacity-75">Suggestions:</p>
                            <ul className="text-xs mt-1 space-y-1">
                              {error.suggestions.map((suggestion, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span>•</span>
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      {error.autoFixable && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Auto-fixable
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No Workflow */}
        {!workflow && (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl">🔧</span>
            <p className="mt-2">No workflow to test</p>
            <p className="text-sm">Create or select a workflow to begin testing</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowTestingPanel;
