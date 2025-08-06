#!/usr/bin/env node

/**
 * Multi-Agent System Debugging Script
 * Tests agent coordination, communication, and edge function integration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables');
    console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.error('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    process.exit(1);
}

// Create Supabase clients
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔧 Multi-Agent System Debugging Started');
console.log('='.repeat(50));

/**
 * Test 1: Edge Function Availability and Response
 */
async function testEdgeFunctionAvailability() {
    console.log('\n📡 Test 1: Edge Function Availability');
    console.log('-'.repeat(30));
    
    const testFunctions = [
        'ai-chat-system',
        'ai-chat-sessions',
        'ai-chat-stream',
        'api-operations'
    ];
    
    const results = {};
    
    for (const functionName of testFunctions) {
        try {
            console.log(`Testing ${functionName}...`);
            
            // Test with simple health check payload
            const { data, error } = await supabaseAnon.functions.invoke(functionName, {
                body: {
                    action: 'health_check',
                    timestamp: Date.now()
                }
            });
            
            if (error) {
                results[functionName] = {
                    status: '❌ ERROR',
                    error: error.message,
                    details: error
                };
                console.log(`  ❌ ${functionName}: ${error.message}`);
            } else {
                results[functionName] = {
                    status: '✅ AVAILABLE',
                    data: data,
                    responseTime: Date.now()
                };
                console.log(`  ✅ ${functionName}: Available`);
            }
        } catch (err) {
            results[functionName] = {
                status: '❌ EXCEPTION',
                error: err.message,
                stack: err.stack
            };
            console.log(`  ❌ ${functionName}: Exception - ${err.message}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
}

/**
 * Test 2: Agent AI Processing via Edge Functions
 */
async function testAgentAIProcessing() {
    console.log('\n🤖 Test 2: Agent AI Processing');
    console.log('-'.repeat(30));
    
    const testCases = [
        {
            name: 'Orchestrator Agent',
            agent_type: 'orchestrator',
            message: 'Hello, I want to create a workflow that sends an email notification when someone fills out a form.',
            expected_keywords: ['workflow', 'email', 'form', 'automation']
        },
        {
            name: 'Workflow Designer Agent',
            agent_type: 'workflow-designer',
            message: 'Design a workflow with webhook trigger and email action',
            expected_keywords: ['webhook', 'trigger', 'email', 'action', 'n8n']
        },
        {
            name: 'Deployment Agent',
            agent_type: 'deployment',
            message: 'Deploy the workflow to n8n instance',
            expected_keywords: ['deploy', 'n8n', 'workflow', 'activate']
        }
    ];
    
    const results = {};
    
    for (const testCase of testCases) {
        try {
            console.log(`Testing ${testCase.name}...`);
            
            const startTime = Date.now();
            const { data, error } = await supabaseAnon.functions.invoke('ai-chat-system', {
                body: {
                    message: testCase.message,
                    agent_type: testCase.agent_type,
                    user_id: 'test-user-' + Date.now(),
                    stream: false,
                    test_mode: true
                }
            });
            
            const responseTime = Date.now() - startTime;
            
            if (error) {
                results[testCase.name] = {
                    status: '❌ ERROR',
                    error: error.message,
                    responseTime,
                    testCase
                };
                console.log(`  ❌ ${testCase.name}: ${error.message}`);
                continue;
            }
            
            // Analyze response
            const response = data?.response || '';
            const hasExpectedKeywords = testCase.expected_keywords.some(keyword => 
                response.toLowerCase().includes(keyword.toLowerCase())
            );
            
            const analysis = {
                hasResponse: !!response,
                responseLength: response.length,
                hasExpectedKeywords,
                keywords_found: testCase.expected_keywords.filter(keyword => 
                    response.toLowerCase().includes(keyword.toLowerCase())
                ),
                agent_type_match: data?.agent_type === testCase.agent_type,
                tokens_used: data?.tokens_used || 0,
                processing_time: data?.processing_time || responseTime
            };
            
            results[testCase.name] = {
                status: hasExpectedKeywords ? '✅ PASS' : '⚠️  PARTIAL',
                responseTime,
                analysis,
                response: response.substring(0, 200) + '...',
                data
            };
            
            console.log(`  ${hasExpectedKeywords ? '✅' : '⚠️'} ${testCase.name}: ${responseTime}ms - ${response.length} chars`);
            console.log(`    Keywords found: ${analysis.keywords_found.join(', ') || 'none'}`);
            
        } catch (err) {
            results[testCase.name] = {
                status: '❌ EXCEPTION',
                error: err.message,
                stack: err.stack,
                testCase
            };
            console.log(`  ❌ ${testCase.name}: Exception - ${err.message}`);
        }
        
        // Delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
}

/**
 * Test 3: Agent Coordination Flow
 */
async function testAgentCoordination() {
    console.log('\n🔄 Test 3: Agent Coordination Flow');
    console.log('-'.repeat(30));
    
    const results = {};
    
    try {
        console.log('Testing natural conversation flow...');
        
        // Simulate the agent coordination workflow
        const conversationSteps = [
            {
                step: 'greeting',
                message: 'Hello, I need help creating a workflow',
                expected_mode: 'greeting'
            },
            {
                step: 'scoping',
                message: 'I want to send Slack notifications when new Google Form responses are submitted',
                expected_mode: 'scoping'
            },
            {
                step: 'validation',
                message: 'The trigger should be a webhook from Google Forms, and it should post to our #alerts channel in Slack',
                expected_mode: 'validating'
            }
        ];
        
        let conversation_context = [];
        
        for (const step of conversationSteps) {
            console.log(`  Testing ${step.step} phase...`);
            
            const startTime = Date.now();
            
            // Test the orchestrator agent's natural conversation handling
            const { data, error } = await supabaseAnon.functions.invoke('ai-chat-system', {
                body: {
                    message: step.message,
                    agent_type: 'orchestrator',
                    user_id: 'test-coordination-user',
                    conversation_context,
                    action: 'handle_natural_conversation',
                    stream: false
                }
            });
            
            const responseTime = Date.now() - startTime;
            
            if (error) {
                results[step.step] = {
                    status: '❌ ERROR',
                    error: error.message,
                    responseTime
                };
                console.log(`    ❌ ${step.step}: ${error.message}`);
                break;
            }
            
            // Add to conversation context for next step
            conversation_context.push(
                { role: 'user', content: step.message, timestamp: Date.now() },
                { role: 'assistant', content: data.response || '', timestamp: Date.now() }
            );
            
            const analysis = {
                hasResponse: !!(data?.response),
                responseLength: (data?.response || '').length,
                mode_detected: data?.mode || 'unknown',
                mode_correct: data?.mode === step.expected_mode,
                needs_more_info: data?.needsMoreInfo,
                can_proceed: data?.canProceed,
                questions_provided: Array.isArray(data?.questions) && data.questions.length > 0,
                scope_status: data?.scopeStatus
            };
            
            results[step.step] = {
                status: analysis.mode_correct ? '✅ PASS' : '⚠️ PARTIAL',
                responseTime,
                analysis,
                response: (data?.response || '').substring(0, 150) + '...',
                data
            };
            
            console.log(`    ${analysis.mode_correct ? '✅' : '⚠️'} ${step.step}: Mode=${data?.mode} (${responseTime}ms)`);
            
            // Delay between conversation steps
            await new Promise(resolve => setTimeout(resolve, 800));
        }
        
    } catch (err) {
        results.coordination_error = {
            status: '❌ EXCEPTION',
            error: err.message,
            stack: err.stack
        };
        console.log(`  ❌ Coordination test failed: ${err.message}`);
    }
    
    return results;
}

/**
 * Test 4: Memory and Context Retention
 */
async function testMemoryAndContext() {
    console.log('\n🧠 Test 4: Memory and Context Retention');
    console.log('-'.repeat(30));
    
    const results = {};
    
    try {
        const userId = 'test-memory-user-' + Date.now();
        const conversationId = 'conv-test-' + Date.now();
        
        console.log('Testing conversation persistence...');
        
        // Test conversation starting
        const { data: startData, error: startError } = await supabaseAnon.functions.invoke('ai-chat-sessions', {
            body: {
                action: 'start_conversation',
                user_id: userId,
                conversation_id: conversationId,
                initial_message: 'I want to create an email automation workflow'
            }
        });
        
        if (startError) {
            results.conversation_start = {
                status: '❌ ERROR',
                error: startError.message
            };
            console.log(`  ❌ Conversation start failed: ${startError.message}`);
            return results;
        }
        
        console.log('  ✅ Conversation started successfully');
        
        // Test conversation retrieval
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: retrieveData, error: retrieveError } = await supabaseAnon.functions.invoke('ai-chat-sessions', {
            body: {
                action: 'get_conversation',
                conversation_id: conversationId,
                user_id: userId
            }
        });
        
        if (retrieveError) {
            results.conversation_retrieve = {
                status: '❌ ERROR',  
                error: retrieveError.message
            };
            console.log(`  ❌ Conversation retrieval failed: ${retrieveError.message}`);
        } else {
            const hasMessages = retrieveData?.messages && retrieveData.messages.length > 0;
            results.conversation_retrieve = {
                status: hasMessages ? '✅ PASS' : '⚠️ NO_MESSAGES',
                message_count: retrieveData?.messages?.length || 0,
                data: retrieveData
            };
            console.log(`  ${hasMessages ? '✅' : '⚠️'} Retrieved ${retrieveData?.messages?.length || 0} messages`);
        }
        
    } catch (err) {
        results.memory_error = {
            status: '❌ EXCEPTION',
            error: err.message,
            stack: err.stack
        };
        console.log(`  ❌ Memory test failed: ${err.message}`);
    }
    
    return results;
}

/**
 * Test 5: Error Handling and Recovery
 */
async function testErrorHandling() {
    console.log('\n⚠️  Test 5: Error Handling and Recovery');
    console.log('-'.repeat(30));
    
    const results = {};
    
    const errorTestCases = [
        {
            name: 'Invalid Agent Type',
            payload: {
                message: 'Test message',
                agent_type: 'nonexistent-agent',
                user_id: 'test-user'
            },
            expected: 'graceful_error'
        },
        {
            name: 'Missing Required Fields',
            payload: {
                message: 'Test message'
                // Missing agent_type and user_id
            },
            expected: 'validation_error'
        },
        {
            name: 'Large Message Payload',
            payload: {
                message: 'x'.repeat(10000), // Very long message
                agent_type: 'orchestrator',
                user_id: 'test-user'
            },
            expected: 'handled_gracefully'
        }
    ];
    
    for (const testCase of errorTestCases) {
        try {
            console.log(`Testing ${testCase.name}...`);
            
            const { data, error } = await supabaseAnon.functions.invoke('ai-chat-system', {
                body: testCase.payload
            });
            
            let status, analysis;
            
            if (error) {
                // Check if error is handled gracefully
                const isGracefulError = error.message && !error.message.includes('500');
                status = isGracefulError ? '✅ GRACEFUL_ERROR' : '❌ UNHANDLED_ERROR';
                analysis = {
                    error_message: error.message,
                    is_graceful: isGracefulError,
                    has_user_friendly_message: error.message?.length < 200
                };
            } else if (data) {
                // Check if bad input was handled appropriately
                status = '⚠️ UNEXPECTED_SUCCESS';
                analysis = {
                    unexpected_success: true,
                    response: data
                };
            }
            
            results[testCase.name] = {
                status,
                analysis,
                testCase
            };
            
            console.log(`  ${status.split(' ')[0]} ${testCase.name}`);
            
        } catch (err) {
            results[testCase.name] = {
                status: '❌ EXCEPTION',
                error: err.message,
                testCase
            };
            console.log(`  ❌ ${testCase.name}: ${err.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
}

/**
 * Main execution function
 */
async function runDebugTests() {
    const allResults = {};
    
    try {
        // Run all tests
        allResults.edge_functions = await testEdgeFunctionAvailability();
        allResults.ai_processing = await testAgentAIProcessing();
        allResults.agent_coordination = await testAgentCoordination();
        allResults.memory_context = await testMemoryAndContext();
        allResults.error_handling = await testErrorHandling();
        
        // Summary
        console.log('\n📊 DEBUGGING SUMMARY');
        console.log('='.repeat(50));
        
        const generateSummary = (results) => {
            const entries = Object.entries(results);
            const total = entries.length;
            const passed = entries.filter(([_, result]) => result.status?.includes('✅')).length;
            const partial = entries.filter(([_, result]) => result.status?.includes('⚠️')).length;
            const failed = entries.filter(([_, result]) => result.status?.includes('❌')).length;
            
            return { total, passed, partial, failed };
        };
        
        Object.entries(allResults).forEach(([testName, results]) => {
            const summary = generateSummary(results);
            const percentage = Math.round((summary.passed / summary.total) * 100);
            
            console.log(`\n${testName.toUpperCase().replace('_', ' ')}:`);
            console.log(`  ✅ Passed: ${summary.passed}/${summary.total} (${percentage}%)`);
            if (summary.partial > 0) console.log(`  ⚠️  Partial: ${summary.partial}`);
            if (summary.failed > 0) console.log(`  ❌ Failed: ${summary.failed}`);
        });
        
        // Overall health score
        const allTests = Object.values(allResults).flatMap(testGroup => Object.entries(testGroup));
        const overallSummary = generateSummary(Object.fromEntries(allTests));
        const healthScore = Math.round((overallSummary.passed / overallSummary.total) * 100);
        
        console.log(`\n🏥 OVERALL SYSTEM HEALTH: ${healthScore}%`);
        console.log(`   Total Tests: ${overallSummary.total}`);
        console.log(`   ✅ Passed: ${overallSummary.passed}`);
        console.log(`   ⚠️  Partial: ${overallSummary.partial}`);
        console.log(`   ❌ Failed: ${overallSummary.failed}`);
        
        // Write detailed results to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = `debug_results_${timestamp}.json`;
        
        await import('fs').then(fs => {
            fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
            console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
        });
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        
        if (healthScore < 70) {
            console.log('  🚨 CRITICAL: System health below 70% - immediate attention required');
        } else if (healthScore < 85) {
            console.log('  ⚠️  WARNING: System health below 85% - investigate partial failures');
        } else {
            console.log('  ✅ GOOD: System health above 85% - minor optimizations suggested');
        }
        
        if (overallSummary.failed > 0) {
            console.log('  • Focus on fixing failed tests first');
        }
        if (overallSummary.partial > 0) {
            console.log('  • Review partial test failures for improvement opportunities');
        }
        
        console.log('  • Monitor edge function performance and response times');
        console.log('  • Verify OpenAI API key configuration and quotas');
        console.log('  • Test with real user scenarios for validation');
        
    } catch (error) {
        console.error('❌ Debug test execution failed:', error);
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runDebugTests().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

export default runDebugTests;