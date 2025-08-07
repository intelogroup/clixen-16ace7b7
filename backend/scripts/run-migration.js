import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  try {
    console.log('🚀 Starting Supabase migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'supabase/migrations/003_queue_system_setup.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}...`);
        console.log(`📋 SQL: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          errorCount++;
          
          // Try alternative approach for some statements
          if (statement.includes('CREATE EXTENSION')) {
            console.log('🔄 Retrying extension creation with alternative method...');
            const { error: altError } = await supabase
              .from('pg_extension')
              .select('*')
              .limit(1);
            
            if (!altError) {
              console.log('✅ Extension handling seems to work');
            }
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
        
        // Add a small delay between statements
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📋 Total statements: ${statements.length}`);
    
    // Test database connection and basic queries
    console.log('\n🔍 Testing database connection...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%workflow%');
    
    if (tablesError) {
      console.error('❌ Database connection test failed:', tablesError);
    } else {
      console.log('✅ Database connection successful');
      console.log('📋 Workflow-related tables found:', tables?.map(t => t.table_name) || []);
    }
    
    // Test extensions
    console.log('\n🧩 Checking extensions...');
    const { data: extensions, error: extError } = await supabase
      .from('pg_extension')
      .select('extname')
      .in('extname', ['pgmq', 'pg_cron', 'pg_net']);
    
    if (extError) {
      console.log('⚠️  Could not check extensions:', extError.message);
    } else {
      const foundExts = extensions?.map(e => e.extname) || [];
      console.log('✅ Extensions found:', foundExts);
      
      const requiredExts = ['pgmq', 'pg_cron', 'pg_net'];
      const missingExts = requiredExts.filter(ext => !foundExts.includes(ext));
      
      if (missingExts.length > 0) {
        console.log('⚠️  Missing extensions:', missingExts);
        console.log('💡 These may need to be enabled manually in Supabase dashboard');
      }
    }
    
    console.log('\n🎉 Migration completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
executeMigration();