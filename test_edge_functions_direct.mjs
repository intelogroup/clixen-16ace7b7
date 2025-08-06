#!/usr/bin/env node

/**
 * Direct Edge Function Testing Script
 * Tests edge functions with detailed error reporting
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 Direct Edge Function Testing');
console.log('='.repeat(50));
console.log('Supabase URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('Supabase Key:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('OpenAI Key:', OPENAI_API_KEY ? '✅ Set' : '❌ Missing');

/**
 * Test edge function with detailed error reporting
 */
async function testEdgeFunctionDetailed(functionName, payload = {}) {
    console.log(`\n🧪 Testing ${functionName}...`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    try {
        const startTime = Date.now();
        const { data, error } = await supabase.functions.invoke(functionName, {
            body: payload
        });
        const responseTime = Date.now() - startTime;
        
        console.log(`Response Time: ${responseTime}ms`);
        
        if (error) {
            console.log('❌ Error Details:');
            console.log('  Message:', error.message);
            console.log('  Context:', error.context || 'none');
            console.log('  Details:', JSON.stringify(error.details || {}, null, 2));
            
            // Try to extract more information from the error
            if (error.message?.includes('non-2xx')) {
                console.log('  This indicates the edge function itself is running but returned an error status');
            }
            
            return {
                success: false,
                error,
                responseTime
            };
        }
        
        console.log('✅ Success!');
        console.log('Response Data:', JSON.stringify(data, null, 2));
        
        return {
            success: true,
            data,
            responseTime
        };
        
    } catch (exception) {
        console.log('❌ Exception:', exception.message);
        console.log('Stack:', exception.stack);
        
        return {
            success: false,
            exception,
            responseTime: 0
        };
    }
}

/**
 * Test simple health check
 */
async function testHealthCheck() {
    console.log('\n📊 Testing Simple Health Check');
    console.log('-'.repeat(30));
    
    const result = await testEdgeFunctionDetailed('ai-chat-system', {
        test: 'health_check'
    });
    
    return result;
}

/**
 * Test with minimal valid agent payload
 */
async function testMinimalAgentPayload() {
    console.log('\n🤖 Testing Minimal Agent Payload');
    console.log('-'.repeat(30));
    
    const result = await testEdgeFunctionDetailed('ai-chat-system', {
        message: 'Hello',
        agent_type: 'orchestrator',
        user_id: 'test-user',
        stream: false
    });
    
    return result;
}

/**
 * Test ai-chat-sessions function
 */
async function testChatSessions() {
    console.log('\n💬 Testing Chat Sessions');
    console.log('-'.repeat(30));
    
    const result = await testEdgeFunctionDetailed('ai-chat-sessions', {
        action: 'health_check'
    });
    
    return result;
}

/**
 * Test direct HTTP request to see raw response
 */
async function testDirectHTTP() {
    console.log('\n🌐 Testing Direct HTTP Request');
    console.log('-'.repeat(30));
    
    const functionUrl = `${SUPABASE_URL}/functions/v1/ai-chat-system`;
    
    try {
        console.log('Making direct fetch to:', functionUrl);
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                test: 'direct_http'
            })
        });
        
        console.log('Status:', response.status, response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('Raw Response:', responseText);
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
            console.log('Parsed Response:', JSON.stringify(responseData, null, 2));
        } catch (parseError) {
            console.log('Response is not valid JSON');
        }
        
        return {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            rawResponse: responseText,
            parsedResponse: responseData
        };
        
    } catch (error) {
        console.log('❌ Direct HTTP Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check if functions are deployed
 */
async function checkFunctionDeployment() {
    console.log('\n🚀 Checking Function Deployment Status');
    console.log('-'.repeat(30));
    
    const functions = [
        'ai-chat-system',
        'ai-chat-sessions', 
        'ai-chat-stream',
        'api-operations'
    ];
    
    for (const functionName of functions) {
        const functionUrl = `${SUPABASE_URL}/functions/v1/${functionName}`;
        
        try {
            const response = await fetch(functionUrl, {
                method: 'OPTIONS', // Preflight request
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            
            console.log(`${functionName}: ${response.status} ${response.statusText}`);
            
            // If OPTIONS fails, try GET
            if (!response.ok) {
                const getResponse = await fetch(functionUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                });
                console.log(`  GET attempt: ${getResponse.status} ${getResponse.statusText}`);
            }
            
        } catch (error) {
            console.log(`${functionName}: ❌ ${error.message}`);
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

/**
 * Main execution
 */
async function main() {
    const results = {};
    
    // Check deployment status first
    results.deployment = await checkFunctionDeployment();
    
    // Test health check
    results.healthCheck = await testHealthCheck();
    
    // Test minimal payload
    results.minimalPayload = await testMinimalAgentPayload();
    
    // Test chat sessions
    results.chatSessions = await testChatSessions();
    
    // Test direct HTTP
    results.directHTTP = await testDirectHTTP();
    
    // Summary
    console.log('\n📋 SUMMARY');
    console.log('='.repeat(50));
    
    const successCount = Object.values(results).filter(r => r?.success).length;
    const totalCount = Object.values(results).filter(r => r !== undefined).length;
    
    console.log(`Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = `edge_function_test_${timestamp}.json`;
    
    await import('fs').then(fs => {
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`Detailed results saved to: ${resultsFile}`);
    });
    
    // Recommendations
    console.log('\n💡 NEXT STEPS:');
    if (successCount === 0) {
        console.log('  🚨 All functions failed - check deployment and configuration');
        console.log('  • Verify Supabase project is active');
        console.log('  • Check if functions are properly deployed');
        console.log('  • Verify API keys and permissions');
    } else if (successCount < totalCount) {
        console.log('  ⚠️  Some functions working - investigate individual failures');
    } else {
        console.log('  ✅ All functions responding - original issue may be payload-specific');
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}