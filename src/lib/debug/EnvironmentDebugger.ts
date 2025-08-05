// Environment and API key debugging utility
import { env } from '../config/environment';

export class EnvironmentDebugger {
  static debugEnvironment() {
    const results = {
      environment: {
        mode: import.meta.env.MODE,
        dev: import.meta.env.DEV,
        prod: import.meta.env.PROD,
        url: window.location.href,
        origin: window.location.origin
      },
      openaiKeys: {
        vite_key: {
          exists: !!import.meta.env.VITE_OPENAI_API_KEY,
          value: import.meta.env.VITE_OPENAI_API_KEY?.substring(0, 10) + '...',
          isPlaceholder: import.meta.env.VITE_OPENAI_API_KEY === 'your-openai-api-key-here',
          length: import.meta.env.VITE_OPENAI_API_KEY?.length || 0
        },
        window_env: {
          exists: !!(window as any)?.ENV?.VITE_OPENAI_API_KEY,
          value: (window as any)?.ENV?.VITE_OPENAI_API_KEY?.substring(0, 10) + '...',
          length: (window as any)?.ENV?.VITE_OPENAI_API_KEY?.length || 0
        },
        process_env: {
          exists: !!(globalThis as any).process?.env?.OPENAI_API_KEY,
          value: (globalThis as any).process?.env?.OPENAI_API_KEY?.substring(0, 10) + '...',
          length: (globalThis as any).process?.env?.OPENAI_API_KEY?.length || 0
        }
      },
      supabase: {
        url: {
          exists: !!import.meta.env.VITE_SUPABASE_URL,
          value: import.meta.env.VITE_SUPABASE_URL,
          length: import.meta.env.VITE_SUPABASE_URL?.length || 0
        },
        anon_key: {
          exists: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          value: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 10) + '...',
          length: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
        }
      },
      n8n: {
        url: {
          exists: !!import.meta.env.VITE_N8N_API_URL,
          value: import.meta.env.VITE_N8N_API_URL,
          length: import.meta.env.VITE_N8N_API_URL?.length || 0
        },
        api_key: {
          exists: !!import.meta.env.VITE_N8N_API_KEY,
          value: import.meta.env.VITE_N8N_API_KEY?.substring(0, 10) + '...',
          length: import.meta.env.VITE_N8N_API_KEY?.length || 0
        }
      },
      timestamps: {
        debug_run: new Date().toISOString(),
        page_load: performance.timeOrigin
      }
    };

    console.group('🔍 Environment Debug Report');
    console.log('📊 Environment Info:', results.environment);
    console.log('🔑 OpenAI Keys:', results.openaiKeys);
    console.log('🗄️  Supabase Config:', results.supabase);
    console.log('⚡ n8n Config:', results.n8n);
    console.log('⏰ Timestamps:', results.timestamps);
    console.groupEnd();

    // Test OpenAI key validity
    const bestKey = import.meta.env.VITE_OPENAI_API_KEY || 
                   (window as any)?.ENV?.VITE_OPENAI_API_KEY ||
                   (globalThis as any).process?.env?.OPENAI_API_KEY;

    const keyStatus = {
      key: bestKey?.substring(0, 10) + '...',
      isValid: bestKey && bestKey.length > 20 && bestKey.startsWith('sk-'),
      isPlaceholder: bestKey === 'your-openai-api-key-here' || bestKey?.startsWith('your-'),
      shouldUseDemoMode: !bestKey || bestKey.length < 20 || bestKey.startsWith('your-')
    };

    console.group('🤖 OpenAI Key Analysis');
    console.log('Key Status:', keyStatus);
    console.groupEnd();

    return {
      ...results,
      keyAnalysis: keyStatus
    };
  }

  static async testOpenAIConnection() {
    const debugInfo = this.debugEnvironment();
    
    if (debugInfo.keyAnalysis.shouldUseDemoMode) {
      console.warn('🎭 Cannot test OpenAI - running in demo mode');
      return { success: false, reason: 'demo_mode', debugInfo };
    }

    try {
      // Use Supabase Edge Function instead of direct OpenAI to avoid CSP issues
      const { supabase } = await import('../supabase');

      console.log('🧪 Testing OpenAI connection via Supabase Edge Function...');

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('ai-chat-system', {
        body: {
          message: 'Test connection - respond with "OK"',
          agent_type: 'test',
          user_id: user?.id || 'anonymous',
          stream: false
        }
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      const result = data?.response || '';

      console.log('✅ OpenAI connection successful via Edge Function:', {
        response: result,
        tokensUsed: data?.tokens_used || 0,
        processingTime: data?.processing_time
      });

      return {
        success: true,
        response: result,
        usage: { total_tokens: data?.tokens_used || 0 },
        debugInfo
      };

    } catch (error) {
      console.error('❌ OpenAI connection failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        debugInfo 
      };
    }
  }

  static injectDebugConsole() {
    // Add debug functions to window for easy testing
    (window as any).debugEnv = () => this.debugEnvironment();
    (window as any).testOpenAI = () => this.testOpenAIConnection();
    
    console.log('🛠️  Debug utilities injected. Use:');
    console.log('   debugEnv() - Show environment variables');
    console.log('   testOpenAI() - Test OpenAI connection');
  }
}

// Auto-inject in development
if (import.meta.env.DEV) {
  EnvironmentDebugger.injectDebugConsole();
}
