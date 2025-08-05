import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../lib/AuthContext';
import { openAIConfigService, OpenAIConfig } from '../lib/services/OpenAIConfigService';
import toast from 'react-hot-toast';

interface OpenAISettingsProps {
  onConfigUpdate?: (config: OpenAIConfig | null) => void;
}

export const OpenAISettings: React.FC<OpenAISettingsProps> = ({ onConfigUpdate }) => {
  const { user } = useAuthContext();
  const [config, setConfig] = useState<OpenAIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    openai_api_key: '',
    default_model: 'gpt-3.5-turbo',
    max_tokens: 4000,
    temperature: 0.7,
    requests_per_hour: 100,
    daily_cost_limit_cents: 1000
  });

  // Load existing configuration
  useEffect(() => {
    loadConfiguration();
  }, [user]);

  const loadConfiguration = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const existingConfig = await openAIConfigService.getOpenAIConfig(user.id);
      
      if (existingConfig) {
        setConfig(existingConfig);
        setFormData({
          openai_api_key: existingConfig.openai_api_key || '',
          default_model: existingConfig.default_model || 'gpt-3.5-turbo',
          max_tokens: existingConfig.max_tokens || 4000,
          temperature: existingConfig.temperature || 0.7,
          requests_per_hour: existingConfig.requests_per_hour || 100,
          daily_cost_limit_cents: existingConfig.daily_cost_limit_cents || 1000
        });
      } else {
        // Check if there's an environment fallback
        const fallbackKey = openAIConfigService.getFallbackKey();
        if (fallbackKey) {
          setFormData(prev => ({ ...prev, openai_api_key: fallbackKey }));
        }
      }
    } catch (error) {
      console.error('Error loading OpenAI configuration:', error);
      toast.error('Failed to load OpenAI configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please log in to save OpenAI configuration');
      return;
    }

    if (!formData.openai_api_key || !formData.openai_api_key.startsWith('sk-')) {
      toast.error('Please enter a valid OpenAI API key (starts with sk-)');
      return;
    }

    try {
      setIsSaving(true);
      
      const savedConfig = await openAIConfigService.saveOpenAIConfig({
        config_type: 'personal',
        openai_api_key: formData.openai_api_key,
        default_model: formData.default_model,
        max_tokens: formData.max_tokens,
        temperature: formData.temperature,
        requests_per_hour: formData.requests_per_hour,
        daily_cost_limit_cents: formData.daily_cost_limit_cents
      }, user.id);

      if (savedConfig) {
        setConfig(savedConfig);
        setIsEditing(false);
        toast.success('OpenAI configuration saved successfully!');
        onConfigUpdate?.(savedConfig);
      } else {
        toast.error('Failed to save OpenAI configuration');
      }
    } catch (error) {
      console.error('Error saving OpenAI configuration:', error);
      toast.error('Failed to save OpenAI configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (config) {
      setFormData({
        openai_api_key: config.openai_api_key || '',
        default_model: config.default_model || 'gpt-3.5-turbo',
        max_tokens: config.max_tokens || 4000,
        temperature: config.temperature || 0.7,
        requests_per_hour: config.requests_per_hour || 100,
        daily_cost_limit_cents: config.daily_cost_limit_cents || 1000
      });
    }
    setIsEditing(false);
  };

  const handleTestConnection = async () => {
    if (!formData.openai_api_key) {
      toast.error('Please enter an OpenAI API key first');
      return;
    }

    try {
      // Test the key by making a simple API call
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${formData.openai_api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('OpenAI API key is valid!');
      } else {
        const error = await response.text();
        toast.error(`Invalid API key: ${response.status} ${error}`);
      }
    } catch (error) {
      console.error('Error testing OpenAI key:', error);
      toast.error('Failed to test OpenAI connection');
    }
  };

  if (!user) {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-400">Please log in to manage OpenAI configuration</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-700 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-zinc-700 rounded w-full mb-4"></div>
          <div className="h-4 bg-zinc-700 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">OpenAI Configuration</h3>
        {config && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${config?.openai_api_key ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm text-zinc-400">
          {config?.openai_api_key ? 'OpenAI API configured' : 'No OpenAI API key configured'}
        </span>
      </div>

      {(isEditing || !config) && (
        <div className="space-y-4 p-4 bg-zinc-800 rounded-lg">
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-zinc-300 mb-2">
              OpenAI API Key
            </label>
            <div className="flex gap-2">
              <input
                id="api-key"
                type="password"
                value={formData.openai_api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, openai_api_key: e.target.value }))}
                placeholder="sk-..."
                className="flex-1 bg-zinc-700 border border-zinc-600 rounded-md px-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleTestConnection}
                className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
              >
                Test
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-zinc-300 mb-2">
                Default Model
              </label>
              <select
                id="model"
                value={formData.default_model}
                onChange={(e) => setFormData(prev => ({ ...prev, default_model: e.target.value }))}
                className="w-full bg-zinc-700 border border-zinc-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
            </div>

            <div>
              <label htmlFor="max-tokens" className="block text-sm font-medium text-zinc-300 mb-2">
                Max Tokens
              </label>
              <input
                id="max-tokens"
                type="number"
                value={formData.max_tokens}
                onChange={(e) => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                className="w-full bg-zinc-700 border border-zinc-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-zinc-300 mb-2">
                Temperature
              </label>
              <input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={formData.temperature}
                onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full bg-zinc-700 border border-zinc-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="cost-limit" className="block text-sm font-medium text-zinc-300 mb-2">
                Daily Cost Limit ($)
              </label>
              <input
                id="cost-limit"
                type="number"
                step="1"
                min="1"
                value={formData.daily_cost_limit_cents / 100}
                onChange={(e) => setFormData(prev => ({ ...prev, daily_cost_limit_cents: Math.round(parseFloat(e.target.value) * 100) }))}
                className="w-full bg-zinc-700 border border-zinc-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-md transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
            {config && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {config && !isEditing && (
        <div className="p-4 bg-zinc-800 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-400">Model:</span>
              <span className="ml-2 text-white">{config.default_model}</span>
            </div>
            <div>
              <span className="text-zinc-400">Max Tokens:</span>
              <span className="ml-2 text-white">{config.max_tokens}</span>
            </div>
            <div>
              <span className="text-zinc-400">Temperature:</span>
              <span className="ml-2 text-white">{config.temperature}</span>
            </div>
            <div>
              <span className="text-zinc-400">Daily Limit:</span>
              <span className="ml-2 text-white">${(config.daily_cost_limit_cents || 0) / 100}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenAISettings;
