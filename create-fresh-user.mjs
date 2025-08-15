import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  try {
    // Generate unique test user email
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@clixen.app`;
    const testPassword = 'TestPass123!';
    
    console.log('🧪 Creating fresh test user...');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    
    // Create the user
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    if (createError) {
      console.error('❌ Error creating user:', createError.message);
      return null;
    }
    
    console.log('✅ User created successfully!');
    console.log(`User ID: ${user.user.id}`);
    
    // Check available project slots
    const { data: folderAssignments, error: folderError } = await supabase
      .from('folder_assignments')
      .select('project_number, user_slot, folder_tag_name')
      .eq('status', 'available')
      .order('project_number', { ascending: true })
      .limit(1);
    
    if (folderError) {
      console.error('❌ Error checking folder assignments:', folderError.message);
      return user.user;
    }
    
    if (folderAssignments && folderAssignments.length > 0) {
      const assignment = folderAssignments[0];
      
      // Assign user to the first available folder
      const { error: assignError } = await supabase
        .from('folder_assignments')
        .update({
          user_id: user.user.id,
          assigned_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('project_number', assignment.project_number)
        .eq('user_slot', assignment.user_slot);
      
      if (assignError) {
        console.error('❌ Error assigning folder:', assignError.message);
      } else {
        console.log('✅ User assigned to project and folder!');
        const projectStr = assignment.project_number.toString().padStart(2, '0');
        console.log(`Project: CLIXEN-PROJ-${projectStr}`);
        console.log(`Folder: ${assignment.folder_tag_name}`);
      }
    } else {
      console.log('⚠️ No available folder assignments found');
    }
    
    return {
      user: user.user,
      email: testEmail,
      password: testPassword
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return null;
  }
}

createTestUser().then(result => {
  if (result) {
    console.log('\n🎯 Test User Created Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${result.email}`);
    console.log(`🔐 Password: ${result.password}`);
    console.log(`🆔 User ID: ${result.user.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 Ready for testing! Use these credentials to login.');
  }
});