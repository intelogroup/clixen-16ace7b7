import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

console.log('🔐 Testing Supabase Authentication...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

try {
  console.log('1. Testing connection...');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.log('❌ Connection failed:', sessionError.message);
  } else {
    console.log('✅ Connected to Supabase');
    console.log('   Current session:', sessionData.session ? 'Active' : 'None');
  }

  console.log('\n2. Testing sign in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (authError) {
    console.log('❌ Authentication failed:', authError.message);
  } else {
    console.log('✅ Authentication successful');
    console.log('   User ID:', authData.user?.id);
    console.log('   Email:', authData.user?.email);
    console.log('   Email confirmed:', authData.user?.email_confirmed_at ? 'Yes' : 'No');
  }

  console.log('\n3. Testing database query...');
  const { data: testData, error: testError } = await supabase
    .from('projects')
    .select('*')
    .limit(5);

  if (testError) {
    console.log('❌ Database query failed:', testError.message);
  } else {
    console.log('✅ Database query successful');
    console.log('   Projects found:', testData?.length || 0);
  }

  console.log('\n4. Testing edge function...');
  const { data: funcData, error: funcError } = await supabase.functions.invoke('health-check');

  if (funcError) {
    console.log('❌ Edge function failed:', funcError.message);
  } else {
    console.log('✅ Edge function successful');
    console.log('   Response:', funcData);
  }

} catch (error) {
  console.log('💥 Test failed:', error.message);
}

console.log('\n🏁 Authentication test completed');
