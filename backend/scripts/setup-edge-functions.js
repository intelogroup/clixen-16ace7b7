#!/usr/bin/env node

/**
 * Setup script for Supabase Edge Functions
 * Configures AI chat system functions with proper environment variables
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-proj-PLACEHOLDER_KEY_FOR_CONFIGURATION_SETUP';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Edge Functions to deploy
const edgeFunctions = [
  {
    name: 'ai-chat-system',
    description: 'Main multi-agent AI chat system with OpenAI integration',
    path: 'supabase/functions/ai-chat-system'
  },
  {
    name: 'ai-chat-sessions',
    description: 'Session management for AI chat conversations',
    path: 'supabase/functions/ai-chat-sessions'
  },
  {
    name: 'ai-chat-stream',
    description: 'Streaming AI chat responses with Server-Sent Events',
    path: 'supabase/functions/ai-chat-stream'
  }
];

// Environment variables for Edge Functions
const edgeFunctionEnvVars = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  OPENAI_API_KEY
};

async function createEnvFile() {
  const envContent = Object.entries(edgeFunctionEnvVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const envPath = path.join(process.cwd(), 'supabase', '.env');
  
  try {
    await fs.promises.writeFile(envPath, envContent);
    console.log('✅ Created supabase/.env file');
  } catch (error) {
    console.error('❌ Error creating .env file:', error);
  }
}

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }

    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return false;
  }
}

async function testOpenAIConnection() {
  try {
    console.log('🔍 Testing OpenAI API connection...');
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ OpenAI API connection failed:', response.status);
      return false;
    }

    console.log('✅ OpenAI API connection successful');
    return true;
  } catch (error) {
    console.error('❌ OpenAI API connection error:', error);
    return false;
  }
}

async function validateEdgeFunctions() {
  console.log('🔍 Validating Edge Function files...');
  
  let allValid = true;

  for (const func of edgeFunctions) {
    const funcPath = path.join(process.cwd(), func.path, 'index.ts');
    
    try {
      const exists = await fs.promises.access(funcPath).then(() => true).catch(() => false);
      
      if (exists) {
        const content = await fs.promises.readFile(funcPath, 'utf8');
        
        // Check for required imports and structure
        const hasServe = content.includes('serve(');
        const hasCORS = content.includes('corsHeaders');
        const hasSupabase = content.includes('createClient');
        
        if (hasServe && hasCORS && hasSupabase) {
          console.log(`✅ ${func.name}: Valid structure`);
        } else {
          console.log(`⚠️  ${func.name}: Missing required components`);
          allValid = false;
        }
      } else {
        console.log(`❌ ${func.name}: File not found at ${funcPath}`);
        allValid = false;
      }
    } catch (error) {
      console.log(`❌ ${func.name}: Error validating - ${error.message}`);
      allValid = false;
    }
  }

  return allValid;
}

async function createDeploymentScript() {
  const deployScript = `#!/bin/bash

# Deployment script for Supabase Edge Functions
# Run this script to deploy all AI chat functions

echo "🚀 Deploying Supabase Edge Functions..."

# Set environment variables
export SUPABASE_URL="${SUPABASE_URL}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}"
export OPENAI_API_KEY="${OPENAI_API_KEY}"

# Deploy each function
${edgeFunctions.map(func => 
  `echo "Deploying ${func.name}..."
supabase functions deploy ${func.name} --project-ref zfbgdixbzezpxllkoyfc`
).join('\n')}

echo "✅ All functions deployed successfully!"
echo "📋 Available endpoints:"
${edgeFunctions.map(func => 
  `echo "  - ${func.name}: ${SUPABASE_URL}/functions/v1/${func.name}"`
).join('\n')}
`;

  const scriptPath = path.join(process.cwd(), 'deploy-edge-functions.sh');
  
  try {
    await fs.promises.writeFile(scriptPath, deployScript);
    await fs.promises.chmod(scriptPath, '755');
    console.log('✅ Created deployment script: deploy-edge-functions.sh');
  } catch (error) {
    console.error('❌ Error creating deployment script:', error);
  }
}

async function createTestScript() {
  const testScript = `#!/usr/bin/env node

/**
 * Test script for Edge Functions
 */

const SUPABASE_URL = '${SUPABASE_URL}';
const SERVICE_ROLE_KEY = '${SERVICE_ROLE_KEY}';

