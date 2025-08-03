# Migration Guide for OAuth & API Management System

## 📋 Prerequisites

- Access to Supabase Dashboard
- Project Admin privileges
- Supabase project ID: `zfbgdixbzezpxllkoyfc`

## 🚀 Quick Migration Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open SQL Editor**
   - Go to: https://supabase.com/dashboard/project/zfbgdixbzezpxllkoyfc/sql
   - Click on "New Query"

2. **Run the Migration**
   - Copy the entire contents of `/supabase/migrations/002_oauth_and_api_management.sql`
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

3. **Verify Tables Created**
   - Navigate to Table Editor
   - Confirm these tables exist:
     - `user_oauth_tokens`
     - `api_usage`
     - `api_quotas`
     - `oauth_flow_states`

### Option 2: Via Supabase CLI (Requires Database Password)

```bash
# Install Supabase CLI if not already installed
curl -L -o supabase.tar.gz https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz
tar -xzf supabase.tar.gz -C /usr/local/bin
rm supabase.tar.gz

# Link to your project
supabase link --project-ref zfbgdixbzezpxllkoyfc

# Push the migration (requires database password)
supabase db push
```

### Option 3: Manual Table Creation

If you prefer to create tables individually:

```sql
-- Step 1: Create user_oauth_tokens table
CREATE TABLE user_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, service)
);

-- Step 2: Create api_usage table
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  period_start TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create api_quotas table
CREATE TABLE api_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT DEFAULT 'free',
  api_name TEXT NOT NULL,
  monthly_limit INTEGER,
  daily_limit INTEGER,
  UNIQUE(tier, api_name)
);

-- Step 4: Create oauth_flow_states table
CREATE TABLE oauth_flow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  service TEXT NOT NULL,
  requested_scopes TEXT[],
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Enable Row Level Security
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_flow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_quotas ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies
CREATE POLICY "Users can manage own tokens" ON user_oauth_tokens
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own OAuth states" ON oauth_flow_states
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view quotas" ON api_quotas
  FOR SELECT USING (true);

-- Step 7: Insert default quotas
INSERT INTO api_quotas (tier, api_name, monthly_limit, daily_limit) VALUES
  ('free', 'whatsapp', 100, 10),
  ('free', 'openai', 1000, 100),
  ('free', 'twilio', 50, 5),
  ('pro', 'whatsapp', 1000, 100),
  ('pro', 'openai', 10000, 1000),
  ('pro', 'twilio', 500, 50);
```

## ✅ Post-Migration Verification

### Check Tables via Dashboard
1. Go to Table Editor: https://supabase.com/dashboard/project/zfbgdixbzezpxllkoyfc/editor
2. Verify all 4 tables are listed
3. Check that RLS is enabled (shield icon should be green)

### Check via Node.js Script
```bash
node scripts/run-migration.js
```

Expected output:
```
✅ Table 'user_oauth_tokens' already exists
✅ Table 'api_usage' already exists
✅ Table 'api_quotas' already exists
✅ Table 'oauth_flow_states' already exists
```

## 🔧 Configuration After Migration

### 1. Set up OAuth Applications

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-domain.com/auth/callback`
4. Add to `.env`:
```env
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_GOOGLE_CLIENT_SECRET=your-client-secret
```

#### Microsoft OAuth Setup
1. Go to [Azure Portal](https://portal.azure.com)
2. Register application
3. Add redirect URI
4. Add to `.env`:
```env
VITE_MICROSOFT_CLIENT_ID=your-client-id
VITE_MICROSOFT_CLIENT_SECRET=your-client-secret
```

### 2. Configure Centralized APIs

Add these to your `.env` file:
```env
# WhatsApp Business
VITE_WHATSAPP_ACCESS_TOKEN=your-token
VITE_WHATSAPP_PHONE_NUMBER_ID=your-phone-id

# Twilio
VITE_TWILIO_ACCOUNT_SID=your-sid
VITE_TWILIO_AUTH_TOKEN=your-auth
VITE_TWILIO_PHONE_NUMBER=your-number

# SendGrid
VITE_SENDGRID_API_KEY=your-key

# Slack
VITE_SLACK_BOT_TOKEN=your-token
```

## 🔍 Troubleshooting

### Common Issues

1. **"permission denied for schema public"**
   - Ensure you're using an admin role
   - Check database permissions in Supabase Dashboard

2. **"relation already exists"**
   - Tables might already be created
   - Use `IF NOT EXISTS` clause or drop existing tables first

3. **"violates foreign key constraint"**
   - Ensure `auth.users` table exists
   - Check that auth schema is enabled

4. **RLS policies not working**
   - Verify RLS is enabled on tables
   - Check that policies are created correctly
   - Test with authenticated user context

### Rollback Migration

If you need to rollback:
```sql
-- Drop all OAuth/API tables
DROP TABLE IF EXISTS user_oauth_tokens CASCADE;
DROP TABLE IF EXISTS api_usage CASCADE;
DROP TABLE IF EXISTS api_quotas CASCADE;
DROP TABLE IF EXISTS oauth_flow_states CASCADE;

-- Drop functions if created
DROP FUNCTION IF EXISTS get_user_api_usage CASCADE;
DROP FUNCTION IF EXISTS refresh_oauth_token_if_needed CASCADE;
```

## 📊 Testing the Migration

### Test OAuth Token Storage
```sql
-- Insert test token (replace with real user_id)
INSERT INTO user_oauth_tokens (user_id, service, access_token, scopes)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'google',
  'test-token',
  ARRAY['gmail.send', 'drive.read']
);

-- Query tokens
SELECT * FROM user_oauth_tokens;
```

### Test API Usage Tracking
```sql
-- Insert test usage
INSERT INTO api_usage (user_id, api_name, usage_count)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'whatsapp',
  1
);

-- Check usage
SELECT * FROM api_usage;
```

### Test Quotas
```sql
-- Check quotas
SELECT * FROM api_quotas WHERE tier = 'free';
```

## 📚 Additional Resources

- [Supabase Migrations Documentation](https://supabase.com/docs/guides/database/migrations)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OAuth Implementation Guide](/docs/OAUTH-API-MANAGEMENT.md)
- [Environment Variables Template](/.env.example)

## ✨ Next Steps

After successful migration:
1. Configure OAuth applications (Google, Microsoft, etc.)
2. Set up centralized API keys
3. Test OAuth flow in development
4. Deploy application updates
5. Monitor usage and quotas

For questions or issues, refer to the [OAuth & API Management Documentation](/docs/OAUTH-API-MANAGEMENT.md).