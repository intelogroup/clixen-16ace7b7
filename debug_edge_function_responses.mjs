#!/usr/bin/env node

/**
 * Debug Edge Function Response Bodies
 * Captures actual error responses to understand what's failing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

console.log('🔍 Debug Edge Function Response Bodies');
console.log('='.repeat(50));
console.log('Environment Check:');
console.log('SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('VITE_OPENAI_API_KEY:', OPENAI_API_KEY ? '✅ Set' : '❌ Missing');

/**
 * Direct HTTP request to get raw error response
 */
async function getDetailedErrorResponse(functionName, payload) {
    const functionUrl = `${SUPABASE_URL}/functions/v1/${functionName}`;
    
    console.log(`\n🌐 Direct HTTP Test: ${functionName}`);
    console.log('URL:', functionUrl);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('Status:', response.status, response.statusText);
        console.log('Headers:', Object.fromEntries([...response.headers.entries()].slice(0, 5)));
        
        const responseText = await response.text();
        console.log('Raw Response Length:', responseText.length);
        console.log('Raw Response (first 500 chars):', responseText.substring(0, 500));
        
        let parsedResponse = null;
        try {
            parsedResponse = JSON.parse(responseText);
            console.log('Parsed Response:', JSON.stringify(parsedResponse, null, 2));
        } catch (parseError) {
            console.log('❌ Response is not valid JSON:', parseError.message);
        }
        
        return {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            rawResponse: responseText,
            parsedResponse,
            success: response.ok
        };
        
    } catch (error) {
        console.log('❌ Fetch Error:', error.message);
        return {
            error: error.message,
            success: false
        };
    }
}

/**
 * Test with minimal valid payload to see what happens
 */
async function testMinimalValidPayload() {
    console.log('\n🧪 Testing Minimal Valid Payload');
    console.log('-'.repeat(50));
    
    const payload = {
        message: "Hello, test message",
        user_id: "debug-user-" + Date.now()
    };
    
    return await getDetailedErrorResponse('ai-chat-system', payload);
}

/**
 * Test with orchestrator agent specification
 */
async function testOrchestratorAgent() {
    console.log('\n🤖 Testing Orchestrator Agent');
    console.log('-'.repeat(50));
    
    const payload = {
        message: "I need help creating a workflow",
        user_id: "debug-orchestrator-" + Date.now(),
        agent_type: "orchestrator",
        stream: false
    };
    
    return await getDetailedErrorResponse('ai-chat-system', payload);
}

/**
 * Check if database tables exist
 */
async function checkDatabaseTables() {
    console.log('\n🗄️ Checking Database Tables');
    console.log('-'.repeat(50));
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const tablesToCheck = [
        'ai_chat_sessions',
        'ai_chat_messages', 
        'ai_agent_states',
        'api_keys',
        'api_configurations'
    ];
    
    const results = {};
    
    for (const table of tablesToCheck) {
        try {
            console.log(`Checking table: ${table}`);
            
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (error) {
                console.log(`  ❌ Error accessing ${table}: ${error.message}`);
                results[table] = {
                    exists: false,
                    error: error.message,
                    code: error.code
                };
            } else {
                console.log(`  ✅ ${table}: Accessible`);
                results[table] = {
                    exists: true,
                    recordCount: data?.length || 0
                };
            }
        } catch (error) {
            console.log(`  ❌ Exception checking ${table}: ${error.message}`);
            results[table] = {
                exists: false,
                exception: error.message
            };
        }
    }
    
    return results;
}

/**
 * Test API key retrieval simulation
 */
async function testAPIKeyAccess() {
    console.log('\n🔑 Testing API Key Access');
    console.log('-'.repeat(50));
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const testUserId = 'debug-api-test-' + Date.now();
    
    console.log('Testing user-specific OpenAI key retrieval...');
    try {
        const { data, error } = await supabase
            .from('api_keys')
            .select('openai_api_key')
            .eq('user_id', testUserId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('  ⚠️ No user-specific key found (expected for test user)');
            } else {
                console.log(`  ❌ Error: ${error.message} (Code: ${error.code})`);
            }
        } else {
            console.log('  ✅ User key query successful');
        }
    } catch (error) {
        console.log(`  ❌ Exception: ${error.message}`);
    }
    
    console.log('\nTesting system API configuration table...');
    try {
        const { data, error } = await supabase
            .from('api_configurations')
            .select('service_name, is_active')
            .eq('service_name', 'openai')
            .eq('is_active', true);
        
        if (error) {
            console.log(`  ❌ Error: ${error.message} (Code: ${error.code})`);
        } else {
            console.log(`  ✅ API configuration query successful, found ${data?.length || 0} configs`);
        }
    } catch (error) {
        console.log(`  ❌ Exception: ${error.message}`);
    }
}

