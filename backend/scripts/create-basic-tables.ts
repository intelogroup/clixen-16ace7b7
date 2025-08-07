#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

async function createBasicTables() {
  console.log('🚀 Creating Basic Tables for Clixen System');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('📄 Creating workflow_executions table...');
  
  try {
    // Create workflow_executions table using direct SQL
    const workflowExecutionsSQL = `
      CREATE TABLE IF NOT EXISTS public.workflow_executions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        workflow_json JSONB NOT NULL,
        validation_progress JSONB DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        execution_time INTEGER,
        error_details JSONB,
        webhook_url TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `;
    
    // Since we can't use rpc('exec_sql'), let's try a different approach
    // Let's create the table using Supabase's createTable if available, or use INSERT to test connection
    
    // First, let's test if we can at least insert into the auth.users table to test connection
    console.log('🔍 Testing Supabase connection...');
    
    const { data: testData, error: testError } = await supabase
      .from('workflow_executions')
      .select('count')
      .limit(1);
    
    if (testError) {
      if (testError.message.includes('does not exist')) {
        console.log('✅ Table does not exist, this is expected. Connection is working.');
        console.log('');
        console.log('📋 Next Steps:');
        console.log('   1. Open Supabase Dashboard: https://supabase.com/dashboard');
        console.log('   2. Go to SQL Editor');
        console.log('   3. Copy and paste the contents of: supabase/migrations/003_queue_system_setup.sql');
        console.log('   4. Run the SQL to create all required tables and functions');
        console.log('');
        console.log('🔧 Alternative: Use Supabase CLI:');
        console.log('   1. Install: npm install -g supabase');
        console.log('   2. Login: supabase login');
        console.log('   3. Link project: supabase link --project-ref zfbgdixbzezpxllkoyfc');
        console.log('   4. Push migration: supabase db push');
        console.log('');
        return;
      } else {
        throw testError;
      }
    } else {
      console.log('✅ workflow_executions table already exists!');
      console.log('📊 Current table status:', testData);
    }

    console.log('🎉 Database validation completed!');

  } catch (error) {
    console.error('💥 Failed to create tables:', error);
    
    console.log('');
    console.log('📋 Manual Setup Required:');
    console.log('   The automatic table creation failed. Please manually run the SQL migration:');
    console.log('   1. Open Supabase Dashboard SQL Editor');
    console.log('   2. Copy contents from: supabase/migrations/003_queue_system_setup.sql');
    console.log('   3. Execute the SQL');
    console.log('');
    
    process.exit(1);
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  createBasicTables().catch(console.error);
}

export { createBasicTables };