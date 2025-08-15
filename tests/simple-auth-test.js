const fetch = require('node-fetch');
const { Client } = require('pg');

async function simpleAuthTest() {
  console.log('\n🔬 Simple Auth Test\n');
  
  const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
  
  const testEmail = `simple_${Date.now()}@test.com`;
  const testPassword = 'Test123!@#';
  
  console.log(`Testing with: ${testEmail}`);
  
  try {
    // First check database setup
    const client = new Client({
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.zfbgdixbzezpxllkoyfc',
      password: 'Goldyear2023#',
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ Connected to database');
    
    // Check trigger
    const triggerResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname = 'users' 
      AND t.tgname = 'on_auth_user_created';
    `);
    
    console.log(`✅ Trigger exists: ${triggerResult.rows[0].count > 0}`);
    
    // Check user_profiles table
    const tableResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'user_profiles';
    `);
    
    console.log(`✅ user_profiles table exists: ${tableResult.rows[0].count > 0}`);
    
    await client.end();
    
    // Now try signup
    console.log('\n📡 Attempting signup...');
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    const data = await response.json();
    
    console.log('\nResponse Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SIGNUP SUCCESSFUL!');
      
      // Try to clean up
      if (data.user?.id) {
        const cleanupClient = new Client({
          host: 'aws-0-us-east-1.pooler.supabase.com',
          port: 6543,
          database: 'postgres',
          user: 'postgres.zfbgdixbzezpxllkoyfc',
          password: 'Goldyear2023#',
          ssl: { rejectUnauthorized: false }
        });
        
        await cleanupClient.connect();
        await cleanupClient.query(`DELETE FROM user_profiles WHERE id = $1;`, [data.user.id]);
        await cleanupClient.query(`DELETE FROM auth.users WHERE id = $1;`, [data.user.id]);
        await cleanupClient.end();
        console.log('🧹 Test data cleaned up');
      }
    } else {
      console.log('\n❌ SIGNUP FAILED');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleAuthTest();