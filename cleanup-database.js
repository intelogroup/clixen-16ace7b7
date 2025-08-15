import { Client } from 'pg';

async function cleanupDatabase() {
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.zfbgdixbzezpxllkoyfc',
    password: 'Goldyear2023#',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to Supabase database');
    
    // First, let's see current users and their project associations
    const usersQuery = await client.query(`
      SELECT au.id, au.email, au.created_at,
             fa.project_number, fa.folder_tag_name, fa.status
      FROM auth.users au
      LEFT JOIN public.folder_assignments fa ON au.id = fa.user_id
      ORDER BY au.created_at DESC
    `);
    
    console.log('\n📊 Current Users and Project Associations:');
    usersQuery.rows.forEach(row => {
      console.log(`User: ${row.email} | Project: ${row.project_number || 'NONE'} | Folder: ${row.folder_tag_name || 'NONE'} | Status: ${row.status || 'UNASSIGNED'}`);
    });
    
    // Find users without project associations
    const unassignedUsersQuery = await client.query(`
      SELECT au.id, au.email, au.created_at
      FROM auth.users au
      LEFT JOIN public.folder_assignments fa ON au.id = fa.user_id
      WHERE fa.user_id IS NULL
    `);
    
    console.log(`\n🧹 Found ${unassignedUsersQuery.rows.length} users without project assignments`);
    
    if (unassignedUsersQuery.rows.length > 0) {
      console.log('Users to be deleted:');
      unassignedUsersQuery.rows.forEach(row => {
        console.log(`- ${row.email} (created: ${row.created_at})`);
      });
      
      // Delete these users
      for (const user of unassignedUsersQuery.rows) {
        await client.query('DELETE FROM auth.users WHERE id = $1', [user.id]);
        console.log(`✅ Deleted user: ${user.email}`);
      }
    }
    
    // Show remaining users
    const remainingUsersQuery = await client.query(`
      SELECT au.id, au.email, 
             fa.project_number, fa.folder_tag_name, fa.status
      FROM auth.users au
      LEFT JOIN public.folder_assignments fa ON au.id = fa.user_id
      ORDER BY au.created_at DESC
    `);
    
    console.log(`\n✅ Remaining users (${remainingUsersQuery.rows.length}):`);
    remainingUsersQuery.rows.forEach(row => {
      console.log(`- ${row.email} | Project: ${row.project_number || 'NONE'} | Folder: ${row.folder_tag_name || 'NONE'}`);
    });
    
  } catch (error) {
    console.error('❌ Database cleanup error:', error.message);
  } finally {
    await client.end();
  }
}

cleanupDatabase();