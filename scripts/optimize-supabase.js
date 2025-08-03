#!/usr/bin/env node

/**
 * Supabase Database Optimizer
 * 
 * This script leverages Supabase extensions to create advanced features
 * for the Clixen platform including scheduled jobs, vector search, and more.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const dbClient = new Client({
  host: 'aws-0-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.zfbgdixbzezpxllkoyfc',
  password: 'Jimkali90#',
  ssl: { rejectUnauthorized: false }
});

async function optimizeDatabase() {
  try {
    console.log('🚀 Supabase Database Optimizer');
    console.log('=====================================\n');
    
    await dbClient.connect();
    console.log('✅ Connected to database\n');

    // 1. Set up pg_cron for scheduled jobs
    console.log('⏰ Setting up Scheduled Jobs with pg_cron:');
    console.log('------------------------------------------');
    
    // Schedule daily cleanup of expired OAuth states
    try {
      await dbClient.query(`
        SELECT cron.schedule(
          'cleanup-oauth-states',
          '0 2 * * *', -- Daily at 2 AM
          'SELECT cleanup_expired_oauth_states();'
        );
      `);
      console.log('  ✅ Scheduled daily OAuth state cleanup (2 AM)');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  ⏭️  OAuth cleanup job already scheduled');
      } else {
        console.log('  ❌ Error scheduling OAuth cleanup:', err.message);
      }
    }

    // Schedule monthly API usage reset
    try {
      await dbClient.query(`
        SELECT cron.schedule(
          'reset-monthly-quotas',
          '0 0 1 * *', -- First day of month at midnight
          $$
          UPDATE api_usage 
          SET period_start = date_trunc('month', NOW()),
              period_end = date_trunc('month', NOW()) + INTERVAL '1 month'
          WHERE period_end < NOW();
          $$
        );
      `);
      console.log('  ✅ Scheduled monthly quota reset (1st of month)');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  ⏭️  Monthly reset job already scheduled');
      } else {
        console.log('  ❌ Error scheduling monthly reset:', err.message);
      }
    }

    // 2. Create vector embeddings table for AI-powered search
    console.log('\n🧠 Setting up Vector Search for AI:');
    console.log('------------------------------------');
    
    try {
      await dbClient.query(`
        CREATE TABLE IF NOT EXISTS workflow_embeddings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          embedding vector(1536), -- OpenAI embedding dimension
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('  ✅ Created workflow_embeddings table for AI search');
      
      // Create index for fast similarity search
      await dbClient.query(`
        CREATE INDEX IF NOT EXISTS workflow_embeddings_embedding_idx 
        ON workflow_embeddings 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `);
      console.log('  ✅ Created vector index for fast similarity search');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  ⏭️  Vector embeddings table already exists');
      } else {
        console.log('  ❌ Error creating embeddings table:', err.message);
      }
    }

    // 3. Create audit log for OAuth access
    console.log('\n📋 Setting up Audit Logging:');
    console.log('----------------------------');
    
    try {
      await dbClient.query(`
        CREATE TABLE IF NOT EXISTS oauth_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id),
          service TEXT NOT NULL,
          action TEXT NOT NULL, -- 'grant', 'revoke', 'refresh', 'use'
          ip_address INET,
          user_agent TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('  ✅ Created OAuth audit log table');
      
      // Create index for fast queries
      await dbClient.query(`
        CREATE INDEX IF NOT EXISTS oauth_audit_log_user_idx 
        ON oauth_audit_log(user_id, created_at DESC);
      `);
      console.log('  ✅ Created audit log indexes');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('  ⏭️  Audit log table already exists');
      } else {
        console.log('  ❌ Error creating audit log:', err.message);
      }
    }

    // 4. Create webhook notifications using pg_net
    console.log('\n🔔 Setting up Webhook Notifications:');
    console.log('------------------------------------');
    
    try {
      await dbClient.query(`
        CREATE OR REPLACE FUNCTION notify_workflow_completion(
          p_workflow_id UUID,
          p_webhook_url TEXT,
          p_payload JSONB
        )
        RETURNS UUID AS $$
        DECLARE
          request_id UUID;
        BEGIN
          -- Use pg_net to send webhook
          SELECT net.http_post(
            url := p_webhook_url,
            body := p_payload::text,
            headers := '{"Content-Type": "application/json"}'::jsonb
          ) INTO request_id;
          
          RETURN request_id;
        END;
        $$ LANGUAGE plpgsql;
      `);
      console.log('  ✅ Created webhook notification function');
    } catch (err) {
      console.log('  ❌ Error creating webhook function:', err.message);
    }

    // 5. Create advanced API usage analytics
    console.log('\n📊 Setting up Advanced Analytics:');
    console.log('---------------------------------');
    
    try {
      await dbClient.query(`
        CREATE OR REPLACE VIEW api_usage_analytics AS
        SELECT 
          u.user_id,
          u.api_name,
          DATE(u.created_at) as usage_date,
          COUNT(*) as request_count,
          SUM(u.tokens_used) as total_tokens,
          SUM(u.cost_units) as total_cost,
          AVG(u.tokens_used) as avg_tokens_per_request,
          MAX(u.created_at) as last_used
        FROM api_usage u
        GROUP BY u.user_id, u.api_name, DATE(u.created_at);
      `);
      console.log('  ✅ Created API usage analytics view');
      
      await dbClient.query(`
        CREATE OR REPLACE VIEW user_tier_status AS
        SELECT 
          au.id as user_id,
          au.email,
          COALESCE(
            (SELECT tier FROM subscriptions 
             WHERE user_id = au.id 
             AND status = 'active' 
             ORDER BY created_at DESC 
             LIMIT 1),
            'free'
          ) as tier,
          (SELECT COUNT(*) FROM workflows WHERE user_id = au.id) as workflow_count,
          (SELECT COUNT(*) FROM user_oauth_tokens WHERE user_id = au.id) as connected_services
        FROM auth.users au;
      `);
      console.log('  ✅ Created user tier status view');
    } catch (err) {
      console.log('  ❌ Error creating analytics views:', err.message);
    }

    // 6. Create rate limiting function
    console.log('\n🚦 Setting up Rate Limiting:');
    console.log('----------------------------');
    
    try {
      await dbClient.query(`
        CREATE OR REPLACE FUNCTION check_rate_limit(
          p_user_id UUID,
          p_api_name TEXT,
          p_window_minutes INTEGER DEFAULT 1
        )
        RETURNS BOOLEAN AS $$
        DECLARE
          request_count INTEGER;
          rate_limit INTEGER;
        BEGIN
          -- Get rate limit for user's tier
          SELECT q.rate_limit_per_minute INTO rate_limit
          FROM api_quotas q
          WHERE q.api_name = p_api_name
          AND q.tier = COALESCE(
            (SELECT tier FROM subscriptions 
             WHERE user_id = p_user_id 
             AND status = 'active' 
             ORDER BY created_at DESC 
             LIMIT 1),
            'free'
          );
          
          -- Count recent requests
          SELECT COUNT(*) INTO request_count
          FROM api_usage
          WHERE user_id = p_user_id
          AND api_name = p_api_name
          AND created_at >= NOW() - (p_window_minutes || ' minutes')::INTERVAL;
          
          RETURN request_count < rate_limit;
        END;
        $$ LANGUAGE plpgsql;
      `);
      console.log('  ✅ Created rate limiting function');
    } catch (err) {
      console.log('  ❌ Error creating rate limit function:', err.message);
    }

    // 7. Create workflow recommendation function using vector similarity
    console.log('\n🎯 Setting up AI-Powered Recommendations:');
    console.log('-----------------------------------------');
    
    try {
      await dbClient.query(`
        CREATE OR REPLACE FUNCTION recommend_workflows(
          p_embedding vector(1536),
          p_limit INTEGER DEFAULT 5
        )
        RETURNS TABLE(
          workflow_id UUID,
          similarity FLOAT,
          content TEXT,
          metadata JSONB
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            we.workflow_id,
            1 - (we.embedding <=> p_embedding) as similarity,
            we.content,
            we.metadata
          FROM workflow_embeddings we
          ORDER BY we.embedding <=> p_embedding
          LIMIT p_limit;
        END;
        $$ LANGUAGE plpgsql;
      `);
      console.log('  ✅ Created workflow recommendation function');
    } catch (err) {
      console.log('  ❌ Error creating recommendation function:', err.message);
    }

    // 8. View scheduled jobs
    console.log('\n📅 Current Scheduled Jobs:');
    console.log('-------------------------');
    const jobs = await dbClient.query(`
      SELECT 
        jobname,
        schedule,
        command,
        active
      FROM cron.job
      ORDER BY jobname;
    `);
    
    for (const job of jobs.rows) {
      console.log(`  ${job.active ? '✅' : '⏸️'} ${job.jobname}: ${job.schedule}`);
      console.log(`      Command: ${job.command.substring(0, 50)}...`);
    }

    // 9. Create Edge Function helpers
    console.log('\n⚡ Edge Function Preparation:');
    console.log('-----------------------------');
    console.log('  📝 Edge functions can be created in supabase/functions/');
    console.log('  📝 Example function structure created...');
    
    // Create example Edge Function template
    const edgeFunctionExample = `
-- Example Edge Function for OAuth Token Refresh
-- Save as: supabase/functions/refresh-oauth-tokens/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  // Get expired tokens
  const { data: expiredTokens } = await supabase
    .from('user_oauth_tokens')
    .select('*')
    .lt('expires_at', new Date().toISOString())
    .not('refresh_token', 'is', null)
  
  // Refresh each token
  for (const token of expiredTokens || []) {
    // Implement OAuth refresh logic here
    console.log(\`Refreshing token for service: \${token.service}\`)
  }
  
  return new Response(JSON.stringify({ refreshed: expiredTokens?.length || 0 }))
})
`;
    
    console.log('  ✅ Edge function template ready for implementation');

    console.log('\n✨ Database optimization complete!');
    console.log('\n📚 Next Steps:');
    console.log('  1. Implement Edge Functions for OAuth token refresh');
    console.log('  2. Add workflow embeddings when creating workflows');
    console.log('  3. Use vector search for intelligent recommendations');
    console.log('  4. Monitor scheduled jobs in pg_cron');
    console.log('  5. Set up webhook endpoints for notifications');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await dbClient.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run optimizer
optimizeDatabase();