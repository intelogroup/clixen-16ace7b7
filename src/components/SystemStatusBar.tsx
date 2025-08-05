import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff, Bot, Settings } from 'lucide-react';
import { EnvironmentDebugger } from '../lib/debug/EnvironmentDebugger';
import { useOpenAIStatus } from '../lib/hooks/useOpenAIConfig';

interface SystemStatus {
  openai: 'connected' | 'demo' | 'error';
  supabase: 'connected' | 'error';
  n8n: 'connected' | 'error';
  overall: 'healthy' | 'degraded' | 'error';
}

export function SystemStatusBar() {
  const [status, setStatus] = useState<SystemStatus>({
    openai: 'demo',
    supabase: 'connected',
    n8n: 'connected',
    overall: 'degraded'
  });
  const [showDetails, setShowDetails] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    const debug = EnvironmentDebugger.debugEnvironment();
    setDebugInfo(debug);

    const newStatus: SystemStatus = {
      openai: debug.keyAnalysis.isValid ? 'connected' : 'demo',
      supabase: debug.supabase.url.exists ? 'connected' : 'error',
      n8n: debug.n8n.url.exists ? 'connected' : 'error',
      overall: 'healthy'
    };

    // Determine overall status
    if (newStatus.supabase === 'error' || newStatus.n8n === 'error') {
      newStatus.overall = 'error';
    } else if (newStatus.openai === 'demo') {
      newStatus.overall = 'degraded';
    }

    setStatus(newStatus);
  };

  const getStatusIcon = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'connected':
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'demo':
        return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-400" />;
      default:
        return <XCircle className="w-3 h-3 text-gray-400" />;
    }
  };

  const getOverallStatusColor = () => {
    switch (status.overall) {
      case 'healthy':
        return 'bg-green-500/20 border-green-500/30';
      case 'degraded':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'error':
        return 'bg-red-500/20 border-red-500/30';
      default:
        return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusMessage = () => {
    switch (status.overall) {
      case 'healthy':
        return '✅ All systems operational';
      case 'degraded':
        return '⚠️ Running in demo mode - Limited AI functionality';
      case 'error':
        return '❌ System issues detected';
      default:
        return '⏳ Checking system status...';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs transition-colors ${getOverallStatusColor()} hover:opacity-80`}
      >
        <div className="flex items-center gap-1">
          {getStatusIcon(status.overall)}
          <span className="font-medium">System Status</span>
        </div>
        <Settings className="w-3 h-3 opacity-60" />
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4" />
              <h3 className="text-sm font-semibold">System Status</h3>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(status.openai)}
                  OpenAI AI Service
                </span>
                <span className="text-zinc-400">
                  {status.openai === 'connected' ? 'Active' : 
                   status.openai === 'demo' ? 'Demo Mode' : 'Error'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(status.supabase)}
                  Supabase Database
                </span>
                <span className="text-zinc-400">
                  {status.supabase === 'connected' ? 'Connected' : 'Error'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(status.n8n)}
                  n8n Workflow Engine
                </span>
                <span className="text-zinc-400">
                  {status.n8n === 'connected' ? 'Connected' : 'Error'}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-700">
              <p className="text-xs text-zinc-400 mb-2">Overall Status:</p>
              <p className="text-xs">{getStatusMessage()}</p>
            </div>

            {debugInfo && (
              <div className="mt-3 pt-3 border-t border-zinc-700">
                <p className="text-xs text-zinc-400 mb-1">Environment:</p>
                <p className="text-xs font-mono">{debugInfo.environment.mode}</p>
                
                {status.openai === 'demo' && (
                  <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
                    <strong>Demo Mode Active:</strong> OpenAI API key not configured. 
                    AI responses will be simulated.
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-zinc-700 flex gap-2">
              <button
                onClick={checkSystemStatus}
                className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
              >
                Refresh Status
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
