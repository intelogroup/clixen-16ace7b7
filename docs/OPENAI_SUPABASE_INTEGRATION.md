# OpenAI Supabase Integration

This document describes how the frontend has been modified to get OpenAI keys from Supabase instead of environment variables.

## 🏗️ Architecture Overview

The integration consists of three main components:

1. **OpenAI Configuration Service** (`src/lib/services/OpenAIConfigService.ts`)
2. **React Hooks** (`src/lib/hooks/useOpenAIConfig.ts`)
3. **UI Components** (`src/components/OpenAISettings.tsx`, `src/components/OpenAIKeyExample.tsx`)

## 📋 Database Schema

The integration uses the existing `openai_configurations` table in Supabase:

```sql
openai_configurations {
  id: string
  user_id: string
  config_type: string (e.g., 'personal')
  openai_api_key: string | null
  default_model: string
  max_tokens: number | null
  temperature: number | null
  requests_per_hour: number | null
  requests_per_minute: number | null
  daily_cost_limit_cents: number | null
  created_at: string
  updated_at: string
}
```

## 🔧 Core Service

### OpenAIConfigService

The service provides methods to:

- **Get configuration**: `getOpenAIConfig(userId?)`
- **Get API key**: `getOpenAIKey(userId?)` or `getBestAvailableKey(userId?)`
- **Save configuration**: `saveOpenAIConfig(config, userId?)`
- **Fallback handling**: `getFallbackKey()` for environment variables

#### Key Features:
- **Automatic fallback** to environment variables if no Supabase config exists
- **Caching** for 5 minutes to reduce database calls
- **User isolation** - each user has their own configuration
- **Validation** - checks for valid OpenAI key format

## 🎯 React Hooks

### useOpenAIConfig()

Primary hook for accessing OpenAI configuration:

```tsx
const { 
  config,        // Full OpenAI configuration object
  apiKey,        // Current API key (from Supabase or fallback)
  isLoading,     // Loading state
  error,         // Error message if any
  hasValidKey,   // Boolean - is the key valid?
  refreshConfig, // Function to refresh from Supabase
  updateApiKey,  // Function to update the API key
  isConfigured   // Boolean - is OpenAI configured?
} = useOpenAIConfig();
```

### useOpenAIApiKey()

Simplified hook for just getting the API key:

```tsx
const { apiKey, isLoading, hasValidKey } = useOpenAIApiKey();
```

### useOpenAIStatus()

For components that only need status information:

```tsx
const { 
  isConfigured, 
  hasValidKey, 
  isLoading, 
  isDemoMode 
} = useOpenAIStatus();
```

## 🎨 UI Components

### OpenAISettings

Full configuration interface with:
- API key input with validation
- Model selection (GPT-3.5, GPT-4, etc.)
- Token limits and temperature settings
- Cost controls
- Test connection functionality

```tsx
import { OpenAISettings } from '../components/OpenAISettings';

<OpenAISettings onConfigUpdate={(config) => console.log('Config updated:', config)} />
```

### OpenAIKeyExample

Status display component showing:
- Current configuration status
- Key source (Supabase vs environment)
- Configuration details
- Test functionality

```tsx
import { OpenAIKeyExample } from '../components/OpenAIKeyExample';

<OpenAIKeyExample />
```

## 🔄 Migration from Environment Variables

The system automatically handles migration:

1. **First Load**: If no Supabase config exists, uses environment variable as fallback
2. **User Saves**: When user saves their API key, it's stored in Supabase
3. **Subsequent Loads**: Uses Supabase configuration with environment as fallback
4. **Preference Order**: Supabase → Environment Variable → None

## 🚀 Usage Examples

### Basic Integration

```tsx
import { useOpenAIConfig } from '../lib/hooks/useOpenAIConfig';

function MyComponent() {
  const { apiKey, hasValidKey, isLoading } = useOpenAIConfig();

  if (isLoading) return <div>Loading OpenAI config...</div>;
  
  if (!hasValidKey) {
    return <div>Please configure your OpenAI API key in settings</div>;
  }

  // Use the API key for OpenAI calls
  const makeOpenAICall = async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello!' }]
      })
    });
    return response.json();
  };

  return <button onClick={makeOpenAICall}>Test OpenAI</button>;
}
```

### Settings Page Integration

```tsx
import { OpenAISettings } from '../components/OpenAISettings';

function SettingsPage() {
  return (
    <div>
      <h1>AI Configuration</h1>
      <OpenAISettings 
        onConfigUpdate={(config) => {
          console.log('OpenAI config updated:', config);
          // Optionally trigger app-wide config refresh
        }}
      />
    </div>
  );
}
```

### Status Bar Integration

```tsx
import { useOpenAIStatus } from '../lib/hooks/useOpenAIConfig';

function StatusBar() {
  const { hasValidKey, isDemoMode, isLoading } = useOpenAIStatus();

  return (
    <div className="status-bar">
      <div className={`status-item ${hasValidKey ? 'connected' : 'demo'}`}>
        OpenAI: {isLoading ? 'Loading...' : hasValidKey ? 'Connected' : 'Demo Mode'}
      </div>
    </div>
  );
}
```

## 🔒 Security Considerations

1. **API Key Storage**: Keys are stored in Supabase with user-level RLS policies
2. **Transmission**: All communication uses HTTPS
3. **Validation**: Keys are validated before storage and use
4. **Fallback**: Environment variables provide secure fallback for development
5. **User Isolation**: Each user's configuration is completely isolated

## 🎯 Benefits

1. **User-Specific**: Each user can have their own OpenAI configuration
2. **Persistent**: Configuration survives app restarts and deployments
3. **Flexible**: Supports different models, limits, and settings per user
4. **Secure**: Proper encryption and access controls
5. **Backward Compatible**: Existing environment variable setups continue to work
6. **Self-Service**: Users can manage their own API keys without developer intervention

## 🛠️ Troubleshooting

### No API Key Found
1. Check if user is authenticated
2. Verify Supabase connection
3. Check environment variable fallback
4. Look for console errors in browser dev tools

### Configuration Not Saving
1. Verify user has proper permissions
2. Check Supabase RLS policies
3. Ensure API key format is valid (starts with 'sk-')
4. Check browser network tab for API errors

### Demo Mode Active
1. User hasn't configured an API key yet
2. Stored API key is invalid
3. Supabase connection issues
4. Guide user to OpenAI settings to configure their key

## 📚 Next Steps

To further enhance the integration:

1. **Add key rotation** capabilities
2. **Implement usage tracking** and billing
3. **Add organization-level** configurations
4. **Create admin interface** for key management
5. **Add audit logging** for security compliance
