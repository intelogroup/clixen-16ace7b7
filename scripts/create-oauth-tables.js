#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or API key');
  process.exit(1);
}

console.log('🔧 Creating OAuth and API management tables...');
console.log(`📍 Project: ${supabaseUrl}`);

// Since we can't run raw SQL through the JS client, we'll provide instructions
console.log('\n📋 Please follow these steps to create the tables:\n');

console.log('1. Go to the Supabase Dashboard SQL Editor:');
console.log(`   https://supabase.com/dashboard/project/zfbgdixbzezpxllkoyfc/sql\n`);

console.log('2. Copy the migration SQL from this file:');
console.log('   /root/repo/supabase/migrations/002_oauth_and_api_management.sql\n');

console.log('3. Paste and run it in the SQL Editor\n');

console.log('4. Alternatively, here\'s a simplified version you can run:\n');

const simplifiedSQL = `
-- OAuth Token Management
CREATE TABLE IF NOT EXISTS user_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, service)
);

-- API Usage Tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_name TEXT NOT NULL,
  endpoint TEXT,
  usage_count INTEGER DEFAULT 1,
  tokens_used INTEGER DEFAULT 0,
  cost_units DECIMAL(10, 4) DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', NOW()),
  period_end TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Quotas Configuration
CREATE TABLE IF NOT EXISTS api_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT DEFAULT 'free',
  api_name TEXT NOT NULL,
  monthly_limit INTEGER,
  daily_limit INTEGER,
  rate_limit_per_minute INTEGER DEFAULT 10,
  cost_per_unit DECIMAL(10, 4) DEFAULT 0,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier, api_name)
);

-- OAuth Flow State Management
CREATE TABLE IF NOT EXISTS oauth_flow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  requested_scopes TEXT[],
  redirect_url TEXT,
  workflow_context JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_flow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own tokens" ON user_oauth_tokens
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own OAuth states" ON oauth_flow_states
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view quotas" ON api_quotas
  FOR SELECT USING (true);

-- Insert default quotas
INSERT INTO api_quotas (tier, api_name, monthly_limit, daily_limit, rate_limit_per_minute) VALUES
  ('free', 'whatsapp', 100, 10, 5),
  ('free', 'openai', 1000, 100, 10),
  ('free', 'twilio', 50, 5, 2),
  ('pro', 'whatsapp', 1000, 100, 20),
  ('pro', 'openai', 10000, 1000, 30),
  ('pro', 'twilio', 500, 50, 10)
ON CONFLICT (tier, api_name) DO NOTHING;
`;

console.log('```sql');
console.log(simplifiedSQL);
console.log('```\n');

console.log('✅ Once you\'ve run the SQL, the OAuth and API management system will be ready!');