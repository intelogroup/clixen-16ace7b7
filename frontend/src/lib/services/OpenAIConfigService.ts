/**
 * OpenAI Configuration Service - Simple MVP Implementation
 * Handles OpenAI API key management from environment variables and Supabase
 */

import { supabase } from '../supabase';

class OpenAIConfigService {
  private cachedKey: string | null = null;
  private keyTimestamp: number = 0;
  private readonly KEY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the best available OpenAI API key
   * Priority: Environment variable first (for MVP simplicity)
   */
  async getBestAvailableKey(): Promise<string | null> {
    try {
      // Check cache first
      if (this.cachedKey && (Date.now() - this.keyTimestamp) < this.KEY_CACHE_DURATION) {
        return this.cachedKey;
      }

      // For MVP: prioritize environment variables (simpler setup)
      const envKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (envKey && 
          envKey !== 'your-openai-api-key-here' && 
          envKey.startsWith('sk-') && 
          envKey.length > 30) {
        this.cachedKey = envKey;
        this.keyTimestamp = Date.now();
        return envKey;
      }

      // Fallback: try to get from Supabase configuration if available
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('api_configurations')
            .select('api_key')
            .eq('user_id', user.id)
            .eq('service', 'openai')
            .eq('is_active', true)
            .single();

          if (!error && data?.api_key) {
            this.cachedKey = data.api_key;
            this.keyTimestamp = Date.now();
            return data.api_key;
          }
        }
      } catch (dbError) {
        console.log('[OpenAIConfigService] Supabase config not available, using environment only');
      }

      return null;
    } catch (error) {
      console.error('[OpenAIConfigService] Error getting API key:', error);
      return null;
    }
  }

  /**
   * Clear cached key
   */
  clearCache(): void {
    this.cachedKey = null;
    this.keyTimestamp = 0;
  }
}

// Export singleton instance
export const openAIConfigService = new OpenAIConfigService();