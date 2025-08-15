import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSystemReadiness() {
  try {
    console.log('🔍 Checking Clixen System Readiness...\n');
    
    // 1. Check folder assignments table
    console.log('📁 FOLDER ASSIGNMENTS STATUS:');
    const { data: folderAssignments, error: folderError } = await supabase
      .from('folder_assignments')
      .select('*')
      .order('project_number', { ascending: true });
    
    if (folderError) {
      console.error('❌ Error checking folder assignments:', folderError.message);
      return;
    }
    
    const availableSlots = folderAssignments.filter(f => f.status === 'available');
    const assignedSlots = folderAssignments.filter(f => f.status === 'active');
    
    console.log(`✅ Total Folders: ${folderAssignments.length}`);
    console.log(`🟢 Available Slots: ${availableSlots.length}`);
    console.log(`🔵 Assigned Slots: ${assignedSlots.length}`);
    
    // 2. Show available slots by project
    console.log('\n📊 AVAILABLE SLOTS BY PROJECT:');
    const projectCounts = {};
    availableSlots.forEach(slot => {
      const proj = `CLIXEN-PROJ-${slot.project_number.toString().padStart(2, '0')}`;
      projectCounts[proj] = (projectCounts[proj] || 0) + 1;
    });
    
    Object.entries(projectCounts).forEach(([project, count]) => {
      console.log(`${project}: ${count} slots available`);
    });
    
    // 3. Check existing users
    console.log('\n👥 CURRENT USERS:');
    const { data: users, error: userError } = await supabase
      .from('folder_assignments')
      .select('user_id, project_number, folder_tag_name, assigned_at')
      .not('user_id', 'is', null)
      .order('assigned_at', { ascending: false });
    
    if (userError) {
      console.error('❌ Error checking users:', userError.message);
    } else {
      console.log(`📊 Active Users: ${users.length}`);
      users.forEach(user => {
        const proj = `CLIXEN-PROJ-${user.project_number.toString().padStart(2, '0')}`;
        console.log(`- User ${user.user_id.substring(0, 8)}... → ${proj} (${user.folder_tag_name})`);
      });
    }
    
    // 4. Test assignment logic simulation
    console.log('\n🧪 TESTING ASSIGNMENT LOGIC:');
    if (availableSlots.length > 0) {
      const nextSlot = availableSlots[0];
      const nextProject = `CLIXEN-PROJ-${nextSlot.project_number.toString().padStart(2, '0')}`;
      console.log(`✅ Next user would be assigned to: ${nextProject}`);
      console.log(`📁 Folder: ${nextSlot.folder_tag_name}`);
      console.log(`🎯 System is ready for new user assignment!`);
      
      return {
        ready: true,
        availableSlots: availableSlots.length,
        nextAssignment: {
          project: nextProject,
          folder: nextSlot.folder_tag_name,
          project_number: nextSlot.project_number,
          user_slot: nextSlot.user_slot
        }
      };
    } else {
      console.log('❌ No available slots for new users!');
      return {
        ready: false,
        availableSlots: 0
      };
    }
    
  } catch (error) {
    console.error('❌ System check error:', error.message);
    return { ready: false, error: error.message };
  }
}

checkSystemReadiness().then(result => {
  console.log('\n' + '='.repeat(50));
  if (result?.ready) {
    console.log('🚀 SYSTEM STATUS: READY FOR TESTING');
    console.log(`📊 Available User Slots: ${result.availableSlots}`);
    console.log(`🎯 Next Assignment: ${result.nextAssignment.project} → ${result.nextAssignment.folder}`);
  } else {
    console.log('⚠️ SYSTEM STATUS: NOT READY');
    if (result?.error) {
      console.log(`❌ Error: ${result.error}`);
    }
  }
  console.log('='.repeat(50));
});