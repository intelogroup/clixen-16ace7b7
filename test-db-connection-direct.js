import pg from 'pg';

const { Client } = pg;

async function testDatabaseConnection() {
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

        // Test if the required tables exist
        console.log('📋 Checking required tables...');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('ai_chat_sessions', 'ai_chat_messages', 'ai_agent_states', 'openai_configurations')
            ORDER BY table_name;
        `);

        console.log('📊 Found tables:');
        tablesResult.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });

        // Test if the stored functions exist
        console.log('🔧 Checking stored functions...');
        const functionsResult = await client.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN ('create_chat_session', 'get_conversation_history', 'process_multi_agent_chat')
            ORDER BY routine_name;
        `);

        console.log('🔧 Found functions:');
        functionsResult.rows.forEach(row => {
            console.log(`  ✅ ${row.routine_name}()`);
        });

        // Test a simple query to the ai_chat_sessions table
        console.log('🧪 Testing table access...');
        const testQuery = await client.query(`
            SELECT COUNT(*) as session_count 
            FROM ai_chat_sessions 
            WHERE user_id = '050d649c-7cca-4335-9508-c394836783f9'::uuid;
        `);
        
        console.log(`🎯 Found ${testQuery.rows[0].session_count} sessions for test user`);

        // Test creating a simple session to verify the function works
        console.log('🚀 Testing session creation function...');
        try {
            const sessionResult = await client.query(`
                SELECT * FROM create_chat_session(
                    '050d649c-7cca-4335-9508-c394836783f9'::uuid,
                    'Test Connection Session'
                );
            `);
            console.log('✅ Session creation successful:', sessionResult.rows[0]);
        } catch (sessionError) {
            console.log('⚠️  Session creation test:', sessionError.message);
        }

    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        return false;
    } finally {
        await client.end();
        console.log('🔒 Database connection closed');
    }

    return true;
}

testDatabaseConnection().then(success => {
    if (success) {
        console.log('🎉 Database connection test PASSED!');
    } else {
        console.log('💥 Database connection test FAILED!');
    }
});