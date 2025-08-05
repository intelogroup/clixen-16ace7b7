# API Key Management in Clixen

This document explains how API keys are managed securely in the Clixen platform.

## Overview

Clixen uses a **dual-approach** for API key management:
1. **Edge Function Secrets** (Primary for production)
2. **Database Storage** (Fallback and management)

## Architecture

```
┌─────────────────┐
│ Edge Function   │
│   ai-chat-system│
└────────┬────────┘
         │
         ▼
    getApiKey()
         │
    ┌────┴────┐
    │ Check   │
    │ Env Var │
    └────┬────┘
         │ 
    Found? ──No──┐
         │        │
        Yes       ▼
         │   ┌────────────┐
         │   │ Query DB   │
         │   │api_configs │
         └───┴────────────┘
```

## Storage Locations

### 1. Edge Function Secrets (Recommended)
```bash
# Set secrets using Supabase CLI
supabase secrets set OPENAI_API_KEY=sk-... --project-ref zfbgdixbzezpxllkoyfc
supabase secrets set N8N_API_KEY=eyJ... --project-ref zfbgdixbzezpxllkoyfc
```

**Advantages:**
- ✅ Most secure - never exposed in code
- ✅ Automatically available in Edge Functions
- ✅ No database roundtrip needed
- ✅ Managed by Supabase infrastructure

### 2. Database Storage (api_configurations table)
```sql
-- Table structure
CREATE TABLE api_configurations (
  id UUID PRIMARY KEY,
  service_name TEXT UNIQUE,  -- 'openai', 'n8n', etc.
  api_key TEXT,              -- Encrypted
  is_active BOOLEAN,
  environment TEXT,          -- 'production', 'development'
  metadata JSONB,
  last_used_at TIMESTAMP
);
```

**Advantages:**
- ✅ Centralized management
- ✅ Audit trail with last_used_at
- ✅ Support for multiple environments
- ✅ Easy key rotation

## Setting API Keys

### Method 1: Using Supabase Dashboard
1. Navigate to Table Editor → api_configurations
2. Insert a new row with:
   - service_name: 'openai'
   - api_key: 'your-api-key'
   - is_active: true
   - environment: 'production'

### Method 2: Using SQL Editor
```sql
-- Insert OpenAI API key
INSERT INTO api_configurations (service_name, api_key, is_active, environment, metadata)
VALUES (
  'openai',
  'sk-your-openai-key-here',
  true,
  'production',
  '{"model": "gpt-4", "max_tokens": 4000}'::jsonb
);

-- Insert n8n API key
INSERT INTO api_configurations (service_name, api_key, is_active, environment, metadata)
VALUES (
  'n8n',
  'your-n8n-api-key',
  true,
  'production',
  '{"api_url": "http://18.221.12.50:5678/api/v1"}'::jsonb
);
```

### Method 3: Using Edge Function Secrets (Recommended)
```bash
# Run the provided script
./scripts/set-edge-function-secrets.sh

# Or manually:
supabase secrets set OPENAI_API_KEY=sk-... --project-ref zfbgdixbzezpxllkoyfc
```

## Retrieving API Keys in Code

### In Edge Functions
```typescript
// The getApiKey function handles both methods automatically
const openaiKey = await getApiKey('openai');

// Function implementation (already in ai-chat-system/index.ts)
const getApiKey = async (serviceName: string): Promise<string | null> => {
  // 1. First try environment variable
  const envKey = Deno.env.get(`${serviceName.toUpperCase()}_API_KEY`);
  if (envKey) return envKey;
  
  // 2. Fallback to database
  const { data } = await supabase
    .from('api_configurations')
    .select('api_key')
    .eq('service_name', serviceName)
    .eq('is_active', true)
    .single();
    
  return data?.api_key || null;
};
```

### In Frontend (Never do this!)
```typescript
// ❌ NEVER retrieve API keys in frontend code
// API keys should only be accessed in Edge Functions
```

## Key Rotation

### Rotating Keys in Database
```sql
-- Use the built-in function
SELECT rotate_api_key('openai', 'sk-new-key-here', 'production');

-- This will:
-- 1. Deactivate the old key
-- 2. Insert the new key
-- 3. Return the new key's ID
```

### Rotating Edge Function Secrets
```bash
# Simply set the new value
supabase secrets set OPENAI_API_KEY=sk-new-key --project-ref zfbgdixbzezpxllkoyfc
```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use Edge Function secrets** for production
3. **Enable RLS** on api_configurations table (already done)
4. **Rotate keys regularly** (every 90 days recommended)
5. **Monitor usage** via last_used_at timestamps
6. **Use service role** only in Edge Functions

## Monitoring & Auditing

### Check API Key Usage
```sql
-- See when keys were last used
SELECT service_name, last_used_at, environment
FROM api_configurations
WHERE is_active = true
ORDER BY last_used_at DESC;

-- View audit log (if implemented)
SELECT * FROM api_key_audit_log
WHERE service_name = 'openai'
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### API Key Not Found
1. Check if the key exists in database:
   ```sql
   SELECT service_name, is_active, environment 
   FROM api_configurations;
   ```

2. Check Edge Function secrets:
   ```bash
   supabase secrets list --project-ref zfbgdixbzezpxllkoyfc
   ```

3. Verify environment variable name matches:
   - Service: 'openai' → Env var: 'OPENAI_API_KEY'
   - Service: 'n8n' → Env var: 'N8N_API_KEY'

### Demo Mode Activated
If you see "Demo Mode Active" in the chat:
1. OpenAI API key is not configured
2. Add the key using one of the methods above
3. Redeploy the Edge Function if needed

## Current Configuration

As of deployment, the following API keys are configured:
- ✅ **OpenAI**: Stored in database (production)
- ✅ **n8n**: Stored in database (production)
- ⏳ **Edge Function Secrets**: Run the script to set them

## Future Enhancements

1. **Migrate to Supabase Vault** for additional encryption
2. **Implement key expiration** warnings
3. **Add usage quotas** per API key
4. **Create admin UI** for key management