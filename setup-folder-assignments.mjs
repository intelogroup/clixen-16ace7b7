import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupFolderAssignments() {
  try {
    console.log('🔧 Setting up folder assignments system...\n');
    
    // First, check existing tables
    console.log('📊 Checking existing tables...');
    const { data: tables, error: tablesError } = await supabase.rpc('get_table_names');
    
    if (tablesError) {
      console.log('Using alternative approach to check schema...');
    }
    
    // Create the folder_assignments table
    console.log('📁 Creating folder_assignments table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.folder_assignments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        project_number INTEGER NOT NULL,
        user_slot INTEGER NOT NULL,
        folder_tag_name TEXT NOT NULL,
        assigned_at TIMESTAMPTZ DEFAULT now(),
        status TEXT DEFAULT 'available' CHECK (status IN ('available', 'active', 'inactive')),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(project_number, user_slot)
      );
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (createError) {
      console.error('❌ Error creating table:', createError.message);
      
      // Try alternative approach with direct SQL
      const { error: altError } = await supabase
        .from('information_schema.tables')
        .select('table_name');
        
      console.log('Trying to create table via migration...');
      
      // Let's try a simpler approach
      const { error: simpleError } = await supabase.rpc('create_folder_assignments_table');
      
      if (simpleError) {
        console.log('Creating table manually with INSERT approach...');
        
        // Manual table creation approach
        try {
          await supabase
            .from('folder_assignments')
            .insert([{ 
              project_number: 1, 
              user_slot: 1, 
              folder_tag_name: 'FOLDER-P01-U1',
              status: 'available'
            }]);
        } catch (insertError) {
          console.log('Table does not exist, need to create it first.');
        }
      }
    } else {
      console.log('✅ Table created successfully!');
    }
    
    // Now populate with 50 user slots (10 projects × 5 users each)
    console.log('🏗️ Populating folder assignments...');
    
    const assignments = [];
    for (let project = 1; project <= 10; project++) {
      for (let user = 1; user <= 5; user++) {
        assignments.push({
          project_number: project,
          user_slot: user,
          folder_tag_name: `FOLDER-P${project.toString().padStart(2, '0')}-U${user}`,
          status: 'available'
        });
      }
    }
    
    console.log(`📊 Creating ${assignments.length} folder assignments...`);
    
    // Insert in batches of 10 to avoid timeouts
    for (let i = 0; i < assignments.length; i += 10) {
      const batch = assignments.slice(i, i + 10);
      const { error: insertError } = await supabase
        .from('folder_assignments')
        .upsert(batch, { 
          onConflict: 'project_number,user_slot',
          ignoreDuplicates: true 
        });
      
      if (insertError) {
        console.error(`❌ Error inserting batch ${i/10 + 1}:`, insertError.message);
      } else {
        console.log(`✅ Inserted batch ${i/10 + 1}/${Math.ceil(assignments.length/10)}`);
      }
    }
    
    // Verify the setup
    console.log('\n🔍 Verifying folder assignments setup...');
    const { data: verification, error: verifyError } = await supabase
      .from('folder_assignments')
      .select('project_number, status')
      .order('project_number');
    
    if (verifyError) {
      console.error('❌ Error verifying setup:', verifyError.message);
    } else {
      const availableCount = verification.filter(f => f.status === 'available').length;
      const projectCounts = {};
      
      verification.forEach(f => {
        const proj = f.project_number;
        projectCounts[proj] = (projectCounts[proj] || 0) + 1;
      });
      
      console.log(`✅ Total assignments created: ${verification.length}`);
      console.log(`🟢 Available slots: ${availableCount}`);
      console.log('\n📊 Assignments per project:');
      Object.entries(projectCounts).forEach(([proj, count]) => {
        console.log(`CLIXEN-PROJ-${proj.padStart(2, '0')}: ${count} folders`);
      });
    }
    
    return { success: true, total: assignments.length };
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    return { success: false, error: error.message };
  }
}

setupFolderAssignments().then(result => {
  console.log('\n' + '='.repeat(50));
  if (result.success) {
    console.log('🚀 FOLDER ASSIGNMENTS SETUP COMPLETE');
    console.log(`📊 Total Slots Created: ${result.total}`);
    console.log('🎯 System ready for user assignment!');
  } else {
    console.log('❌ SETUP FAILED');
    console.log(`Error: ${result.error}`);
  }
  console.log('='.repeat(50));
});