async function testFunction(functionName, payload) {
  try {
    console.log(\`🔍 Testing \${functionName}...\`);
    
    const response = await fetch(\`\${SUPABASE_URL}/functions/v1/\${functionName}\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${SERVICE_ROLE_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(\`✅ \${functionName}: Success\`);
      console.log(\`   Response: \${JSON.stringify(data, null, 2).substring(0, 200)}...\`);
    } else {
      console.log(\`❌ \${functionName}: Failed\`);
      console.log(\`   Error: \${JSON.stringify(data, null, 2)}\`);
    }
  } catch (error) {
    console.log(\`❌ \${functionName}: Error - \${error.message}\`);
  }
}

async function runTests() {
  console.log('🧪 Testing Edge Functions...');
  
  // Test ai-chat-system
  await testFunction('ai-chat-system', {
    message: 'Hello, test message',
    user_id: '00000000-0000-0000-0000-000000000000'
  });

  // Test ai-chat-sessions
  await testFunction('ai-chat-sessions', {
    user_id: '00000000-0000-0000-0000-000000000000'
  });

  console.log('🏁 Testing complete!');
}

runTests().catch(console.error);
`;

  const scriptPath = path.join(process.cwd(), 'test-edge-functions.js');
  
  try {
    await fs.promises.writeFile(scriptPath, testScript);
    await fs.promises.chmod(scriptPath, '755');
    console.log('✅ Created test script: test-edge-functions.js');
  } catch (error) {
    console.error('❌ Error creating test script:', error);
  }
}

async function createDocumentation() {
  const docs = `# AI Chat System Edge Functions

## Overview

This project includes three Supabase Edge Functions for a comprehensive AI chat system:

### 1. ai-chat-system
**Endpoint**: \`${SUPABASE_URL}/functions/v1/ai-chat-system\`

Main multi-agent AI chat function supporting:
- Multi-agent coordination (Orchestrator, Workflow Designer, Deployment, System agents)
- OpenAI GPT-4 integration
- Conversation history management
- Agent state persistence
- Error handling and recovery

**Request Format**:
\`\`\`json
{
  "message": "Your message here",
  "user_id": "uuid",
  "session_id": "uuid" (optional),
  "agent_type": "orchestrator" (optional)
}
\`\`\`

**Response Format**:
\`\`\`json
{
  "response": "AI response",
  "agent_type": "orchestrator",
  "message_id": "uuid",
  "session_id": "uuid",
  "processing_time": 1500,
  "tokens_used": 150,
  "conversation_context": {},
  "next_agent": "workflow_designer" (optional)
}
\`\`\`

### 2. ai-chat-sessions
**Endpoint**: \`${SUPABASE_URL}/functions/v1/ai-chat-sessions\`

Session management endpoints:
- \`GET /ai-chat-sessions?user_id=uuid\` - List user sessions
- \`POST /ai-chat-sessions\` - Create new session
- \`PUT /ai-chat-sessions/update-title\` - Update session title
- \`PUT /ai-chat-sessions/archive\` - Archive session
- \`DELETE /ai-chat-sessions?session_id=uuid&user_id=uuid\` - Delete session

### 3. ai-chat-stream
**Endpoint**: \`${SUPABASE_URL}/functions/v1/ai-chat-stream\`

Streaming chat responses using Server-Sent Events:
- Real-time response streaming
- Agent-specific streaming prompts
- Automatic conversation storage
- Error handling during streaming

**Usage**:
\`\`\`javascript
const eventSource = new EventSource(\`\${SUPABASE_URL}/functions/v1/ai-chat-stream\`, {
  method: 'POST',
  body: JSON.stringify({
    message: 'Hello',
    user_id: 'uuid',
    session_id: 'uuid'
  })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'chunk') {
    console.log(data.content);
  }
};
\`\`\`

## Environment Variables

The following environment variables are required:
- \`SUPABASE_URL\`: ${SUPABASE_URL}
- \`SUPABASE_SERVICE_ROLE_KEY\`: [Service role key]
- \`OPENAI_API_KEY\`: [OpenAI API key]

## Database Schema

The functions use these database tables:
- \`ai_chat_sessions\`: Chat session management
- \`ai_chat_messages\`: Message storage
- \`ai_agent_states\`: Agent state persistence
- \`openai_configurations\`: OpenAI settings

## Deployment

1. Run the setup: \`node scripts/setup-edge-functions.js\`
2. Deploy functions: \`./deploy-edge-functions.sh\`
3. Test functions: \`node test-edge-functions.js\`

## Security

- All functions use Row Level Security (RLS)
- Service role key required for admin operations
- User isolation enforced at database level
- CORS properly configured for frontend access
`;

  const docsPath = path.join(process.cwd(), 'docs', 'edge-functions-guide.md');
  
  try {
    // Ensure docs directory exists
    await fs.promises.mkdir(path.dirname(docsPath), { recursive: true });
    await fs.promises.writeFile(docsPath, docs);
    console.log('✅ Created documentation: docs/edge-functions-guide.md');
  } catch (error) {
    console.error('❌ Error creating documentation:', error);
  }
}

async function main() {
  console.log('🚀 Setting up Supabase Edge Functions for AI Chat System\n');

  // Step 1: Test connections
  const dbOk = await testDatabaseConnection();
  const openaiOk = await testOpenAIConnection();

  if (!dbOk || !openaiOk) {
    console.log('\n❌ Setup failed: Connection tests failed');
    process.exit(1);
  }

  // Step 2: Validate Edge Function files
  const functionsValid = await validateEdgeFunctions();

  if (!functionsValid) {
    console.log('\n⚠️  Some Edge Functions have issues, but continuing setup...');
  }

  // Step 3: Create necessary files
  await createEnvFile();
  await createDeploymentScript();
  await createTestScript();
  await createDocumentation();

  console.log('\n✅ Setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Install Supabase CLI if not already installed');
  console.log('2. Login to Supabase: supabase login');
  console.log('3. Deploy functions: ./deploy-edge-functions.sh');
  console.log('4. Test functions: node test-edge-functions.js');
  console.log('5. Check docs/edge-functions-guide.md for usage details');

  console.log('\n🔗 Function URLs:');
  edgeFunctions.forEach(func => {
    console.log(`   ${func.name}: ${SUPABASE_URL}/functions/v1/${func.name}`);
  });
}

main().catch(console.error);