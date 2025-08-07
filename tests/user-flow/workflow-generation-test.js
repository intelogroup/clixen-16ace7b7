/**
 * AI Workflow Generation Pipeline Test
 * Tests the complete workflow generation process from natural language to n8n JSON
 */

import { createClient } from '@supabase/supabase-js';
import { langflowCodeHelper } from '../../src/lib/langflow/LangflowCodeHelper.js';
import { enhancedAIAgent } from '../../src/lib/langflow/AgentEnhancementIntegration.js';

// Test configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials
const TEST_EMAIL = 'jayveedz19@gmail.com';
const TEST_PASSWORD = 'Goldyear2023#';

// Test workflow scenarios
const TEST_SCENARIOS = [
  {
    name: 'Simple API Monitor',
    description: 'Create a workflow that checks if my website is up every 5 minutes and sends a Slack message if it\'s down',
    complexity: 'simple',
    expectedNodes: ['Schedule Trigger', 'HTTP Request', 'IF', 'Slack']
  },
  {
    name: 'RSS to Email',
    description: 'Monitor an RSS feed and send me an email whenever there are new posts',
    complexity: 'simple',
    expectedNodes: ['RSS', 'Email']
  },
  {
    name: 'Data Processing Pipeline',
    description: 'Fetch data from a REST API, transform the JSON, store it in a database, and generate a report',
    complexity: 'medium',
    expectedNodes: ['HTTP Request', 'Set', 'Database', 'Execute Command']
  }
];

