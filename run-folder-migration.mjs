import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

async function runFolderMigration() {
  try {
    console.log('🚀 RUNNING FOLDER ASSIGNMENT MIGRATION');
    console.log('='.repeat(45));
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Read the migration SQL file
    console.log('\n📖 Reading migration file...');
    const migrationSQL = readFileSync('create-folder-system-migration.sql', 'utf8');
    
    // Split into individual statements (simple approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.trim().length === 0) continue;
      
      try {
        console.log(`\n⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        // Use the direct SQL execution approach
        const { error } = await supabase.rpc('exec', { sql: stmt });
        
        if (error) {
          console.log(`❌ Statement ${i + 1} failed:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1} successful`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Statement ${i + 1} error:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(45));
    console.log('📊 MIGRATION RESULTS');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    
    // Test the system
    console.log('\n🧪 TESTING FOLDER ASSIGNMENT SYSTEM...');
    
    // Test table existence
    const { data: testData, error: testError } = await supabase
      .from('folder_assignments')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('❌ Table test failed:', testError.message);
      
      // Try alternative approach - create the system via individual operations
      console.log('\n🔧 Attempting alternative setup...');
      await setupFolderSystemAlternative(supabase);
      
    } else {
      console.log('✅ Table accessible via Supabase client');
      
      // Test function
      const { data: funcTest, error: funcError } = await supabase.rpc('get_folder_assignment_stats');
      
      if (funcError) {
        console.log('❌ Function test failed:', funcError.message);
      } else {
        console.log('✅ Functions working correctly');
        console.log('📊 System stats:', funcTest);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
}

async function setupFolderSystemAlternative(supabase) {
  try {
    console.log('🔄 Setting up folder system via alternative method...');
    
    // Method 1: Direct table creation via schema manipulation
    console.log('   Creating table via direct SQL...');
    
    // Create a minimal migration first
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.folder_assignments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID,
        project_number INTEGER NOT NULL,
        user_slot INTEGER NOT NULL,
        folder_tag_name TEXT NOT NULL,
        assigned_at TIMESTAMPTZ DEFAULT now(),
        status TEXT DEFAULT 'available',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(project_number, user_slot)
      );
    `;
    
    // Try via edge function approach
    const { data: createResult, error: createError } = await supabase.functions.invoke('workflows-api', {
      body: { action: 'create_folder_table', sql: createTableSQL }
    });
    
    if (createError) {
      console.log('   ❌ Edge function approach failed:', createError.message);
      
      // Method 2: Create via batch insert (if table exists)
      console.log('   Trying batch insert approach...');
      
      const sampleFolder = {
        project_number: 1,
        user_slot: 1,
        folder_tag_name: 'FOLDER-P01-U1',
        status: 'available'
      };
      
      const { data: insertResult, error: insertError } = await supabase
        .from('folder_assignments')
        .insert([sampleFolder]);
      
      if (insertError) {
        console.log('   ❌ Insert approach failed:', insertError.message);
        console.log('   ⚠️ Manual migration required');
        return false;
      } else {
        console.log('   ✅ Table exists, populating data...');
        await populateFoldersViaInsert(supabase);
        return true;
      }
    } else {
      console.log('   ✅ Table created successfully');
      return true;
    }
    
  } catch (error) {
    console.error('   ❌ Alternative setup error:', error.message);
    return false;
  }
}

async function populateFoldersViaInsert(supabase) {
  console.log('   📊 Populating 50 folder assignments...');
  
  const folders = [];
  for (let project = 1; project <= 10; project++) {
    for (let user = 1; user <= 5; user++) {
      folders.push({
        project_number: project,
        user_slot: user,
        folder_tag_name: `FOLDER-P${project.toString().padStart(2, '0')}-U${user}`,
        status: 'available'
      });
    }
  }
  
  // Insert in batches of 10
  for (let i = 0; i < folders.length; i += 10) {
    const batch = folders.slice(i, i + 10);
    const { error } = await supabase
      .from('folder_assignments')
      .upsert(batch, { onConflict: 'project_number,user_slot' });
    
    if (error) {
      console.log(`   ❌ Batch ${Math.floor(i/10) + 1} failed:`, error.message);
    } else {
      console.log(`   ✅ Batch ${Math.floor(i/10) + 1}/${Math.ceil(folders.length/10)} inserted`);
    }
  }
}

runFolderMigration();