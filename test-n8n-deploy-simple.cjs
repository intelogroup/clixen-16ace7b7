#!/usr/bin/env node

const fs = require('fs');

// Test deploying the simple weather workflow using curl
const workflowPath = '/root/repo/backend/n8n-workflows/simple-weather-test.json';
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// Add user isolation prefix for test
const testUserId = 'test-template-discovery';
workflow.name = `[USR-${testUserId}] Simple Weather Test`;

// Write to temp file for curl
fs.writeFileSync('/tmp/test-workflow.json', JSON.stringify(workflow, null, 2));

console.log('🚀 Testing Simple Weather Workflow Deployment');
console.log(`📖 Deploying: ${workflow.name}`);
console.log(`📊 Nodes: ${workflow.nodes.length}`);

// Export the workflow data for the curl command
console.log('\n✅ Workflow prepared for deployment');
console.log('📄 Workflow saved to /tmp/test-workflow.json');
console.log('\n🔧 Use this curl command to deploy:');
console.log(`curl -X POST "https://n8nio-n8n-7xzf6n.sliplane.app/api/v1/workflows" \\
  -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0" \\
  -H "Content-Type: application/json" \\
  -d @/tmp/test-workflow.json`);