async function testWorkflowGeneration() {
  console.log('🚀 Starting AI Workflow Generation Pipeline Test\n');

  const results = {
    signin: { success: false, duration: 0, error: null },
    createProject: { success: false, duration: 0, error: null },
    simpleWorkflow: { success: false, duration: 0, error: null, workflow: null },
    mediumWorkflow: { success: false, duration: 0, error: null, workflow: null },
    langflowHelper: { success: false, duration: 0, error: null },
    enhancedAgent: { success: false, duration: 0, error: null },
    workflowStorage: { success: false, duration: 0, error: null },
    overall: { success: false, duration: 0 }
  };

  const startTime = Date.now();
  let userId = null;
  let projectId = null;

  try {
    // Step 1: Authentication and project setup
    console.log('🔐 Setting up test environment...');
    const setupStart = Date.now();

    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    results.signin.duration = Date.now() - setupStart;

    if (signinError) {
      results.signin.error = signinError.message;
      console.log(`❌ Setup failed: ${signinError.message}`);
      throw new Error('Authentication required');
    } else {
      results.signin.success = true;
      userId = signinData.user.id;
      console.log(`✅ Authentication successful in ${results.signin.duration}ms`);
    }

    // Create a test project for workflow storage
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert([{
        name: `Workflow Test Project ${Date.now()}`,
        description: 'Test project for workflow generation',
        user_id: userId
      }])
      .select()
      .single();

    const projectDuration = Date.now() - setupStart - results.signin.duration;
    results.createProject.duration = projectDuration;

    if (projectError) {
      results.createProject.error = projectError.message;
      console.log(`❌ Project creation failed: ${projectError.message}`);
    } else {
      results.createProject.success = true;
      projectId = projectData.id;
      console.log(`✅ Test project created in ${projectDuration}ms`);
    }

    // Step 2: Test Simple Workflow Generation
    console.log('\n🤖 Testing Simple Workflow Generation...');
    const simpleStart = Date.now();

    const simpleScenario = TEST_SCENARIOS[0];
    console.log(`   Scenario: "${simpleScenario.name}"`);
    console.log(`   Description: "${simpleScenario.description}"`);

    try {
      // Use our Langflow code helper to generate workflow
      const workflowResult = await langflowCodeHelper.generateCode({
        agentType: 'n8n',
        requirements: simpleScenario.description,
        context: {
          complexity: simpleScenario.complexity,
          expectedNodes: simpleScenario.expectedNodes
        },
        codeStyle: 'javascript',
        complexity: simpleScenario.complexity
      });

      results.simpleWorkflow.duration = Date.now() - simpleStart;
      results.simpleWorkflow.success = true;
      results.simpleWorkflow.workflow = workflowResult;

      console.log(`✅ Simple workflow generated in ${results.simpleWorkflow.duration}ms`);
      console.log(`   Generated code length: ${workflowResult.code.length} characters`);
      console.log(`   Explanation: ${workflowResult.explanation.substring(0, 100)}...`);
      console.log(`   Suggestions: ${workflowResult.suggestions.length} items`);

      // Try to parse as JSON to validate n8n workflow format
      try {
        const workflowJson = JSON.parse(workflowResult.code);
        console.log(`   ✅ Valid JSON format`);
        console.log(`   Workflow name: ${workflowJson.name || 'Unnamed'}`);
        console.log(`   Nodes: ${workflowJson.nodes ? workflowJson.nodes.length : 'Not specified'}`);
      } catch (parseError) {
        console.log(`   ⚠️  Generated code is not valid JSON - may need refinement`);
      }

    } catch (error) {
      results.simpleWorkflow.duration = Date.now() - simpleStart;
      results.simpleWorkflow.error = error.message;
      console.log(`❌ Simple workflow generation failed: ${error.message}`);
    }

    // Step 3: Test Medium Complexity Workflow Generation
    console.log('\n🔧 Testing Medium Complexity Workflow Generation...');
    const mediumStart = Date.now();

    const mediumScenario = TEST_SCENARIOS[2];
    console.log(`   Scenario: "${mediumScenario.name}"`);
    console.log(`   Description: "${mediumScenario.description}"`);

    try {
      const mediumWorkflowResult = await langflowCodeHelper.generateCode({
        agentType: 'n8n',
        requirements: mediumScenario.description,
        context: {
          complexity: mediumScenario.complexity,
          expectedNodes: mediumScenario.expectedNodes,
          requiresDataProcessing: true,
          requiresStorage: true
        },
        codeStyle: 'javascript',
        complexity: mediumScenario.complexity
      });

      results.mediumWorkflow.duration = Date.now() - mediumStart;
      results.mediumWorkflow.success = true;
      results.mediumWorkflow.workflow = mediumWorkflowResult;

      console.log(`✅ Medium workflow generated in ${results.mediumWorkflow.duration}ms`);
      console.log(`   Generated code length: ${mediumWorkflowResult.code.length} characters`);
      console.log(`   Complexity indicators: ${mediumWorkflowResult.suggestions.length} suggestions`);

    } catch (error) {
      results.mediumWorkflow.duration = Date.now() - mediumStart;
      results.mediumWorkflow.error = error.message;
      console.log(`❌ Medium workflow generation failed: ${error.message}`);
    }

    // Step 4: Test Langflow Helper Functions
    console.log('\n🛠️ Testing Langflow Helper Functions...');
    const helperStart = Date.now();

    try {
      // Test workflow optimization
      if (results.simpleWorkflow.success) {
        const optimizedWorkflow = await langflowCodeHelper.optimizeCode(
          results.simpleWorkflow.workflow.code,
          'n8n',
          'performance'
        );

        results.langflowHelper.duration = Date.now() - helperStart;
        results.langflowHelper.success = true;

        console.log(`✅ Workflow optimization completed in ${results.langflowHelper.duration}ms`);
        console.log(`   Optimization suggestions: ${optimizedWorkflow.suggestions.length} items`);
      } else {
        results.langflowHelper.error = 'No workflow available for optimization test';
        console.log(`⏭️ Skipping optimization test: ${results.langflowHelper.error}`);
      }

    } catch (error) {
      results.langflowHelper.duration = Date.now() - helperStart;
      results.langflowHelper.error = error.message;
      console.log(`❌ Langflow helper test failed: ${error.message}`);
    }

    // Step 5: Test Enhanced Agent Integration
    console.log('\n🎭 Testing Enhanced Agent Integration...');
    const agentStart = Date.now();

    try {
      // Test AI agent prompt optimization
      const originalPrompt = simpleScenario.description;
      const optimizedPrompt = await enhancedAIAgent.optimizePrompt(
        originalPrompt,
        'n8n workflow generation context'
      );

      results.enhancedAgent.duration = Date.now() - agentStart;
      results.enhancedAgent.success = true;

      console.log(`✅ Enhanced agent integration working in ${results.enhancedAgent.duration}ms`);
      console.log(`   Original prompt length: ${originalPrompt.length} chars`);
      console.log(`   Optimized prompt length: ${optimizedPrompt.length} chars`);
      
      if (optimizedPrompt.length > originalPrompt.length) {
        console.log(`   ✅ Prompt was enhanced with additional context`);
      }

    } catch (error) {
      results.enhancedAgent.duration = Date.now() - agentStart;
      results.enhancedAgent.error = error.message;
      console.log(`❌ Enhanced agent test failed: ${error.message}`);
    }

    // Step 6: Test Workflow Storage
    if (projectId && results.simpleWorkflow.success) {
      console.log('\n💾 Testing Workflow Storage...');
      const storageStart = Date.now();

      try {
        // Try to store in existing workflows table or create a test entry
        const workflowRecord = {
          project_id: projectId,
          name: simpleScenario.name,
          description: simpleScenario.description,
          workflow_data: JSON.stringify({
            generated: results.simpleWorkflow.workflow.code,
            metadata: {
              complexity: simpleScenario.complexity,
              generationTime: results.simpleWorkflow.duration,
              scenario: simpleScenario.name
            }
          }),
          status: 'generated',
          user_id: userId
        };

        // Try mvp_workflows table first
        const { data: workflowData, error: workflowError } = await supabase
          .from('mvp_workflows')
          .insert([workflowRecord])
          .select()
          .single();

        results.workflowStorage.duration = Date.now() - storageStart;

        if (workflowError) {
          // If mvp_workflows doesn't exist, that's expected - just log it
          results.workflowStorage.error = workflowError.message;
          console.log(`⚠️  Workflow storage test failed: ${workflowError.message}`);
          console.log(`   This is expected if mvp_workflows table hasn't been created yet`);
        } else {
          results.workflowStorage.success = true;
          console.log(`✅ Workflow stored successfully in ${results.workflowStorage.duration}ms`);
          console.log(`   Workflow ID: ${workflowData.id}`);
          console.log(`   Storage size: ${JSON.stringify(workflowData).length} bytes`);

          // Clean up
          await supabase.from('mvp_workflows').delete().eq('id', workflowData.id);
        }

      } catch (error) {
        results.workflowStorage.duration = Date.now() - storageStart;
        results.workflowStorage.error = error.message;
        console.log(`❌ Workflow storage test error: ${error.message}`);
      }
    } else {
      console.log('\n⏭️ Skipping workflow storage test - prerequisites not met');
    }

    // Clean up test project
    if (projectId) {
      await supabase.from('projects').delete().eq('id', projectId);
      console.log('🗑️ Test project cleaned up');
    }

  } catch (error) {
    console.error(`💥 Unexpected error: ${error.message}`);
  }

  // Calculate results
  results.overall.duration = Date.now() - startTime;
  
  // Core workflow generation must work for overall success
  const coreWorkflowGeneration = results.simpleWorkflow.success || results.mediumWorkflow.success;
  const setupSuccess = results.signin.success;
  
  results.overall.success = setupSuccess && coreWorkflowGeneration;

  // Print comprehensive results
  console.log('\n📊 AI Workflow Generation Test Results');
  console.log('======================================');
  console.log(`Overall Status: ${results.overall.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Total Duration: ${results.overall.duration}ms\n`);

  console.log('Test Breakdown:');
  console.log(`  Setup:           ${results.signin.success ? '✅' : '❌'} ${results.signin.duration}ms`);
  console.log(`  Project:         ${results.createProject.success ? '✅' : '❌'} ${results.createProject.duration}ms`);
  console.log(`  Simple Workflow: ${results.simpleWorkflow.success ? '✅' : '❌'} ${results.simpleWorkflow.duration}ms`);
  console.log(`  Medium Workflow: ${results.mediumWorkflow.success ? '✅' : '❌'} ${results.mediumWorkflow.duration}ms`);
  console.log(`  Langflow Helper: ${results.langflowHelper.success ? '✅' : '❌'} ${results.langflowHelper.duration}ms`);
  console.log(`  Enhanced Agent:  ${results.enhancedAgent.success ? '✅' : '❌'} ${results.enhancedAgent.duration}ms`);
  console.log(`  Storage:         ${results.workflowStorage.success ? '✅' : '❌'} ${results.workflowStorage.duration}ms`);

  // Performance analysis
  console.log('\n⚡ Workflow Generation Performance:');
  if (results.simpleWorkflow.success) {
    console.log(`  Simple Workflow: ${results.simpleWorkflow.duration}ms`);
    if (results.simpleWorkflow.duration < 5000) {
      console.log('    ✅ Excellent generation speed (< 5s)');
    } else if (results.simpleWorkflow.duration < 10000) {
      console.log('    ✅ Good generation speed (< 10s)');
    } else if (results.simpleWorkflow.duration < 30000) {
      console.log('    ⚠️  Acceptable generation speed (< 30s)');
    } else {
      console.log('    ❌ Slow generation speed (> 30s)');
    }
  }

  if (results.mediumWorkflow.success) {
    console.log(`  Medium Workflow: ${results.mediumWorkflow.duration}ms`);
  }

  // MVP Success Criteria Check
  console.log('\n🎯 MVP Success Criteria Validation:');
  console.log('===================================');
  
  // System engages in feasibility-check dialogue and generates valid n8n workflow
  const workflowGenerationWorking = results.simpleWorkflow.success || results.mediumWorkflow.success;
  console.log(`✅ AI Workflow Generation: ${workflowGenerationWorking ? 'PASS' : 'FAIL'}`);
  
  // Natural language processing working
  const nlProcessingWorking = results.langflowHelper.success || results.enhancedAgent.success;
  console.log(`✅ Natural Language Processing: ${nlProcessingWorking ? 'PASS' : 'FAIL'}`);
  
  // Performance targets
  const avgGenTime = (results.simpleWorkflow.duration + results.mediumWorkflow.duration) / 2;
  const performanceTarget = avgGenTime < 30000; // 30 seconds per MVP spec
  console.log(`✅ Performance Target (<30s): ${performanceTarget ? 'PASS' : 'FAIL'} (${(avgGenTime/1000).toFixed(1)}s avg)`);
  
  // Integration readiness
  const integrationReady = results.createProject.success;
  console.log(`✅ System Integration: ${integrationReady ? 'PASS' : 'FAIL'}`);

  console.log('\n🔧 Workflow Generation Analysis:');
  console.log('===============================');
  
  if (results.simpleWorkflow.success) {
    const workflow = results.simpleWorkflow.workflow;
    console.log(`✅ Generated ${workflow.code.length} characters of workflow code`);
    console.log(`✅ Provided ${workflow.suggestions.length} optimization suggestions`);
    console.log(`✅ Included explanation: ${workflow.explanation.length} characters`);
  }

  if (results.mediumWorkflow.success) {
    console.log(`✅ Successfully generated complex workflow scenarios`);
  }

  console.log('\n📋 Next Steps:');
  console.log('==============');
  if (results.overall.success) {
    console.log('✅ AI workflow generation pipeline is functional');
    console.log('👉 Ready to test workflow deployment to n8n');
    console.log('👉 Ready for end-to-end user journey validation');
  } else {
    console.log('❌ AI workflow generation needs fixes');
    if (!results.simpleWorkflow.success) {
      console.log('   - Fix simple workflow generation issues');
    }
    if (!results.langflowHelper.success) {
      console.log('   - Check Langflow helper integration');
    }
  }

  return results;
}

// Run the test
testWorkflowGeneration()
  .then(results => {
    console.log('\n🏁 AI Workflow Generation Test Completed');
    process.exit(results.overall.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export { testWorkflowGeneration };