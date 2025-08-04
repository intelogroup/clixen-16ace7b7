import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://zfbgdixbzezpxllkoyfc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig'
);

const supabaseClient = createClient(
  'https://zfbgdixbzezpxllkoyfc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw'
);

async function testAuth() {
  try {
    console.log('🔧 Testing Authentication Setup...');
    
    // First, let's check if the user exists
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error listing users:', usersError.message);
      return;
    }
    
    console.log('📋 Existing users:', users?.users?.map(u => u.email) || []);
    
    const testEmail = 'jayveedz19@gmail.com';
    const existingUser = users?.users?.find(u => u.email === testEmail);
    
    if (!existingUser) {
      console.log('👤 User does not exist, creating...');
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: 'Goldyear2023#',
        email_confirm: true
      });
      
      if (createError) {
        console.error('❌ Error creating user:', createError.message);
        return;
      }
      
      console.log('✅ User created successfully:', newUser.user.email);
    } else {
      console.log('✅ User exists:', existingUser.email, 'ID:', existingUser.id);
      
      // Reset password to ensure it's correct
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: 'Goldyear2023#' }
      );
      
      if (updateError) {
        console.log('⚠️ Could not update password:', updateError.message);
      } else {
        console.log('🔑 Password reset successfully');
      }
    }
    
    // Now test regular client authentication
    console.log('🔐 Testing client authentication...');
    
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: testEmail,
      password: 'Goldyear2023#'
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      
      // Try to sign up instead (in case it's a different issue)
      console.log('🔄 Trying signup instead...');
      const { data: signupData, error: signupError } = await supabaseClient.auth.signUp({
        email: testEmail,
        password: 'Goldyear2023#'
      });
      
      if (signupError) {
        console.error('❌ Signup error:', signupError.message);
      } else {
        console.log('✅ Signup successful, user needs email confirmation');
      }
    } else {
      console.log('✅ Authentication successful!');
      console.log('👤 User ID:', authData.user.id);
      console.log('🔑 Access token available:', !!authData.session.access_token);
      
      return {
        user: authData.user,
        session: authData.session
      };
    }
    
  } catch (error) {
    console.error('🚨 Test error:', error.message);
  }
}

testAuth().then(result => {
  if (result) {
    console.log('🎉 Authentication test completed successfully!');
  } else {
    console.log('⚠️ Authentication test completed with issues');
  }
});