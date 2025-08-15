/**
 * Unified Configuration System
 * Single source of truth for all application configuration
 * Consolidates environment variables and settings from multiple files
 */

export interface AppConfig {
  // Application
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    debug: boolean;
    baseUrl: string;
  };

  // Supabase
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };

  // n8n Integration
  n8n: {
    apiUrl: string;
    apiKey: string;
    webhookBaseUrl: string;
    maxWorkflowsPerUser: number;
    executionTimeout: number;
  };

  // OpenAI
  openai: {
    apiKey?: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };

  // Features
  features: {
    mcp: boolean;
    advancedWorkflows: boolean;
    multiProject: boolean;
    collaborativeEditing: boolean;
    analytics: boolean;
  };

  // Limits
  limits: {
    maxProjectsPerUser: number;
    maxWorkflowsPerProject: number;
    maxConversationLength: number;
    maxFileSize: number;
    rateLimitPerMinute: number;
  };

  // Security
  security: {
    jwtSecret?: string;
    encryptionKey?: string;
    allowedOrigins: string[];
    requireHttps: boolean;
  };

  // Monitoring
  monitoring: {
    sentryDsn?: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableTelemetry: boolean;
  };
}

/**
 * Get configuration based on environment
 */
export function getConfig(): AppConfig {
  const env = typeof window !== 'undefined' 
    ? (window as any).process?.env || import.meta.env
    : process.env;

  const isDevelopment = env.NODE_ENV === 'development' || env.DEV;
  const isProduction = env.NODE_ENV === 'production' || env.PROD;

  return {
    app: {
      name: 'Clixen',
      version: '1.0.0',
      environment: isProduction ? 'production' : isDevelopment ? 'development' : 'staging',
      debug: !isProduction,
      baseUrl: env.VITE_APP_URL || env.APP_URL || 'https://clixen.app'
    },

    supabase: {
      url: env.VITE_SUPABASE_URL || env.SUPABASE_URL || 'https://zfbgdixbzezpxllkoyfc.supabase.co',
      anonKey: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw',
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
    },

    n8n: {
      apiUrl: env.VITE_N8N_API_URL || env.N8N_API_URL || 'https://n8nio-n8n-7xzf6n.sliplane.app/api/v1',
      apiKey: env.VITE_N8N_API_KEY || env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0',
      webhookBaseUrl: env.VITE_N8N_WEBHOOK_URL || env.N8N_WEBHOOK_URL || 'https://n8nio-n8n-7xzf6n.sliplane.app/webhook',
      maxWorkflowsPerUser: 50,
      executionTimeout: 300000 // 5 minutes
    },

    openai: {
      apiKey: env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY,
      model: env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
      maxTokens: 1500,
      temperature: 0.7
    },

    features: {
      mcp: env.VITE_ENABLE_MCP === 'true' || env.ENABLE_MCP === 'true' || false,
      advancedWorkflows: true,
      multiProject: true,
      collaborativeEditing: false,
      analytics: true
    },

    limits: {
      maxProjectsPerUser: 10,
      maxWorkflowsPerProject: 50,
      maxConversationLength: 100,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      rateLimitPerMinute: 60
    },

    security: {
      jwtSecret: env.JWT_SECRET,
      encryptionKey: env.ENCRYPTION_KEY,
      allowedOrigins: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://clixen.app',
        'https://*.clixen.app',
        'https://zfbgdixbzezpxllkoyfc.supabase.co'
      ],
      requireHttps: isProduction
    },

    monitoring: {
      sentryDsn: env.VITE_SENTRY_DSN || env.SENTRY_DSN,
      logLevel: isProduction ? 'error' : 'debug',
      enableTelemetry: isProduction
    }
  };
}

/**
 * Singleton config instance
 */
let configInstance: AppConfig | null = null;

export function config(): AppConfig {
  if (!configInstance) {
    configInstance = getConfig();
  }
  return configInstance;
}

/**
 * Reset config (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Validate configuration
 */
export function validateConfig(cfg: AppConfig = config()): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!cfg.supabase.url) errors.push('Supabase URL is required');
  if (!cfg.supabase.anonKey) errors.push('Supabase Anon Key is required');
  if (!cfg.n8n.apiUrl) errors.push('n8n API URL is required');
  if (!cfg.n8n.apiKey) errors.push('n8n API Key is required');

  // URL format validation
  const urlPattern = /^https?:\/\/.+/;
  if (cfg.supabase.url && !urlPattern.test(cfg.supabase.url)) {
    errors.push('Invalid Supabase URL format');
  }
  if (cfg.n8n.apiUrl && !urlPattern.test(cfg.n8n.apiUrl)) {
    errors.push('Invalid n8n API URL format');
  }

  // Limits validation
  if (cfg.limits.maxProjectsPerUser < 1) {
    errors.push('maxProjectsPerUser must be at least 1');
  }
  if (cfg.limits.maxWorkflowsPerProject < 1) {
    errors.push('maxWorkflowsPerProject must be at least 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get a specific config value by path
 */
export function getConfigValue(path: string): any {
  const cfg = config();
  const keys = path.split('.');
  let value: any = cfg;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  return config().features[feature] === true;
}

/**
 * Get environment-specific value
 */
export function getEnvironmentValue<T>(values: {
  development?: T;
  staging?: T;
  production?: T;
}): T | undefined {
  const env = config().app.environment;
  return values[env];
}

/**
 * Export commonly used values
 */
export const SUPABASE_URL = config().supabase.url;
export const SUPABASE_ANON_KEY = config().supabase.anonKey;
export const N8N_API_URL = config().n8n.apiUrl;
export const N8N_API_KEY = config().n8n.apiKey;
export const IS_PRODUCTION = config().app.environment === 'production';
export const IS_DEVELOPMENT = config().app.environment === 'development';
export const DEBUG = config().app.debug;

// Default export
export default config;