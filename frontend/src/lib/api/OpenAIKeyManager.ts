import { supabase } from '../supabase';
import { ErrorLogger } from '../logger/ErrorLogger';

export class OpenAIKeyManager {
  private static cachedKey: string | null = null;
  private static cacheExpiry: number = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async getAPIKey(): Promise<string | null> {
    try {
      // Check cache first
      if (this.cachedKey && Date.now() < this.cacheExpiry) {
        ErrorLogger.logInfo('Using cached OpenAI API key');
        return this.cachedKey;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        ErrorLogger.logError('Failed to get user for API key retrieval', { error: userError });
        return null;
      }

      // Get API key from database
      const { data, error } = await supabase
        .from('api_keys')
        .select('openai_api_key')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No API key found for user
          ErrorLogger.logInfo('No API key found for user', { userId: user.id });
          return null;
        }
        ErrorLogger.logError('Failed to retrieve API key', { error });
        return null;
      }

      if (data?.openai_api_key) {
        // Cache the key
        this.cachedKey = data.openai_api_key;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        ErrorLogger.logInfo('Retrieved OpenAI API key from database');
        return data.openai_api_key;
      }

      return null;
    } catch (error) {
      ErrorLogger.logError('Error in getAPIKey', { error });
      return null;
    }
  }

  static async setAPIKey(apiKey: string): Promise<boolean> {
    try {
      // Validate API key format
      if (!apiKey || !apiKey.startsWith('sk-') || apiKey.length < 20) {
        ErrorLogger.logError('Invalid API key format');
        return false;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        ErrorLogger.logError('Failed to get user for API key storage', { error: userError });
        return false;
      }

      // Store API key in database
      const { error } = await supabase
        .from('api_keys')
        .upsert({
          user_id: user.id,
          openai_api_key: apiKey,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        ErrorLogger.logError('Failed to store API key', { error });
        return false;
      }

      // Clear cache to force refresh
      this.clearCache();
      ErrorLogger.logInfo('Successfully stored OpenAI API key');
      return true;
    } catch (error) {
      ErrorLogger.logError('Error in setAPIKey', { error });
      return false;
    }
  }

  static async removeAPIKey(): Promise<boolean> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        ErrorLogger.logError('Failed to get user for API key removal', { error: userError });
        return false;
      }

      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        ErrorLogger.logError('Failed to remove API key', { error });
        return false;
      }

      this.clearCache();
      ErrorLogger.logInfo('Successfully removed OpenAI API key');
      return true;
    } catch (error) {
      ErrorLogger.logError('Error in removeAPIKey', { error });
      return false;
    }
  }

  static clearCache() {
    this.cachedKey = null;
    this.cacheExpiry = 0;
  }

  static async validateAPIKey(apiKey: string): Promise<boolean> {
    try {
      // Test the API key with a minimal request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      return response.ok;
    } catch (error) {
      ErrorLogger.logError('Failed to validate API key', { error });
      return false;
    }
  }
}