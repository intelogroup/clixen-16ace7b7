#!/usr/bin/env node

/**
 * Test JSON Healing System (Clean Version)
 * Tests the JSON healing functionality with various malformed inputs
 * This version contains no API keys or secrets
 */

// Simulate the JSON healing function from the edge function
async function healAndValidateJSON(jsonString, retries = 3) {
  console.log('🔧 Starting JSON healing process...');
  console.log('📝 Input:', jsonString.substring(0, 100) + '...');
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Try to parse as-is
      const parsed = JSON.parse(jsonString);
      
      // Basic structure validation
      if (parsed && typeof parsed === 'object' && parsed.nodes && Array.isArray(parsed.nodes)) {
        console.log(`✅ JSON parsed successfully on attempt ${attempt}`);
        return { valid: true, errors: [], warnings: [], healed: parsed };
      } else {
        throw new Error('Invalid workflow structure - missing nodes array');
      }
    } catch (error) {
      console.log(`❌ JSON parse failed on attempt ${attempt}: ${error.message}`);
      
      if (attempt < retries) {
        console.log('🩹 Attempting to heal JSON...');
        
        // Common healing patterns (same as in edge function)
        jsonString = jsonString
          // Remove markdown code blocks
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          // Fix trailing commas
          .replace(/,(\s*[}\]])/g, '$1')
          // Fix missing quotes around property names
          .replace(/(\w+):/g, '"$1":')
          // Fix single quotes to double quotes
          .replace(/'/g, '"')
          // Remove comments
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '')
          // Fix common escape issues
          .replace(/\\n/g, '\\n')
          .replace(/\\t/g, '\\t');
          
        console.log('🔄 Applied healing patterns...');
      }
    }
  }
  
  return {
    valid: false,
    errors: ['Failed to heal JSON after all attempts'],
    warnings: ['Consider regenerating the workflow']
  };
}

// Test cases with various malformed JSON scenarios
const testCases = [
  {
    name: "Valid JSON (Control)",
    input: `{
  "name": "Test Workflow",
  "nodes": [
    {
      "id": "node1",
      "name": "Start",
      "type": "n8n-nodes-base.webhook",
      "position": [200, 300],
      "parameters": {"path": "test"}
    }
  ],
  "connections": {},
  "settings": {}
}`
  },
  {
    name: "Markdown Code Blocks",
    input: `\`\`\`json
{
  "name": "Test Workflow",
  "nodes": [
    {
      "id": "node1",
      "name": "Start", 
      "type": "n8n-nodes-base.webhook",
      "position": [200, 300],
      "parameters": {"path": "test"}
    }
  ],
  "connections": {},
  "settings": {}
}
\`\`\``
  },
  {
    name: "Trailing Commas",
    input: `{
  "name": "Test Workflow",
  "nodes": [
    {
      "id": "node1",
      "name": "Start",
      "type": "n8n-nodes-base.webhook", 
      "position": [200, 300],
      "parameters": {"path": "test"},
    }
  ],
  "connections": {},
  "settings": {},
}`
  }
];

async function runHealingTests() {
  console.log('🧪 JSON HEALING SYSTEM TESTS (CLEAN)');
  console.log('====================================\n');
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`🔬 Test ${i + 1}: ${testCase.name}`);
    console.log('─'.repeat(40));
    
    const startTime = Date.now();
    const result = await healAndValidateJSON(testCase.input);
    const duration = Date.now() - startTime;
    
    results.push({
      name: testCase.name,
      success: result.valid,
      duration,
      errors: result.errors,
      warnings: result.warnings
    });
    
    if (result.valid) {
      console.log(`✅ PASSED in ${duration}ms`);
      console.log(`📊 Healed workflow: ${result.healed.name}`);
      console.log(`📝 Nodes: ${result.healed.nodes.length}`);
    } else {
      console.log(`❌ FAILED in ${duration}ms`);
      console.log(`🚨 Errors: ${result.errors.join(', ')}`);
    }
    
    console.log('');
  }
  
  // Summary
  console.log('📋 TEST SUMMARY');
  console.log('===============');
  
  const passedCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`✅ Passed: ${passedCount}/${totalCount}`);
  console.log(`⏱️  Average duration: ${Math.round(results.reduce((a, r) => a + r.duration, 0) / totalCount)}ms`);
  
  results.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${i + 1}. ${result.name} (${result.duration}ms)`);
  });
  
  return {
    testResults: results,
    passRate: passedCount / totalCount,
    averageDuration: Math.round(results.reduce((a, r) => a + r.duration, 0) / totalCount)
  };
}

// Run tests
runHealingTests().then(results => {
  console.log(`\n🏁 JSON Healing Tests Completed!`);
  console.log(`📊 Pass Rate: ${(results.passRate * 100).toFixed(1)}%`);
  console.log(`⏱️  Average Duration: ${results.averageDuration}ms`);
  
  process.exit(results.passRate >= 0.8 ? 0 : 1);
}).catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});