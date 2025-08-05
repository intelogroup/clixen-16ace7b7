import { createClient } from '@supabase/supabase-js';

// Test Supabase connection
const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBackend() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'jimkalinov@gmail.com',
      password: 'Jimkali90#'
    });
    
    if (authError) {
      console.error('Auth error:', authError);
    } else {
      console.log('✅ Authentication successful');
    }
    
    // Test database connection
    const { data: tables, error: tableError } = await supabase.from('conversations').select('*').limit(1);
    
    if (tableError) {
      console.error('Database error:', tableError);
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Test edge functions
    const functionsToTest = ['ai-chat-system', 'api-operations', 'ai-chat-sessions', 'ai-chat-stream'];
    
    for (const fn of functionsToTest) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ test: true })
        });
        
        if (response.ok || response.status === 400) {
          console.log(`✅ Edge function ${fn} is responding`);
        } else {
          console.log(`❌ Edge function ${fn} returned ${response.status}`);
        }
      } catch (e) {
        console.error(`❌ Edge function ${fn} error:`, e.message);
      }
    }
    
    // Test n8n connection
    const n8nApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';
    const n8nUrl = 'http://18.221.12.50:5678/api/v1';
    
    try {
      const n8nResponse = await fetch(`${n8nUrl}/workflows`, {
        headers: {
          'X-N8N-API-KEY': n8nApiKey
        }
      });
      
      if (n8nResponse.ok) {
        console.log('✅ n8n API connection successful');
      } else {
        console.log(`❌ n8n API returned ${n8nResponse.status}`);
      }
    } catch (e) {
      console.error('❌ n8n connection error:', e.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBackend();