/**
 * useApi Hook
 * Provides a clean interface to the unified API service
 * Consolidates API calls with built-in error handling and loading states
 */

import { useState, useCallback, useEffect } from 'react';
import { apiService, ApiResponse } from '../services/unifiedApiService';
import { errorHandler } from '../services/errorHandler';

export interface UseApiState<T = any> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface UseApiActions {
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}

/**
 * Generic API hook for any API call
 */
export function useApi<T = any>(
  apiCall: (...args: any[]) => Promise<ApiResponse<T>>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
    autoExecute?: boolean;
    dependencies?: any[];
  }
): UseApiState<T> & UseApiActions {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    loading: false
  });

  const execute = useCallback(async (...args: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiCall(...args);

      if (response.error) {
        throw new Error(response.error);
      }

      setState({
        data: response.data || null,
        error: null,
        loading: false
      });

      options?.onSuccess?.(response.data!);
    } catch (error) {
      const errorMessage = errorHandler.handleApiError(error);
      
      setState({
        data: null,
        error: errorMessage,
        loading: false
      });

      options?.onError?.(errorMessage);
    }
  }, [apiCall, options]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      loading: false
    });
  }, []);

  useEffect(() => {
    if (options?.autoExecute) {
      execute();
    }
  }, options?.dependencies || []);

  return { ...state, execute, reset };
}

/**
 * Authentication hooks
 */
export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data } = await apiService.getCurrentUser();
    setUser(data);
    setLoading(false);
  };

  const signIn = useApi(apiService.signIn.bind(apiService), {
    onSuccess: () => checkAuth()
  });

  const signUp = useApi(apiService.signUp.bind(apiService), {
    onSuccess: () => checkAuth()
  });

  const signOut = useApi(apiService.signOut.bind(apiService), {
    onSuccess: () => setUser(null)
  });

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    checkAuth
  };
}

/**
 * Chat hook
 */
export function useChat(projectId?: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationId] = useState(crypto.randomUUID());

  const sendMessage = useApi(
    (message: string) => apiService.sendChatMessage(message, conversationId, projectId),
    {
      onSuccess: (response) => {
        if (response) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: response.response || response.message || 'Response received',
            timestamp: new Date().toISOString()
          }]);
        }
      }
    }
  );

  const addUserMessage = (message: string) => {
    setMessages(prev => [...prev, {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }]);
  };

  return {
    messages,
    sendMessage: async (message: string) => {
      addUserMessage(message);
      await sendMessage.execute(message);
    },
    loading: sendMessage.loading,
    error: sendMessage.error,
    conversationId
  };
}

/**
 * Projects hook
 */
export function useProjects() {
  const getProjects = useApi(apiService.getProjects.bind(apiService), {
    autoExecute: true
  });

  const createProject = useApi(apiService.createProject.bind(apiService), {
    onSuccess: () => getProjects.execute()
  });

  const updateProject = useApi(apiService.updateProject.bind(apiService), {
    onSuccess: () => getProjects.execute()
  });

  const deleteProject = useApi(apiService.deleteProject.bind(apiService), {
    onSuccess: () => getProjects.execute()
  });

  return {
    projects: getProjects.data || [],
    loading: getProjects.loading,
    error: getProjects.error,
    createProject: createProject.execute,
    updateProject: updateProject.execute,
    deleteProject: deleteProject.execute,
    refresh: getProjects.execute
  };
}

/**
 * Workflows hook
 */
export function useWorkflows(projectId?: string) {
  const getWorkflows = useApi(
    () => apiService.getWorkflows(projectId),
    {
      autoExecute: true,
      dependencies: [projectId]
    }
  );

  const createWorkflow = useApi(apiService.createWorkflow.bind(apiService), {
    onSuccess: () => {
      getWorkflows.execute();
      errorHandler.showSuccess('Workflow created successfully');
    }
  });

  const deployWorkflow = useApi(apiService.deployWorkflow.bind(apiService), {
    onSuccess: () => {
      getWorkflows.execute();
      errorHandler.showSuccess('Workflow deployed successfully');
    }
  });

  const deleteWorkflow = useApi(apiService.deleteWorkflow.bind(apiService), {
    onSuccess: () => {
      getWorkflows.execute();
      errorHandler.showSuccess('Workflow deleted');
    }
  });

  return {
    workflows: getWorkflows.data || [],
    loading: getWorkflows.loading,
    error: getWorkflows.error,
    createWorkflow: createWorkflow.execute,
    deployWorkflow: deployWorkflow.execute,
    deleteWorkflow: deleteWorkflow.execute,
    refresh: getWorkflows.execute
  };
}

/**
 * Conversations hook
 */
export function useConversations(projectId?: string) {
  const getConversations = useApi(
    () => apiService.getConversations(projectId),
    {
      autoExecute: true,
      dependencies: [projectId]
    }
  );

  const saveConversation = useApi(apiService.saveConversation.bind(apiService), {
    onSuccess: () => getConversations.execute()
  });

  return {
    conversations: getConversations.data || [],
    loading: getConversations.loading,
    error: getConversations.error,
    saveConversation: saveConversation.execute,
    refresh: getConversations.execute
  };
}

/**
 * User profile hook
 */
export function useUserProfile() {
  const getProfile = useApi(apiService.getUserProfile.bind(apiService), {
    autoExecute: true
  });

  const updateProfile = useApi(apiService.updateUserProfile.bind(apiService), {
    onSuccess: () => {
      getProfile.execute();
      errorHandler.showSuccess('Profile updated successfully');
    }
  });

  return {
    profile: getProfile.data,
    loading: getProfile.loading,
    error: getProfile.error,
    updateProfile: updateProfile.execute,
    refresh: getProfile.execute
  };
}

/**
 * n8n Integration hook
 */
export function useN8n() {
  const getWorkflows = useApi(apiService.getN8nWorkflows.bind(apiService));
  const executeWorkflow = useApi(apiService.executeN8nWorkflow.bind(apiService), {
    onSuccess: () => errorHandler.showSuccess('Workflow executed successfully')
  });

  return {
    workflows: getWorkflows.data,
    loading: getWorkflows.loading || executeWorkflow.loading,
    error: getWorkflows.error || executeWorkflow.error,
    getWorkflows: getWorkflows.execute,
    executeWorkflow: executeWorkflow.execute
  };
}