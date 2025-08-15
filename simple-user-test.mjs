import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAndTestUser() {
  try {
    // Generate unique test user email
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@clixen.app`;
    const testPassword = 'TestPass123!';
    
    console.log('🧪 Creating fresh test user via signup...');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    
    // Sign up the user
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signupError) {
      console.error('❌ Error signing up user:', signupError.message);
      return null;
    }
    
    console.log('✅ User signup successful!');
    console.log(`User ID: ${signupData.user?.id}`);
    
    // Wait a moment for the signup to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now sign in with the user
    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signinError) {
      console.error('❌ Error signing in user:', signinError.message);
      return null;
    }
    
    console.log('✅ User signin successful!');
    
    // Check for folder assignments (using the anon client to simulate real user experience)
    const { data: folderCheck, error: folderError } = await supabase
      .from('folder_assignments')
      .select('project_number, user_slot, folder_tag_name, status')
      .eq('user_id', signupData.user?.id);
    
    if (folderError) {
      console.log('❌ Error checking folder assignments:', folderError.message);
    } else {
      console.log('📁 User folder assignments:', folderCheck);
    }
    
    return {
      user: signupData.user,
      session: signinData.session,
      email: testEmail,
      password: testPassword
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return null;
  }
}

createAndTestUser().then(result => {
  if (result) {
    console.log('\n🎯 Test User Created Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${result.email}`);
    console.log(`🔐 Password: ${result.password}`);
    console.log(`🆔 User ID: ${result.user?.id}`);
    console.log(`🎫 Session: ${result.session ? 'Active' : 'None'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 Ready for testing! Use these credentials to login to the app.');
    console.log('\n🌐 App URL: https://clixen.app');
    console.log('🌐 Alt URL: http://18.221.12.50');
  }
});