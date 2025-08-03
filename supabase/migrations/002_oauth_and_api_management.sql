-- OAuth Token Management Tables
-- Stores user-specific OAuth tokens for services like Google, Microsoft, etc.

CREATE TABLE IF NOT EXISTS user_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL, -- 'google', 'microsoft', 'dropbox', etc.
  access_token TEXT NOT NULL, -- Encrypted in production
  refresh_token TEXT, -- Encrypted in production
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[], -- Array of granted scopes
  metadata JSONB DEFAULT '{}', -- Additional service-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, service)
);

-- Index for faster lookups
CREATE INDEX idx_user_oauth_tokens_user_service ON user_oauth_tokens(user_id, service);
CREATE INDEX idx_user_oauth_tokens_expires ON user_oauth_tokens(expires_at);

-- API Usage Tracking
-- Tracks usage of centralized APIs to enforce quotas

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_name TEXT NOT NULL, -- 'whatsapp', 'openai', 'twilio', etc.
  endpoint TEXT, -- Specific endpoint called
  usage_count INTEGER DEFAULT 1,
  tokens_used INTEGER DEFAULT 0, -- For token-based APIs like OpenAI
  cost_units DECIMAL(10, 4) DEFAULT 0, -- Estimated cost in units
  period_start TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', NOW()),
  period_end TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for usage queries
CREATE INDEX idx_api_usage_user_period ON api_usage(user_id, api_name, period_start);
CREATE INDEX idx_api_usage_created ON api_usage(created_at);

-- API Quotas Configuration
-- Defines quotas for centralized APIs per user tier

CREATE TABLE IF NOT EXISTS api_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  api_name TEXT NOT NULL,
  monthly_limit INTEGER, -- Monthly request limit
  daily_limit INTEGER, -- Daily request limit
  rate_limit_per_minute INTEGER DEFAULT 10,
  cost_per_unit DECIMAL(10, 4) DEFAULT 0,
  features JSONB DEFAULT '{}', -- Additional tier-specific features
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier, api_name)
);

-- Insert default quotas
INSERT INTO api_quotas (tier, api_name, monthly_limit, daily_limit, rate_limit_per_minute) VALUES
  ('free', 'whatsapp', 100, 10, 5),
  ('free', 'openai', 1000, 100, 10),
  ('free', 'twilio', 50, 5, 2),
  ('pro', 'whatsapp', 1000, 100, 20),
  ('pro', 'openai', 10000, 1000, 30),
  ('pro', 'twilio', 500, 50, 10),
  ('enterprise', 'whatsapp', NULL, NULL, 100), -- Unlimited
  ('enterprise', 'openai', NULL, NULL, 100),
  ('enterprise', 'twilio', NULL, NULL, 100)
ON CONFLICT (tier, api_name) DO NOTHING;

-- OAuth Flow State Management
-- Temporary storage for OAuth flow state

CREATE TABLE IF NOT EXISTS oauth_flow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  requested_scopes TEXT[],
  redirect_url TEXT,
  workflow_context JSONB DEFAULT '{}', -- Store workflow being created
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clean up expired states periodically
CREATE INDEX idx_oauth_flow_states_expires ON oauth_flow_states(expires_at);

-- Row Level Security (RLS) Policies

ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_flow_states ENABLE ROW LEVEL SECURITY;

-- Users can only see their own OAuth tokens
CREATE POLICY "Users can view own OAuth tokens" ON user_oauth_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OAuth tokens" ON user_oauth_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OAuth tokens" ON user_oauth_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own OAuth tokens" ON user_oauth_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only see their own API usage
CREATE POLICY "Users can view own API usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API usage" ON api_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can manage their own OAuth flow states
CREATE POLICY "Users can manage own OAuth states" ON oauth_flow_states
  FOR ALL USING (auth.uid() = user_id);

-- Function to get user's current API usage
CREATE OR REPLACE FUNCTION get_user_api_usage(
  p_user_id UUID,
  p_api_name TEXT,
  p_period_start TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', NOW())
)
RETURNS TABLE (
  total_usage INTEGER,
  daily_usage INTEGER,
  quota_remaining INTEGER
) AS $$
DECLARE
  v_tier TEXT;
  v_monthly_limit INTEGER;
  v_daily_limit INTEGER;
  v_total_usage INTEGER;
  v_daily_usage INTEGER;
BEGIN
  -- Get user tier (simplified - you might want to join with a users table)
  v_tier := 'free'; -- Default tier
  
  -- Get quota limits
  SELECT monthly_limit, daily_limit INTO v_monthly_limit, v_daily_limit
  FROM api_quotas
  WHERE tier = v_tier AND api_name = p_api_name;
  
  -- Get total usage for the period
  SELECT COALESCE(SUM(usage_count), 0) INTO v_total_usage
  FROM api_usage
  WHERE user_id = p_user_id 
    AND api_name = p_api_name
    AND period_start = p_period_start;
  
  -- Get daily usage
  SELECT COALESCE(SUM(usage_count), 0) INTO v_daily_usage
  FROM api_usage
  WHERE user_id = p_user_id 
    AND api_name = p_api_name
    AND created_at >= date_trunc('day', NOW());
  
  RETURN QUERY
  SELECT 
    v_total_usage,
    v_daily_usage,
    CASE 
      WHEN v_monthly_limit IS NULL THEN NULL -- Unlimited
      ELSE v_monthly_limit - v_total_usage
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh OAuth token if expired
CREATE OR REPLACE FUNCTION refresh_oauth_token_if_needed(
  p_user_id UUID,
  p_service TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT expires_at INTO v_expires_at
  FROM user_oauth_tokens
  WHERE user_id = p_user_id AND service = p_service;
  
  -- Check if token expires within next 5 minutes
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() + INTERVAL '5 minutes' THEN
    -- Token needs refresh (actual refresh would be handled by backend)
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;