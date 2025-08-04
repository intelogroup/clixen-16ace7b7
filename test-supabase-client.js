import { createClient } from '@supabase/supabase-js';

async function testSupabaseClient() {
    // Create client with same config as the app
    const supabase = createClient(
        'https://zfbgdixbzezpxllkoyfc.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw',
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    );

    try {
        console.log('🔐 Testing authentication...');
        
        // First authenticate as the test user
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'jayveedz19@gmail.com',
            password: 'Goldyear2023#'
        });

        if (authError) {
            console.error('❌ Authentication failed:', authError.message);
            return false;
        }

        console.log('✅ Authentication successful');
        console.log('👤 User ID:', authData.user?.id);

        // Now test database access with authenticated session
        console.log('🧪 Testing database access...');
        
        const { data: testData, error: testError } = await supabase
            .from('ai_chat_sessions')
            .select('id')
            .eq('user_id', authData.user?.id || 'test')
            .limit(1);

        if (testError) {
            console.error('❌ Database test failed:', testError.message);
            return false;
        }

        console.log('✅ Database access successful');
        console.log('📊 Found sessions:', testData?.length || 0);

        // Test creating a session using RPC
        console.log('🚀 Testing session creation...');
        
        const { data: sessionData, error: sessionError } = await supabase.rpc('create_chat_session', {
            p_user_id: authData.user?.id,
            p_title: 'Test Session from Client'
        });

        if (sessionError) {
            console.error('❌ Session creation failed:', sessionError.message);
            console.error('Error details:', sessionError);
            return false;
        }

        console.log('✅ Session creation successful');
        console.log('📝 Session data:', sessionData);

        // Test the testDatabaseConnection equivalent (with fixed syntax)
        console.log('🔍 Testing database connection (like frontend does)...');
        
        const { data: connTestData, error: connTestError } = await supabase
            .from('ai_chat_sessions')
            .select('id')
            .eq('user_id', authData.user?.id)
            .limit(1);

        if (connTestError) {
            console.error('❌ Connection test failed:', connTestError.message);
            return false;
        }

        // Test count
        const { count, error: countError } = await supabase
            .from('ai_chat_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authData.user?.id);

        console.log('✅ Connection test passed');
        console.log('📈 Session count:', count || 0);

        return true;

    } catch (error) {
        console.error('💥 Test failed with exception:', error.message);
        return false;
    }
}

testSupabaseClient().then(success => {
    if (success) {
        console.log('🎉 Supabase client test PASSED! Frontend should work now.');
    } else {
        console.log('💥 Supabase client test FAILED! There\'s still an issue to fix.');
    }
});