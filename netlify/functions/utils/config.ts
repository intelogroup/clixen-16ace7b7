/**
 * Backend Configuration Helper
 * Provides centralized environment variable access with fallbacks
 */

export interface BackendConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
    jwtSecret?: string;
    databaseUrl?: string;
    accessToken?: string;
  };
  storage: {
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    s3Region?: string;
    s3Endpoint?: string;
  };
  n8n: {
    apiUrl: string;
    apiKey: string;
  };
  openai: {
    apiKey: string;
  };
  netlify: {
    accessToken?: string;
  };
  environment: {
    context: string;
    isDevelopment: boolean;
    isProduction: boolean;
  };
}

/**
 * Get backend configuration with fallbacks to VITE_ prefixed variables
 * This ensures backend functions work even if non-prefixed variables aren't set
 */
export function getBackendConfig(): BackendConfig {
  // Use non-prefixed variables first, fall back to VITE_ prefixed if needed
  const config: BackendConfig = {
    supabase: {
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
      jwtSecret: process.env.SUPABASE_JWT_SECRET,
      databaseUrl: process.env.DATABASE_URL,
      accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    },
    storage: {
      s3AccessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID,
      s3SecretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY,
      s3Region: process.env.SUPABASE_S3_REGION,
      s3Endpoint: process.env.SUPABASE_S3_ENDPOINT,
    },
    n8n: {
      apiUrl: process.env.N8N_API_URL || process.env.VITE_N8N_API_URL || '',
      apiKey: process.env.N8N_API_KEY || process.env.VITE_N8N_API_KEY || '',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '',
    },
    netlify: {
      accessToken: process.env.NETLIFY_ACCESS_TOKEN,
    },
    environment: {
      context: process.env.CONTEXT || process.env.NETLIFY_CONTEXT || 'production',
      isDevelopment: process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true',
      isProduction: process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production',
    },
  };

  return config;
}

/**
 * Validate that all required configuration is present
 */
export function validateConfig(config: BackendConfig): { 
  isValid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];

  // Check Supabase configuration
  if (!config.supabase.url) {
    errors.push('Missing SUPABASE_URL or VITE_SUPABASE_URL');
  }
  if (!config.supabase.anonKey) {
    errors.push('Missing SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY');
  }
  if (!config.supabase.serviceRoleKey) {
    errors.push('Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY');
  }

  // Check n8n configuration
  if (!config.n8n.apiUrl) {
    errors.push('Missing N8N_API_URL or VITE_N8N_API_URL');
  }
  if (!config.n8n.apiKey) {
    errors.push('Missing N8N_API_KEY or VITE_N8N_API_KEY');
  }

  // Check OpenAI configuration
  if (!config.openai.apiKey) {
    errors.push('Missing OPENAI_API_KEY or VITE_OPENAI_API_KEY');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get a safe version of the config for logging (no sensitive data)
 */
export function getSafeConfig(config: BackendConfig): any {
  return {
    supabase: {
      url: config.supabase.url,
      hasAnonKey: !!config.supabase.anonKey,
      hasServiceRoleKey: !!config.supabase.serviceRoleKey,
      hasJwtSecret: !!config.supabase.jwtSecret,
      hasDatabaseUrl: !!config.supabase.databaseUrl,
      hasAccessToken: !!config.supabase.accessToken,
    },
    storage: {
      hasS3Config: !!config.storage.s3AccessKeyId && !!config.storage.s3SecretAccessKey,
      region: config.storage.s3Region,
      endpoint: config.storage.s3Endpoint,
    },
    n8n: {
      apiUrl: config.n8n.apiUrl,
      hasApiKey: !!config.n8n.apiKey,
    },
    openai: {
      hasApiKey: !!config.openai.apiKey,
      keyPrefix: config.openai.apiKey ? config.openai.apiKey.substring(0, 10) + '...' : 'NOT_SET',
    },
    netlify: {
      hasAccessToken: !!config.netlify.accessToken,
    },
    environment: config.environment,
  };
}