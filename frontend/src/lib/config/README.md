# Environment Configuration

This directory contains the centralized environment configuration for the Clixen application.

## Usage

### Basic Usage

```typescript
import { env, supabaseConfig, openaiConfig, n8nConfig } from './config/environment';

// Access configuration objects
const supabase = supabaseConfig;
const openai = openaiConfig;

// Check if features are enabled
if (env.isFeatureEnabled('openai')) {
  // OpenAI features are available
}

// Get debug information
console.log(env.getDebugInfo());
```

### Migrating from Direct Environment Access

**Before:**
```typescript
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
```

**After:**
```typescript
import { openaiConfig, supabaseConfig } from './config/environment';

const apiKey = openaiConfig.apiKey;
const supabaseUrl = supabaseConfig.url;
```

## Benefits

1. **Type Safety**: All environment variables are typed
2. **Validation**: Required variables are validated at startup
3. **Feature Flags**: Built-in feature detection
4. **Centralized**: Single source of truth for configuration
5. **Debugging**: Built-in debug information

## Environment Variables

### Required
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

### Optional
- `VITE_OPENAI_API_KEY`: OpenAI API key (enables AI features)
- `VITE_N8N_API_KEY`: n8n API key (enables workflow integration)
- `VITE_N8N_API_URL`: n8n API endpoint

### Server-side Only
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `DATABASE_URL`: Direct database connection string
- `SUPABASE_ACCESS_TOKEN`: Supabase management API token

## Feature Detection

The configuration service automatically detects which features are available:

```typescript
import { features, env } from './config/environment';

if (features.openai) {
  // OpenAI is configured and ready
}

if (features.n8n) {
  // n8n integration is available
}

// Or check programmatically
if (env.isFeatureEnabled('openai')) {
  // Feature is enabled
}
```

## Error Handling

The service will:
- Throw errors for missing required variables in production
- Show warnings for missing optional variables in development
- Provide helpful error messages for configuration issues