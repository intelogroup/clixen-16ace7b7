import React, { useState, useEffect } from 'react';
import { n8nApi } from '../lib/n8n';

export default function DebugStatus() {
  const [status, setStatus] = useState<{
    environment: string;
    isProduction: boolean;
    n8nUrl: string;
    connectionTest: any;
    lastError: string | null;
  }>({
    environment: 'unknown',
    isProduction: false,
    n8nUrl: '',
    connectionTest: null,
    lastError: null
  });

  useEffect(() => {
    const checkStatus = async () => {
      const isProduction = typeof window !== 'undefined' && 
        !window.location?.hostname?.includes('localhost') && 
        !window.location?.hostname?.includes('127.0.0.1');

      const n8nUrl = import.meta.env.VITE_N8N_API_URL || 'Not set';
      
      try {
        console.log('Testing N8N connection from DebugStatus...');
        const connectionTest = await n8nApi.testConnection();
        console.log('Connection test result:', connectionTest);
        
        setStatus({
          environment: typeof window !== 'undefined' ? 'browser' : 'server',
          isProduction,
          n8nUrl,
          connectionTest,
          lastError: null
        });
      } catch (error) {
        console.error('Connection test failed:', error);
        setStatus(prev => ({
          ...prev,
          environment: typeof window !== 'undefined' ? 'browser' : 'server',
          isProduction,
          n8nUrl,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };

    checkStatus();
    
    // Set up interval to check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 max-w-md text-sm z-50">
      <h3 className="font-semibold text-white mb-2">Debug Status</h3>
      
      <div className="space-y-2 text-zinc-300">
        <div>
          <span className="text-zinc-400">Environment:</span> {status.environment}
        </div>
        <div>
          <span className="text-zinc-400">Production:</span>{' '}
          <span className={status.isProduction ? 'text-yellow-400' : 'text-green-400'}>
            {status.isProduction ? 'Yes' : 'No'}
          </span>
        </div>
        <div>
          <span className="text-zinc-400">N8N URL:</span> {status.n8nUrl}
        </div>
        
        {status.connectionTest && (
          <div>
            <span className="text-zinc-400">Connection:</span>{' '}
            <span className={status.connectionTest.success ? 'text-green-400' : 'text-red-400'}>
              {status.connectionTest.success ? 'OK' : 'Failed'}
            </span>
            <div className="text-xs text-zinc-500 mt-1">
              {status.connectionTest.message}
            </div>
          </div>
        )}
        
        {status.lastError && (
          <div>
            <span className="text-red-400">Last Error:</span>
            <div className="text-xs text-red-300 mt-1 break-words">
              {status.lastError}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-2 border-t border-zinc-700">
        <div className="text-xs text-zinc-500">
          URL: {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}
        </div>
      </div>
    </div>
  );
}
