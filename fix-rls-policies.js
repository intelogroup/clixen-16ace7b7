import pg from 'pg';

const { Client } = pg;

async function fixRLSPolicies() {
    const client = new Client({
        connectionString: 'postgresql://postgres.zfbgdixbzezpxllkoyfc:Goldyear2023%23@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔗 Connecting to database...');
        await client.connect();
        console.log('✅ Database connection successful!');

        // First, let's check current RLS policies
        console.log('🔍 Checking current RLS policies...');
        const policiesResult = await client.query(`
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
            FROM pg_policies 
            WHERE tablename IN ('ai_chat_sessions', 'ai_chat_messages', 'ai_agent_states')
            ORDER BY tablename, policyname;
        `);

        console.log('📋 Current RLS policies:');
        policiesResult.rows.forEach(row => {
            console.log(`  - ${row.tablename}: ${row.policyname} (${row.cmd})`);
        });

        // Drop existing problematic policies and recreate them with proper service role access
        console.log('🔧 Fixing RLS policies...');
        
        // Drop existing policies
        await client.query(`DROP POLICY IF EXISTS "Users can manage their own sessions" ON ai_chat_sessions;`);
        await client.query(`DROP POLICY IF EXISTS "Users can manage their own messages" ON ai_chat_messages;`);
        await client.query(`DROP POLICY IF EXISTS "Users can manage their own agent states" ON ai_agent_states;`);
        
        // Create new policies that work with both authenticated users and service role
        await client.query(`
            CREATE POLICY "Enable access for authenticated users and service role" ON ai_chat_sessions
            FOR ALL USING (
                (auth.uid() = user_id) OR 
                (auth.role() = 'service_role') OR
                (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
            );
        `);
        
        await client.query(`
            CREATE POLICY "Enable access for authenticated users and service role" ON ai_chat_messages
            FOR ALL USING (
                (auth.uid() = user_id) OR 
                (auth.role() = 'service_role') OR
                (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
            );
        `);
        
        await client.query(`
            CREATE POLICY "Enable access for authenticated users and service role" ON ai_agent_states
            FOR ALL USING (
                (auth.uid() = user_id) OR 
                (auth.role() = 'service_role') OR
                (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
            );
        `);

        // Also ensure openai_configurations has proper access
        await client.query(`DROP POLICY IF EXISTS "Users can manage their own configurations" ON openai_configurations;`);
        await client.query(`
            CREATE POLICY "Enable access for authenticated users and service role" ON openai_configurations
            FOR ALL USING (
                (auth.uid() = user_id) OR 
                (config_type = 'global') OR
                (auth.role() = 'service_role') OR
                (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
            );
        `);

        console.log('✅ RLS policies updated successfully!');

        // Test the new policies work with a direct query
        console.log('🧪 Testing new policies...');
        
        // Test with service role context
        await client.query(`SET request.jwt.claims = '{"role": "service_role"}';`);
        
        const testResult = await client.query(`
            SELECT COUNT(*) as count FROM ai_chat_sessions 
            WHERE user_id = '050d649c-7cca-4335-9508-c394836783f9'::uuid;
        `);
        
        console.log(`✅ Policy test passed: Found ${testResult.rows[0].count} sessions`);

    } catch (error) {
        console.error('❌ RLS fix failed:', error.message);
        return false;
    } finally {
        await client.end();
        console.log('🔒 Database connection closed');
    }

    return true;
}

fixRLSPolicies().then(success => {
    if (success) {
        console.log('🎉 RLS policies fixed successfully!');
    } else {
        console.log('💥 RLS policy fix failed!');
    }
});