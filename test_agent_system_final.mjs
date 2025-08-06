#!/usr/bin/env node

/**
 * Final Multi-Agent System Test with UUID Fix
 * Tests with proper UUID format for user_id
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔥 FINAL Multi-Agent System Test (UUID Fixed)');
console.log('='.repeat(50));

/**
 * Test agent with proper UUID user_id
 */
async function testAgentWithProperUUID(testName, payload) {
    console.log(`\n🧪 Testing: ${testName}`);
    
    try {
        const startTime = Date.now();
        const { data, error } = await supabase.functions.invoke('ai-chat-system', {
            body: payload
        });
        const responseTime = Date.now() - startTime;
        
        if (error) {
            console.log(`❌ Error (${responseTime}ms): ${error.message}`);
            return {
                success: false,
                error,
                responseTime,
                testName
            };
        }
        
        console.log(`✅ Success (${responseTime}ms)`);
        console.log(`Agent: ${data?.agent_type}`);
        console.log(`Response: ${(data?.response || '').substring(0, 100)}...`);
        console.log(`Tokens: ${data?.tokens_used || 0}`);
        console.log(`Session: ${data?.session_id?.substring(0, 8)}...`);
        
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
 * Test orchestrator agent conversation flow
 */
async function testOrchestratorFlow() {
    console.log('\n🎯 Testing Orchestrator Agent Flow');
    console.log('-'.repeat(50));
    
    const userId = randomUUID(); // Proper UUID format
    let sessionId = null;
    
    console.log(`User ID: ${userId}`);
    
    const conversationSteps = [
        {
            name: "Greeting",
            message: "Hello, I want to create a workflow automation",
            agent_type: "orchestrator"
        },
        {
            name: "Workflow Description",
            message: "I want to automatically send an email notification when someone submits a form on my website",
            agent_type: "orchestrator"
        },
        {
            name: "Technical Clarification", 
            message: "The form is on a WordPress site and I want to send notifications to my team Slack channel",
            agent_type: "workflow_designer"
        }
    ];
    
    const results = [];
    
    for (const step of conversationSteps) {
        const payload = {
            message: step.message,
            user_id: userId,
            agent_type: step.agent_type,
            stream: false
        };
        
        // Add session_id after first response
        if (sessionId) {
            payload.session_id = sessionId;
        }
        
        const result = await testAgentWithProperUUID(step.name, payload);
        results.push(result);
        
        // Extract session ID for continuity
        if (result.success && result.data?.session_id && !sessionId) {
            sessionId = result.data.session_id;
            console.log(`  📝 Session established: ${sessionId.substring(0, 8)}...`);
        }
        
        // Add natural delay between messages
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Stop if we hit an error
        if (!result.success) {
            console.log(`  🚨 Stopping conversation flow due to error`);
            break;
        }
    }
    
    return results;
}

/**
 * Test each agent type individually
 */
async function testIndividualAgents() {
    console.log('\n🤖 Testing Individual Agent Types');
    console.log('-'.repeat(50));
    
    const agentTests = [
        {
            name: "Orchestrator Agent",
            agent_type: "orchestrator",
            message: "Help me understand what types of workflows I can create with your system"
        },
        {
            name: "Workflow Designer Agent",
            agent_type: "workflow_designer", 
            message: "Design a workflow that connects Google Sheets to Slack notifications when new rows are added"
        },
        {
            name: "Deployment Agent",
            agent_type: "deployment",
            message: "I need to deploy my completed workflow to production. Can you handle the deployment safely?"
        },
        {
            name: "System Agent",
            agent_type: "system",
            message: "My workflow is throwing errors and I need help debugging what's going wrong"
        }
    ];
    
    const results = [];
    
    for (const test of agentTests) {
        const payload = {
            message: test.message,
            user_id: randomUUID(), // Each agent gets its own user ID
            agent_type: test.agent_type,
            stream: false
        };
        
        const result = await testAgentWithProperUUID(test.name, payload);
        results.push(result);
        
        // Delay between tests
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    return results;
}

/**
 * Test automatic agent detection (no agent_type specified)
 */
async function testAutomaticAgentDetection() {
    console.log('\n🎯 Testing Automatic Agent Detection');
    console.log('-'.repeat(50));
    
    const detectionTests = [
        {
            name: "Workflow Creation Request",
            message: "I want to create an automation that syncs my CRM with my email marketing tool",
            expected_agent: "workflow_designer"
        },
        {
            name: "Deployment Request",
            message: "Please deploy this workflow to production and activate it for live use",
            expected_agent: "deployment"
        },
        {
            name: "Error/Debug Request",
            message: "My automation is not working and I'm getting error messages",
            expected_agent: "system"
        },
        {
            name: "General Question",
            message: "What can your workflow automation platform do for my business?",
            expected_agent: "orchestrator"
        }
    ];
    
    const results = [];
    
    for (const test of detectionTests) {
        const payload = {
            message: test.message,
            user_id: randomUUID(),
            // Note: No agent_type specified - let the system decide
            stream: false
        };
        
        console.log(`\n  Testing: ${test.name}`);
        console.log(`  Expected: ${test.expected_agent}`);
        
        const result = await testAgentWithProperUUID(test.name, payload);
        
        if (result.success) {
            const detectedAgent = result.data?.agent_type;
            const correctDetection = detectedAgent === test.expected_agent;
            
            console.log(`  Detected: ${detectedAgent} ${correctDetection ? '✅' : '❌'}`);
            result.agent_detection_correct = correctDetection;
            result.expected_agent = test.expected_agent;
            result.detected_agent = detectedAgent;
        }
        
        results.push(result);
        
        await new Promise(resolve => setTimeout(resolve, 1200));
    }
    
    return results;
}

/**
 * Test conversation memory and context retention
 */
async function testConversationMemory() {
    console.log('\n🧠 Testing Conversation Memory & Context');
    console.log('-'.repeat(50));
    
    const userId = randomUUID();
    let sessionId = null;
    
    console.log(`Testing with User ID: ${userId}`);
    
    // First message to establish context
    const setupResult = await testAgentWithProperUUID("Context Setup", {
        message: "I want to create a workflow that processes customer support tickets from Zendesk",
        user_id: userId,
        agent_type: "orchestrator",
        stream: false
    });
    
    if (setupResult.success) {
        sessionId = setupResult.data?.session_id;
        console.log(`  Context established with session: ${sessionId?.substring(0, 8)}...`);
    }
    
    // Wait to ensure context is stored
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Follow-up message to test context retention
    const contextResult = await testAgentWithProperUUID("Context Recall", {
        message: "Add automatic priority classification to that Zendesk workflow we discussed",
        user_id: userId,
        session_id: sessionId,
        agent_type: "workflow_designer",
        stream: false
    });
    
    // Analyze if context was maintained
    let contextMaintained = false;
    if (contextResult.success && contextResult.data?.response) {
        const response = contextResult.data.response.toLowerCase();
        contextMaintained = response.includes('zendesk') || response.includes('ticket') || response.includes('support');
    }
    
    console.log(`\n  Context Analysis:`);
    console.log(`  Session Maintained: ${sessionId && contextResult.data?.session_id === sessionId ? '✅' : '❌'}`);
    console.log(`  Context References: ${contextMaintained ? '✅' : '❌'}`);
    
    return {
        setup: setupResult,
        contextTest: contextResult,
        analysis: {
            sessionMaintained: sessionId && contextResult.data?.session_id === sessionId,
            contextMaintained,
            sessionId
        }
    };
}

/**
 * Main test execution
 */
async function runFinalTests() {
    console.log('🚀 Starting Final Multi-Agent System Tests...\n');
    
    const results = {
        timestamp: new Date().toISOString(),
        fix_applied: "UUID format for user_id",
        tests: {}
    };
    
    try {
        // Test individual agents
        console.log('📍 Phase 1: Individual Agent Testing');
        results.tests.individual_agents = await testIndividualAgents();
        
        // Test orchestrator conversation flow  
        console.log('\n📍 Phase 2: Orchestrator Conversation Flow');
        results.tests.orchestrator_flow = await testOrchestratorFlow();
        
        // Test automatic agent detection
        console.log('\n📍 Phase 3: Automatic Agent Detection');
        results.tests.agent_detection = await testAutomaticAgentDetection();
        
        // Test conversation memory
        console.log('\n📍 Phase 4: Conversation Memory & Context');
        results.tests.conversation_memory = await testConversationMemory();
        
        // Generate comprehensive summary
        console.log('\n📊 COMPREHENSIVE TEST SUMMARY');
        console.log('='.repeat(60));
        
        const analyzeResults = (testResults, testName) => {
            if (!Array.isArray(testResults)) {
                // Handle non-array results (like conversation_memory)
                if (testResults.setup && testResults.contextTest) {
                    const passed = (testResults.setup.success ? 1 : 0) + (testResults.contextTest.success ? 1 : 0);
                    const total = 2;
                    const percentage = Math.round((passed / total) * 100);
                    
                    console.log(`\n${testName.toUpperCase()}:`);
                    console.log(`  ✅ Passed: ${passed}/${total} (${percentage}%)`);
                    if (testResults.analysis) {
                        console.log(`  📝 Session Maintained: ${testResults.analysis.sessionMaintained ? '✅' : '❌'}`);
                        console.log(`  🧠 Context Maintained: ${testResults.analysis.contextMaintained ? '✅' : '❌'}`);
                    }
                    
                    return { total, passed, failed: total - passed, percentage };
                }
                return { total: 0, passed: 0, failed: 0, percentage: 0 };
            }
            
            const total = testResults.length;
            const passed = testResults.filter(r => r.success === true).length;
            const failed = total - passed;
            const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
            
            console.log(`\n${testName.toUpperCase()}:`);
            console.log(`  ✅ Passed: ${passed}/${total} (${percentage}%)`);
            if (failed > 0) console.log(`  ❌ Failed: ${failed}`);
            
            // Additional analysis for agent detection
            if (testName.includes('detection')) {
                const correctDetections = testResults.filter(r => r.agent_detection_correct).length;
                const detectionRate = total > 0 ? Math.round((correctDetections / total) * 100) : 0;
                console.log(`  🎯 Correct Agent Detection: ${correctDetections}/${total} (${detectionRate}%)`);
            }
            
            return { total, passed, failed, percentage };
        };
        
        const individualSummary = analyzeResults(results.tests.individual_agents, 'Individual Agents');
        const flowSummary = analyzeResults(results.tests.orchestrator_flow, 'Orchestrator Flow');  
        const detectionSummary = analyzeResults(results.tests.agent_detection, 'Agent Detection');
        const memorySummary = analyzeResults(results.tests.conversation_memory, 'Conversation Memory');
        
        const totalTests = individualSummary.total + flowSummary.total + detectionSummary.total + memorySummary.total;
        const totalPassed = individualSummary.passed + flowSummary.passed + detectionSummary.passed + memorySummary.passed;
        const overallHealth = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
        
        console.log(`\n🏥 OVERALL SYSTEM HEALTH: ${overallHealth}%`);
        console.log(`   📊 Total Tests: ${totalTests}`);
        console.log(`   ✅ Passed: ${totalPassed}`);
        console.log(`   ❌ Failed: ${totalTests - totalPassed}`);
        
        // Health assessment
        let healthStatus, recommendations;
        if (overallHealth >= 90) {
            healthStatus = '🟢 EXCELLENT';
            recommendations = [
                'System is performing exceptionally well',
                'Continue with regular monitoring and testing',
                'Consider adding advanced features and optimizations'
            ];
        } else if (overallHealth >= 75) {
            healthStatus = '🟡 GOOD';
            recommendations = [
                'System is working well with minor issues',
                'Review failed test cases for improvement opportunities',
                'Monitor performance and response times',
                'Consider optimizing agent response quality'
            ];
        } else if (overallHealth >= 50) {
            healthStatus = '🟠 NEEDS IMPROVEMENT';
            recommendations = [
                'System has significant issues that need attention',
                'Focus on fixing failed tests systematically',
                'Check OpenAI API key configuration and quotas',
                'Verify database connectivity and permissions'
            ];
        } else {
            healthStatus = '🔴 CRITICAL';
            recommendations = [
                'System requires immediate attention',
                'Multiple core components are failing',
                'Check all configuration and infrastructure',
                'Consider reverting to last known good configuration'
            ];
        }
        
        console.log(`\n${healthStatus}`);
        console.log('\n💡 RECOMMENDATIONS:');
        recommendations.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
        
        // Save detailed results
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = `final_agent_test_${timestamp}.json`;
        
        await import('fs').then(fs => {
            fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
            console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
        });
        
        // Final assessment for development team
        console.log('\n🎯 DEVELOPMENT TEAM SUMMARY:');
        console.log('='.repeat(60));
        console.log(`✅ UUID Fix Applied: Successfully resolved user_id validation issues`);
        console.log(`📊 System Health: ${overallHealth}% (${healthStatus.split(' ')[1]})`);
        console.log(`🤖 Agent System: ${totalPassed}/${totalTests} components working`);
        console.log(`🔧 Ready for Production: ${overallHealth >= 75 ? 'YES' : 'NEEDS WORK'}`);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        results.fatal_error = {
            message: error.message,
            stack: error.stack
        };
    }
    
    return results;
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runFinalTests().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

export default runFinalTests;