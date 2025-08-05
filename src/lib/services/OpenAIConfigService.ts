import { supabase } from '../supabase';

export interface OpenAIConfig {
  id: string;
  user_id: string | null;
  config_type: string;
  openai_api_key: string | null;
  default_model: string;
  max_tokens: number | null;
  temperature: number | null;
  requests_per_hour: number | null;
  requests_per_minute: number | null;
  daily_cost_limit_cents: number | null;
  created_at: string | null;
  updated_at: string | null;
}

class OpenAIConfigService {
  private cachedConfig: OpenAIConfig | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get OpenAI configuration for the current user
   */
  async getOpenAIConfig(userId?: string): Promise<OpenAIConfig | null> {
    try {
      // Check cache first
      if (this.cachedConfig && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION) {
        return this.cachedConfig;
      }

      // Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn('No authenticated user found for OpenAI config');
          return null;
        }
        currentUserId = user.id;
      }

      // Query the openai_configurations table
      const { data, error } = await supabase
        .from('openai_configurations')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('config_type', 'personal') // Default to personal config
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No configuration found - this is normal for new users
          console.log('No OpenAI configuration found for user:', currentUserId);
          return null;
        }
        throw error;
      }

      // Cache the result
      this.cachedConfig = data;
      this.cacheTimestamp = Date.now();

      console.log('✅ OpenAI configuration loaded from Supabase');
      return data;

    } catch (error) {
      console.error('❌ Error fetching OpenAI configuration:', error);
      return null;
    }
  }

  /**
   * Get OpenAI API key for the current user
   */
  async getOpenAIKey(userId?: string): Promise<string | null> {
    const config = await this.getOpenAIConfig(userId);
    return config?.openai_api_key || null;
  }

  /**
   * Create or update OpenAI configuration for a user
   */
  async saveOpenAIConfig(config: Partial<OpenAIConfig>, userId?: string): Promise<OpenAIConfig | null> {
    try {
      // Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('No authenticated user found');
        }
        currentUserId = user.id;
      }

      const configData = {
        user_id: currentUserId,
        config_type: config.config_type || 'personal',
        openai_api_key: config.openai_api_key,
        default_model: config.default_model || 'gpt-3.5-turbo',
        max_tokens: config.max_tokens || 4000,
        temperature: config.temperature || 0.7,
        requests_per_hour: config.requests_per_hour || 100,
        requests_per_minute: config.requests_per_minute || 10,
        daily_cost_limit_cents: config.daily_cost_limit_cents || 1000, // $10 default limit
        updated_at: new Date().toISOString()
      };

      // Upsert the configuration
      const { data, error } = await supabase
        .from('openai_configurations')
        .upsert(configData, {
          onConflict: 'user_id,config_type'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Clear cache to force refresh
      this.cachedConfig = null;
      this.cacheTimestamp = 0;

      console.log('✅ OpenAI configuration saved to Supabase');
      return data;

    } catch (error) {
      console.error('❌ Error saving OpenAI configuration:', error);
      return null;
    }
  }

  /**
   * Get fallback OpenAI key from environment if no Supabase config exists
   */
  getFallbackKey(): string | null {
    const envKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (envKey && envKey !== 'your-openai-api-key-here') {
      return envKey;
    }
    return null;
  }

  /**
   * Get the best available OpenAI key (Supabase first, then environment)
   */
  async getBestAvailableKey(userId?: string): Promise<string | null> {
    // Try Supabase first
    const supabaseKey = await this.getOpenAIKey(userId);
    if (supabaseKey) {
      return supabaseKey;
    }

    // Fall back to environment variable
    return this.getFallbackKey();
  }

  /**
   * Check if user has a valid OpenAI configuration
   */
  async hasValidConfig(userId?: string): Promise<boolean> {
    const key = await this.getBestAvailableKey(userId);
    return !!(key && key.length > 20 && key.startsWith('sk-'));
  }

  /**
   * Clear cached configuration
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.cacheTimestamp = 0;
  }
}

// Export singleton instance
export const openAIConfigService = new OpenAIConfigService();
