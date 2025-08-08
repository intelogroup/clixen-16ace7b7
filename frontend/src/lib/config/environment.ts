/**
 * Centralized environment configuration service
 * This ensures consistent access to environment variables across the application
 */

interface EnvironmentConfig {
  // App configuration
  isDevelopment: boolean;
  isProduction: boolean;
  appUrl: string;

  // Supabase configuration
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
    jwtSecret?: string;
  };

  // OpenAI configuration
  openai: {
    apiKey?: string;
  };

  // n8n configuration
  n8n: {
    apiUrl: string;
    apiKey: string;
  };

  // Database configuration
  database: {
    url?: string;
    pooledUrl?: string;
    transactionPooledUrl?: string;
  };

  // External services
  external: {
    githubToken?: string;
    dockerHubToken?: string;
    netliftyToken?: string;
    supabaseAccessToken?: string;
  };
}

class EnvironmentService {
  private static instance: EnvironmentService;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  public static getInstance(): EnvironmentService {
    if (!EnvironmentService.instance) {
      EnvironmentService.instance = new EnvironmentService();
    }
    return EnvironmentService.instance;
  }

  private loadConfiguration(): EnvironmentConfig {
    const env = import.meta.env;

    return {
      // App configuration
      isDevelopment: env.DEV === true,
      isProduction: env.PROD === true,
      appUrl: env.VITE_APP_URL || window?.location?.origin || 'http://localhost:3000',

      // Supabase configuration
      supabase: {
        url: env.VITE_SUPABASE_URL || 'https://zfbgdixbzezpxllkoyfc.supabase.co',
        anonKey: env.VITE_SUPABASE_ANON_KEY || '',
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
        jwtSecret: env.SUPABASE_JWT_SECRET,
      },

      // OpenAI configuration
      openai: {
        apiKey: env.VITE_OPENAI_API_KEY,
      },

      // n8n configuration
      n8n: {
        apiUrl: env.VITE_N8N_API_URL || 'http://localhost:5678/api/v1',
        apiKey: env.VITE_N8N_API_KEY || '',
      },

      // Database configuration
      database: {
        url: env.DATABASE_URL,
        pooledUrl: env.DATABASE_URL_POOLED,
        transactionPooledUrl: env.DATABASE_URL_TRANSACTION_POOLED,
      },

      // External services
      external: {
        githubToken: env.MCP_GITHUB_TOKEN,
        dockerHubToken: env.MCP_DOCKER_HUB_TOKEN,
        netliftyToken: env.NETLIFY_PERSONAL_ACCESS_TOKEN,
        supabaseAccessToken: env.SUPABASE_ACCESS_TOKEN,
      },
    };
  }

  private validateConfiguration(): void {
    const errors: string[] = [];

    // Required configuration checks
    if (!this.config.supabase.url) {
      errors.push('VITE_SUPABASE_URL is required');
    }

    if (!this.config.supabase.anonKey) {
      errors.push('VITE_SUPABASE_ANON_KEY is required');
    }

    if (!this.config.n8n.apiUrl) {
      errors.push('VITE_N8N_API_URL is required');
    }

    if (!this.config.n8n.apiKey) {
      console.warn('VITE_N8N_API_KEY is not set - n8n integration may not work');
    }

    if (!this.config.openai.apiKey || this.config.openai.apiKey === 'your-openai-api-key-here' || this.config.openai.apiKey.includes('placeholder')) {
      console.warn('VITE_OPENAI_API_KEY is not properly configured - AI features will be limited');
    }

    if (errors.length > 0) {
      console.error('Environment configuration errors:', errors);
      if (this.config.isProduction) {
        throw new Error(`Missing required environment variables: ${errors.join(', ')}`);
      }
    }
  }

  // Getter methods for accessing configuration
  public get(): Readonly<EnvironmentConfig> {
    return this.config;
  }

  public getSupabaseConfig() {
    return this.config.supabase;
  }

  public getOpenAIConfig() {
    return this.config.openai;
  }

  public getN8nConfig() {
    return this.config.n8n;
  }

  public getDatabaseConfig() {
    return this.config.database;
  }

  public getExternalConfig() {
    return this.config.external;
  }

  // Utility methods
  public isFeatureEnabled(feature: string): boolean {
    switch (feature) {
      case 'openai':
        return !!(this.config.openai.apiKey && 
                 this.config.openai.apiKey !== 'your-openai-api-key-here');
      case 'n8n':
        return !!(this.config.n8n.apiUrl && this.config.n8n.apiKey);
      case 'supabase':
        return !!(this.config.supabase.url && this.config.supabase.anonKey);
      default:
        return false;
    }
  }

  public getRequiredEnvVar(key: keyof EnvironmentConfig | string): string {
    const value = this.getEnvVar(key);
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  public getEnvVar(key: keyof EnvironmentConfig | string): string | undefined {
    // Handle nested access
    if (key.includes('.')) {
      const [section, property] = key.split('.');
      const sectionConfig = (this.config as any)[section];
      return sectionConfig?.[property];
    }

    return (this.config as any)[key];
  }

  // Debug information
  public getDebugInfo() {
    return {
      environment: this.config.isDevelopment ? 'development' : 'production',
      supabaseConnected: this.isFeatureEnabled('supabase'),
      openaiEnabled: this.isFeatureEnabled('openai'),
      n8nEnabled: this.isFeatureEnabled('n8n'),
      configKeys: Object.keys(this.config),
    };
  }
}

// Export singleton instance
export const env = EnvironmentService.getInstance();

// Export types for usage elsewhere
export type { EnvironmentConfig };

// Convenience exports
export const supabaseConfig = env.getSupabaseConfig();
export const openaiConfig = env.getOpenAIConfig();
export const n8nConfig = env.getN8nConfig();
export const databaseConfig = env.getDatabaseConfig();
export const externalConfig = env.getExternalConfig();

// Feature flags
export const features = {
  openai: env.isFeatureEnabled('openai'),
  n8n: env.isFeatureEnabled('n8n'),
  supabase: env.isFeatureEnabled('supabase'),
};

export default env;