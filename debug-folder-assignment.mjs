import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const userId = '050d649c-7cca-4335-9508-c394836783f9';

async function debugFolderAssignment() {
  try {
    console.log('🔍 DEBUGGING FOLDER ASSIGNMENT');
    console.log('='.repeat(40));
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // 1. Check if table exists and has data
    console.log('\n1. 📊 Checking folder_assignments table...');
    const { data: tableData, error: tableError } = await supabase
      .from('folder_assignments')
      .select('*')
      .limit(5);
    
    if (tableError) {
      console.error('❌ Table error:', tableError.message);
    } else {
      console.log(`✅ Table exists with ${tableData.length} sample records`);
      if (tableData.length > 0) {
        console.log('   Sample record:', tableData[0]);
      }
    }
    
    // 2. Check available folders
    console.log('\n2. 🟢 Checking available folders...');
    const { data: availableFolders, error: availableError } = await supabase
      .from('folder_assignments')
      .select('*')
      .eq('status', 'available')
      .is('user_id', null)
      .limit(3);
    
    if (availableError) {
      console.error('❌ Available folders error:', availableError.message);
    } else {
      console.log(`✅ Found ${availableFolders.length} available folders`);
      availableFolders.forEach(folder => {
        console.log(`   • ${folder.folder_tag_name} (Project ${folder.project_number}, Slot ${folder.user_slot})`);
      });
    }
    
    // 3. Test the function directly with manual SQL
    console.log('\n3. 🧪 Testing assignment function manually...');
    
    // Try the assignment via direct function call
    const { data: assignmentResult, error: assignmentError } = await supabase.rpc('assign_user_to_next_available_folder', {
      target_user_id: userId
    });
    
    if (assignmentError) {
      console.error('❌ Assignment function error:', assignmentError.message);
    } else {
      console.log('✅ Assignment function result:', assignmentResult);
    }
    
    // 4. Check current user assignments
    console.log('\n4. 👤 Checking current user assignments...');
    const { data: userAssignments, error: userError } = await supabase
      .from('folder_assignments')
      .select('*')
      .eq('user_id', userId);
    
    if (userError) {
      console.error('❌ User assignments error:', userError.message);
    } else {
      console.log(`✅ User has ${userAssignments.length} assignments`);
      userAssignments.forEach(assignment => {
        console.log(`   • ${assignment.folder_tag_name} (Status: ${assignment.status})`);
      });
    }
    
    // 5. Get system stats
    console.log('\n5. 📈 Getting system statistics...');
    const { data: stats, error: statsError } = await supabase.rpc('get_folder_assignment_stats');
    
    if (statsError) {
      console.error('❌ Stats error:', statsError.message);
    } else {
      console.log('✅ System stats:', stats);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugFolderAssignment();