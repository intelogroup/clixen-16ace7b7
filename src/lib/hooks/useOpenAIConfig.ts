import { useState, useEffect, useCallback } from 'react';
import { openAIConfigService, OpenAIConfig } from '../services/OpenAIConfigService';
import { useAuthContext } from '../AuthContext';

export interface UseOpenAIConfigReturn {
  config: OpenAIConfig | null;
  apiKey: string | null;
  isLoading: boolean;
  error: string | null;
  hasValidKey: boolean;
  refreshConfig: () => Promise<void>;
  updateApiKey: (apiKey: string) => Promise<boolean>;
  isConfigured: boolean;
}

export const useOpenAIConfig = (): UseOpenAIConfigReturn => {
  const { user } = useAuthContext();
  const [config, setConfig] = useState<OpenAIConfig | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    if (!user) {
      setConfig(null);
      setApiKey(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load configuration from Supabase
      const supabaseConfig = await openAIConfigService.getOpenAIConfig(user.id);
      setConfig(supabaseConfig);

      // Get the best available API key (Supabase or fallback)
      const bestKey = await openAIConfigService.getBestAvailableKey(user.id);
      setApiKey(bestKey);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load OpenAI configuration';
      console.error('Error loading OpenAI configuration:', err);
      setError(errorMessage);
      
      // Try fallback key as last resort
      const fallbackKey = openAIConfigService.getFallbackKey();
      setApiKey(fallbackKey);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshConfig = useCallback(async () => {
    // Clear cache and reload
    openAIConfigService.clearCache();
    await loadConfig();
  }, [loadConfig]);

  const updateApiKey = useCallback(async (newApiKey: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);
      
      // Save to Supabase
      const savedConfig = await openAIConfigService.saveOpenAIConfig({
        openai_api_key: newApiKey
      }, user.id);

      if (savedConfig) {
        setConfig(savedConfig);
        setApiKey(newApiKey);
        return true;
      } else {
        setError('Failed to save API key');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update API key';
      console.error('Error updating API key:', err);
      setError(errorMessage);
      return false;
    }
  }, [user]);

  // Load configuration when user changes
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Derived states
  const hasValidKey = !!(apiKey && apiKey.length > 20 && apiKey.startsWith('sk-'));
  const isConfigured = !!config || !!apiKey;

  return {
    config,
    apiKey,
    isLoading,
    error,
    hasValidKey,
    refreshConfig,
    updateApiKey,
    isConfigured
  };
};

// Hook for getting just the API key (simplified version)
export const useOpenAIApiKey = (): { apiKey: string | null; isLoading: boolean; hasValidKey: boolean } => {
  const { apiKey, isLoading, hasValidKey } = useOpenAIConfig();
  return { apiKey, isLoading, hasValidKey };
};

// Hook for components that need to check if OpenAI is configured
export const useOpenAIStatus = (): { 
  isConfigured: boolean; 
  hasValidKey: boolean; 
  isLoading: boolean; 
  isDemoMode: boolean;
} => {
  const { isConfigured, hasValidKey, isLoading } = useOpenAIConfig();
  const isDemoMode = !hasValidKey;
  
  return { 
    isConfigured, 
    hasValidKey, 
    isLoading, 
    isDemoMode 
  };
};
