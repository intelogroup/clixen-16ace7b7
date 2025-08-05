import React from 'react';
import { useOpenAIConfig } from '../lib/hooks/useOpenAIConfig';
import { Bot, Key, AlertCircle, CheckCircle } from 'lucide-react';

export const OpenAIKeyExample: React.FC = () => {
  const { 
    config, 
    apiKey, 
    isLoading, 
    error, 
    hasValidKey, 
    refreshConfig, 
    updateApiKey,
    isConfigured 
  } = useOpenAIConfig();

  const handleTestApiKey = async () => {
    if (!apiKey) return;
    
    try {
      // Example of using the API key from Supabase
      console.log('Using OpenAI API key from Supabase:', apiKey?.substring(0, 7) + '...');
      
      // In a real application, you would make the actual OpenAI API call here
      // For example: callOpenAI(apiKey, prompt)
      
    } catch (error) {
      console.error('Error using OpenAI API:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-zinc-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-400 animate-pulse" />
          <span className="text-white">Loading OpenAI configuration...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">Error: {error}</span>
        </div>
        <button 
          onClick={refreshConfig}
          className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-800 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Bot className="w-5 h-5 text-blue-400" />
        OpenAI Configuration Status
      </h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {hasValidKey ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-yellow-400" />
          )}
          <span className="text-sm text-zinc-300">
            API Key: {hasValidKey ? 'Valid' : 'Not configured'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-zinc-400" />
          <span className="text-sm text-zinc-300">
            Source: {config ? 'Supabase Database' : 'Environment Variable'}
          </span>
        </div>

        {config && (
          <div className="text-sm text-zinc-400 space-y-1">
            <div>Model: {config.default_model}</div>
            <div>Max Tokens: {config.max_tokens}</div>
            <div>Temperature: {config.temperature}</div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button 
          onClick={handleTestApiKey}
          disabled={!hasValidKey}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 disabled:text-zinc-400 text-white rounded transition-colors"
        >
          Test API Key
        </button>
        
        <button 
          onClick={refreshConfig}
          className="px-3 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded transition-colors"
        >
          Refresh Config
        </button>
      </div>

      {!isConfigured && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
          <p className="text-yellow-400 text-sm">
            No OpenAI configuration found. Please set up your API key in the settings.
          </p>
        </div>
      )}
    </div>
  );
};

export default OpenAIKeyExample;