/**
 * Test with different function
 */
async function testChatSessionsFunction() {
    console.log('\n💬 Testing ai-chat-sessions Function');
    console.log('-'.repeat(50));
    
    const payload = {
        action: "get_sessions",
        user_id: "debug-user-" + Date.now()
    };
    
    return await getDetailedErrorResponse('ai-chat-sessions', payload);
}

/**
 * Main execution
 */
async function main() {
    const results = {
        timestamp: new Date().toISOString(),
        environment: {
            supabase_url: SUPABASE_URL,
            has_supabase_key: !!SUPABASE_ANON_KEY,
            has_openai_key: !!OPENAI_API_KEY
        }
    };
    
    try {
        // Check database tables first
        results.database_tables = await checkDatabaseTables();
        
        // Test API key access
        results.api_key_access = await testAPIKeyAccess();
        
        // Test with minimal payload
        results.minimal_payload = await testMinimalValidPayload();
        
        // Test orchestrator agent
        results.orchestrator_agent = await testOrchestratorAgent();
        
        // Test chat sessions function
        results.chat_sessions = await testChatSessionsFunction();
        
        // Summary analysis
        console.log('\n📋 ANALYSIS SUMMARY');
        console.log('='.repeat(50));
        
        // Environment analysis
        const envIssues = [];
        if (!SUPABASE_URL) envIssues.push('Missing SUPABASE_URL');
        if (!SUPABASE_ANON_KEY) envIssues.push('Missing SUPABASE_ANON_KEY');
        if (!OPENAI_API_KEY) envIssues.push('Missing OPENAI_API_KEY');
        
        if (envIssues.length > 0) {
            console.log('🚨 Environment Issues:', envIssues.join(', '));
        } else {
            console.log('✅ Environment: All required variables present');
        }
        
        // Database analysis
        const tableIssues = Object.entries(results.database_tables)
            .filter(([table, result]) => !result.exists)
            .map(([table, result]) => table);
        
        if (tableIssues.length > 0) {
            console.log('🚨 Database Issues: Missing tables:', tableIssues.join(', '));
        } else {
            console.log('✅ Database: All required tables accessible');
        }
        
        // Function response analysis
        const responseStatuses = [
            results.minimal_payload?.status,
            results.orchestrator_agent?.status,
            results.chat_sessions?.status
        ].filter(s => s);
        
        console.log('📡 Function Response Codes:', responseStatuses.join(', '));
        
        // Look for specific errors
        if (results.minimal_payload?.parsedResponse?.error) {
            console.log('🔍 AI Chat System Error:', results.minimal_payload.parsedResponse.error);
        }
        
        if (results.chat_sessions?.parsedResponse?.error) {
            console.log('🔍 Chat Sessions Error:', results.chat_sessions.parsedResponse.error);
        }
        
        // Save detailed results
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = `debug_responses_${timestamp}.json`;
        
        await import('fs').then(fs => {
            fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
            console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
        });
        
        // Recommendations
        console.log('\n💡 NEXT STEPS:');
        
        if (envIssues.length > 0) {
            console.log('1. 🔧 Fix environment configuration issues first');
            envIssues.forEach(issue => console.log(`   • ${issue}`));
        }
        
        if (tableIssues.length > 0) {
            console.log('2. 🗄️ Create missing database tables');
            tableIssues.forEach(table => console.log(`   • ${table}`));
        }
        
        if (responseStatuses.includes(500)) {
            console.log('3. 🚨 Investigate 500 Internal Server Errors in edge functions');
            console.log('   • Check edge function logs in Supabase dashboard');
            console.log('   • Verify OpenAI API key configuration');
            console.log('   • Check database connectivity from edge functions');
        }
        
        if (responseStatuses.includes(400)) {
            console.log('4. 📝 Review input validation and payload format');
        }
        
    } catch (error) {
        console.error('❌ Debug execution failed:', error);
        results.fatal_error = {
            message: error.message,
            stack: error.stack
        };
    }
    
    return results;
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

export default main;