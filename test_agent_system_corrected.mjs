#!/usr/bin/env node

/**
 * Corrected Multi-Agent System Test
 * Tests with proper input validation and format
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Corrected Multi-Agent System Test');
console.log('='.repeat(50));

/**
 * Test with correct input format based on edge function validation
 */
async function testAgentWithCorrectFormat(testName, payload) {
    console.log(`\n🧪 Testing: ${testName}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    try {
        const startTime = Date.now();
        const { data, error } = await supabase.functions.invoke('ai-chat-system', {
            body: payload
        });
        const responseTime = Date.now() - startTime;
        
        if (error) {
            console.log(`❌ Error: ${error.message}`);
            return {
                success: false,
                error,
                responseTime,
                testName
            };
        }
        
        console.log(`✅ Success (${responseTime}ms)`);
        console.log(`Response: ${(data?.response || '').substring(0, 100)}...`);
        console.log(`Agent Type: ${data?.agent_type}`);
        console.log(`Tokens Used: ${data?.tokens_used || 0}`);
        
        return {
            success: true,
            data,
            responseTime,
            testName
        };
        
    } catch (error) {
        console.log(`❌ Exception: ${error.message}`);
        return {
            success: false,
            exception: error,
            testName
        };
    }
}

/**
 * Test the complete agent conversation flow
 */
async function testAgentConversationFlow() {
    console.log('\n🔄 Testing Complete Agent Conversation Flow');
    console.log('-'.repeat(50));
    
    const userId = 'test-user-' + Date.now();
    let sessionId = null;
    
    const conversationSteps = [
        {
            name: "1. Greeting",
            message: "Hello, I'd like to create a workflow automation",
            expected_agent: "orchestrator"
        },
        {
            name: "2. Workflow Request", 
            message: "I want to send a Slack notification whenever a new form is submitted to Google Forms",
            expected_agent: "orchestrator"
        },
        {
            name: "3. Technical Details",
            message: "The workflow should trigger on webhook, extract the form data, format it nicely, and post to #notifications channel",
            expected_agent: "workflow_designer"
        },
        {
            name: "4. Deployment Request",
            message: "This looks good, can you deploy it to my n8n instance?",
            expected_agent: "deployment"
        }
    ];
    
    const results = [];
    
    for (const step of conversationSteps) {
        const payload = {
            message: step.message,
            user_id: userId,
            session_id: sessionId,
            stream: false
        };
        
        // Add specific agent type for testing
        if (step.expected_agent) {
            payload.agent_type = step.expected_agent;
        }
        
        const result = await testAgentWithCorrectFormat(step.name, payload);
        results.push(result);
        
        // Extract session ID from first response for continuity
        if (result.success && result.data?.session_id && !sessionId) {
            sessionId = result.data.session_id;
            console.log(`  📝 Session ID: ${sessionId}`);
        }
        
        // Add delay between messages to simulate natural conversation
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    return results;
}

/**
 * Test individual agent types
 */
async function testIndividualAgents() {
    console.log('\n🤖 Testing Individual Agent Types');
    console.log('-'.repeat(50));
    
    const baseUserId = 'agent-test-user-' + Date.now();
    
    const agentTests = [
        {
            name: "Orchestrator Agent",
            payload: {
                message: "I need help understanding what workflows I can create",
                user_id: `${baseUserId}-orchestrator`,
                agent_type: "orchestrator",
                stream: false
            }
        },
        {
            name: "Workflow Designer Agent",
            payload: {
                message: "Create a workflow that connects Google Sheets to Slack for new row notifications",
                user_id: `${baseUserId}-designer`,
                agent_type: "workflow_designer", 
                stream: false
            }
        },
        {
            name: "Deployment Agent",
            payload: {
                message: "Deploy the workflow to production and activate it",
                user_id: `${baseUserId}-deployment`,
                agent_type: "deployment",
                stream: false
            }
        },
        {
            name: "System Agent",
            payload: {
                message: "There's an error in my workflow execution, can you help debug it?",
                user_id: `${baseUserId}-system`,
                agent_type: "system",
                stream: false
            }
        }
    ];
    
    const results = [];
    
    for (const test of agentTests) {
        const result = await testAgentWithCorrectFormat(test.name, test.payload);
        results.push(result);
        
        // Delay between agent tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
}

/**
 * Test agent state persistence
 */
async function testAgentStatePersistence() {
    console.log('\n🧠 Testing Agent State Persistence');
    console.log('-'.repeat(50));
    
    const userId = 'state-test-user-' + Date.now();
    let sessionId = null;
    
    // First message to establish state
    const firstResult = await testAgentWithCorrectFormat("State Setup", {
        message: "I want to create a complex workflow with multiple steps and conditions",
        user_id: userId,
        stream: false
    });
    
    if (firstResult.success) {
        sessionId = firstResult.data?.session_id;
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Follow-up message to test if state is maintained
    const followupResult = await testAgentWithCorrectFormat("State Continuation", {
        message: "Add error handling to that workflow we just discussed",
        user_id: userId,
        session_id: sessionId,
        stream: false
    });
    
    const stateTest = {
        setup_success: firstResult.success,
        continuation_success: followupResult.success,
        session_maintained: sessionId && followupResult.data?.session_id === sessionId,
        context_maintained: followupResult.success && 
            followupResult.data?.response.toLowerCase().includes('workflow')
    };
    
    console.log('State Test Results:', stateTest);
    
    return [firstResult, followupResult, { stateAnalysis: stateTest }];
}

/**
 * Test error handling
 */
async function testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling');
    console.log('-'.repeat(50));
    
    const errorTests = [
        {
            name: "Missing Message",
            payload: {
                user_id: "test-user",
                agent_type: "orchestrator"
                // message is missing - should get 400
            },
            expected_error: true
        },
        {
            name: "Missing User ID",
            payload: {
                message: "Hello",
                agent_type: "orchestrator"
                // user_id is missing - should get 400
            },
            expected_error: true
        },
        {
            name: "Invalid Agent Type",
            payload: {
                message: "Hello",
                user_id: "test-user",
                agent_type: "nonexistent_agent"
                // Should gracefully default to system agent
            },
            expected_error: false
        }
    ];
    
    const results = [];
    
    for (const test of errorTests) {
        console.log(`\n  Testing: ${test.name}`);
        
        try {
            const { data, error } = await supabase.functions.invoke('ai-chat-system', {
                body: test.payload
            });
            
            const result = {
                name: test.name,
                expected_error: test.expected_error,
                got_error: !!error,
                error_message: error?.message,
                response_data: data,
                test_passed: test.expected_error ? !!error : !error
            };
            
            console.log(`  ${result.test_passed ? '✅' : '❌'} ${test.name}: ${result.test_passed ? 'PASS' : 'FAIL'}`);
            if (error) console.log(`    Error: ${error.message}`);
            
            results.push(result);
            
        } catch (exception) {
            console.log(`  ❌ ${test.name}: Exception - ${exception.message}`);
            results.push({
                name: test.name,
                expected_error: test.expected_error,
                got_exception: true,
                exception_message: exception.message,
                test_passed: test.expected_error
            });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
}

/**
 * Main test execution
 */
async function runCorrectedTests() {
    const allResults = {
        timestamp: new Date().toISOString(),
        configuration: {
            supabase_url: SUPABASE_URL,
            has_openai_key: !!process.env.VITE_OPENAI_API_KEY
        }
    };
    
    try {
        // Test individual agents
        console.log('🚀 Starting Individual Agent Tests...');
        allResults.individual_agents = await testIndividualAgents();
        
        // Test conversation flow
        console.log('\n🚀 Starting Conversation Flow Test...');
        allResults.conversation_flow = await testAgentConversationFlow();
        
        // Test state persistence
        console.log('\n🚀 Starting State Persistence Test...');
        allResults.state_persistence = await testAgentStatePersistence();
        
        // Test error handling
        console.log('\n🚀 Starting Error Handling Tests...');
        allResults.error_handling = await testErrorHandling();
        
        // Generate summary
        console.log('\n📊 TEST SUMMARY');
        console.log('='.repeat(50));
        
        const summarizeResults = (results, testName) => {
            if (!Array.isArray(results)) return { total: 0, passed: 0, failed: 0 };
            
            const total = results.length;
            const passed = results.filter(r => r.success === true || r.test_passed === true).length;
            const failed = total - passed;
            const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
            
            console.log(`\n${testName.toUpperCase()}:`);
            console.log(`  ✅ Passed: ${passed}/${total} (${percentage}%)`);
            if (failed > 0) console.log(`  ❌ Failed: ${failed}`);
            
            return { total, passed, failed, percentage };
        };
        
        const individualSummary = summarizeResults(allResults.individual_agents, 'Individual Agents');
        const conversationSummary = summarizeResults(allResults.conversation_flow, 'Conversation Flow');
        const stateSummary = summarizeResults(allResults.state_persistence.slice(0, 2), 'State Persistence');
        const errorSummary = summarizeResults(allResults.error_handling, 'Error Handling');
        
        const totalTests = individualSummary.total + conversationSummary.total + stateSummary.total + errorSummary.total;
        const totalPassed = individualSummary.passed + conversationSummary.passed + stateSummary.passed + errorSummary.passed;
        const overallHealth = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
        
        console.log(`\n🏥 OVERALL SYSTEM HEALTH: ${overallHealth}%`);
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   ✅ Passed: ${totalPassed}`);
        console.log(`   ❌ Failed: ${totalTests - totalPassed}`);
        
        // Save results to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = `corrected_agent_test_${timestamp}.json`;
        
        await import('fs').then(fs => {
            fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
            console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
        });
        
        // Provide recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        
        if (overallHealth >= 85) {
            console.log('  ✅ EXCELLENT: Multi-agent system is working well');
            console.log('  • Continue with regular testing and monitoring');
            console.log('  • Consider adding more sophisticated conversation flows');
        } else if (overallHealth >= 70) {
            console.log('  ⚠️ GOOD: System functioning but has areas for improvement');
            console.log('  • Focus on failed test cases for optimization');
            console.log('  • Review agent response quality and consistency');
        } else {
            console.log('  🚨 NEEDS ATTENTION: System has significant issues');
            console.log('  • Check OpenAI API key configuration');
            console.log('  • Verify database tables and permissions');
            console.log('  • Review edge function logs for detailed errors');
        }
        
        if (!process.env.VITE_OPENAI_API_KEY) {
            console.log('  🔑 CRITICAL: OpenAI API key not configured in environment');
            console.log('  • Add VITE_OPENAI_API_KEY to .env file');
            console.log('  • Or configure user-specific API keys in database');
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runCorrectedTests().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

export default runCorrectedTests;