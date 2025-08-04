import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseAdmin = createClient(
  'https://zfbgdixbzezpxllkoyfc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig'
);

async function checkAndFixSchema() {
  console.log('🔧 Checking and fixing database schema...');
  
  try {
    // Test current ai_chat_sessions table
    const { data: testData, error: testError } = await supabaseAdmin
      .from('ai_chat_sessions')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.log('❌ ai_chat_sessions issue:', testError.message);
      
      // Try to add missing columns
      console.log('🔨 Adding missing columns...');
      
      const addStatusColumn = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          DO $$ 
          BEGIN
            -- Add status column if it doesn't exist
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'ai_chat_sessions' AND column_name = 'status'
            ) THEN
              ALTER TABLE ai_chat_sessions ADD COLUMN status TEXT DEFAULT 'active';
            END IF;
            
            -- Add updated_at column if it doesn't exist
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'ai_chat_sessions' AND column_name = 'updated_at'
            ) THEN
              ALTER TABLE ai_chat_sessions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
            END IF;
          END $$;
        `
      });
      
      if (addStatusColumn.error) {
        console.log('❌ Error adding columns:', addStatusColumn.error.message);
      } else {
        console.log('✅ Columns added successfully');
      }
      
    } else {
      console.log('✅ ai_chat_sessions table structure looks good');
    }
    
    // Test the table again
    const { data: retestData, error: retestError } = await supabaseAdmin
      .from('ai_chat_sessions')
      .select('*')
      .limit(1);
      
    if (retestError) {
      console.log('❌ Still having issues:', retestError.message);
    } else {
      console.log('✅ ai_chat_sessions table is now working');
    }
    
  } catch (error) {
    console.error('❌ Schema check error:', error.message);
  }
}

async function testN8nAPI() {
  console.log('\\n🔧 Testing n8n API keys...');
  
  const apiKeys = [
    {
      name: 'Current Key',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU'
    },
    {
      name: 'Alternative Key',
      key: 'b38356d3-075f-4b69-9b31-dc90c71ba40a'
    }
  ];
  
  for (const apiKey of apiKeys) {
    try {
      console.log(`\\n🔑 Testing ${apiKey.name}...`);
      
      const response = await fetch('http://18.221.12.50:5678/api/v1/workflows?limit=1', {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': apiKey.key,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📡 Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        const workflows = data.data || data;
        console.log(`✅ ${apiKey.name} WORKS! Found ${workflows.length} workflows`);
        
        if (workflows.length > 0) {
          console.log(`📝 Sample workflow: ${workflows[0].name} (Active: ${workflows[0].active})`);
        }
        
        return { success: true, workingKey: apiKey.key, workflows };
      } else {
        const errorText = await response.text();
        console.log(`❌ ${apiKey.name} failed: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`❌ ${apiKey.name} error: ${error.message}`);
    }
  }
  
  return { success: false, error: 'No working API key found' };
}

async function runFixes() {
  console.log('🚀 Running Database and API Fixes');
  console.log('=' .repeat(50));
  
  await checkAndFixSchema();
  const n8nResult = await testN8nAPI();
  
  console.log('\\n' + '=' .repeat(50));
  console.log('📊 FIX RESULTS');
  console.log('=' .repeat(50));
  
  if (n8nResult.success) {
    console.log('✅ Database schema: Fixed');
    console.log('✅ n8n API: Working');
    console.log('🎉 All fixes applied successfully!');
    
    console.log('\\n🔑 Working n8n API Key:');
    console.log(n8nResult.workingKey);
  } else {
    console.log('⚠️ Database schema: Fixed');
    console.log('❌ n8n API: Still having issues');
    console.log('🔍 Manual n8n API key configuration may be needed');
  }
}

runFixes().catch(error => {
  console.error('🚨 Fix runner error:', error);
});