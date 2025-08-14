const { createClient } = require('@supabase/supabase-js');

async function createWorkspaceTables() {
  const supabase = createClient(
    'https://zfbgdixbzezpxllkoyfc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig'
  );
  
  console.log('🚀 Creating workspace tables...');
  
  // Create user_workspaces table
  const workspaceTableSQL = `
    CREATE TABLE IF NOT EXISTS user_workspaces (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      workspace_name TEXT NOT NULL UNIQUE,
      workspace_id TEXT NOT NULL UNIQUE,
      n8n_prefix TEXT NOT NULL UNIQUE,
      project_count INTEGER DEFAULT 0,
      quota JSONB DEFAULT '{"max_workflows": 50, "max_executions": 1000, "storage_mb": 100, "max_projects": 10}'::jsonb,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_active TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  
  const { error: wsError } = await supabase.rpc('exec_sql', { sql: workspaceTableSQL });
  if (wsError) {
    console.error('❌ Error creating user_workspaces:', wsError);
    return;
  }
  console.log('✅ user_workspaces table created');
  
  // Create workspace_activity table
  const activityTableSQL = `
    CREATE TABLE IF NOT EXISTS workspace_activity (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      workspace_id UUID NOT NULL,
      user_id UUID NOT NULL,
      activity_type TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  
  const { error: actError } = await supabase.rpc('exec_sql', { sql: activityTableSQL });
  if (actError) {
    console.error('❌ Error creating workspace_activity:', actError);
    return;
  }
  console.log('✅ workspace_activity table created');
  
  // Create indexes
  const indexSQL = `
    CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_id ON user_workspaces(user_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_activity_workspace_id ON workspace_activity(workspace_id);
  `;
  
  const { error: idxError } = await supabase.rpc('exec_sql', { sql: indexSQL });
  if (idxError) {
    console.warn('⚠️ Warning creating indexes:', idxError);
  } else {
    console.log('✅ Indexes created');
  }
  
  // Create workspace for existing users
  console.log('👤 Creating workspaces for existing users...');
  
  const { data: users } = await supabase.auth.admin.listUsers();
  if (users && users.users.length > 0) {
    for (const user of users.users) {
      const username = user.email.split('@')[0].toLowerCase();
      const workspaceName = `${username} Workspace`;
      const workspaceId = `${username}-workspace-${user.id.substring(0, 8)}`;
      const n8nPrefix = `[USR-${user.id.substring(0, 8)}]`;
      
      const { data: existing } = await supabase
        .from('user_workspaces')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!existing) {
        const { error: insertError } = await supabase
          .from('user_workspaces')
          .insert({
            user_id: user.id,
            workspace_name: workspaceName,
            workspace_id: workspaceId,
            n8n_prefix: n8nPrefix,
            metadata: {
              created_from_email: user.email,
              auto_provisioned: true,
              creation_method: 'migration',
              migrated_at: new Date().toISOString()
            }
          });
        
        if (insertError) {
          console.error(`❌ Error creating workspace for ${user.email}:`, insertError);
        } else {
          console.log(`✅ Created workspace for ${user.email}`);
        }
      } else {
        console.log(`📦 Workspace already exists for ${user.email}`);
      }
    }
  }
  
  // Check final state
  const { data: workspaces, count } = await supabase
    .from('user_workspaces')
    .select('*', { count: 'exact' });
  
  console.log(`🎯 Final state: ${count} workspaces created`);
  workspaces?.forEach(ws => {
    console.log(`  - ${ws.workspace_name} (${ws.n8n_prefix})`);
  });
}

createWorkspaceTables().catch(console.error);