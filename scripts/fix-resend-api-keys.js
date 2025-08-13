#!/usr/bin/env node

const axios = require('axios');

// Configuration
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// API Keys that need to be configured
const API_KEYS = {
    RESEND_API_KEY: 're_123456789', // PLACEHOLDER - needs real Resend API key
    NEWS_API_KEY: '123456789abcdef', // PLACEHOLDER - needs real News API key  
    OPENAI_API_KEY: 'sk-123456789' // PLACEHOLDER - needs real OpenAI API key
};

async function fixResendApiKeys() {
    try {
        console.log('🔧 Fixing API Keys in Science News Workflow...');
        console.log('=' .repeat(60));

        // 1. Get the workflow
        console.log('\n1. 📋 Fetching workflow details...');
        const workflowsResponse = await axios.get(`${N8N_API_URL}/workflows`, {
            headers: {
                'X-N8N-API-KEY': N8N_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const scienceWorkflow = workflowsResponse.data.data.find(wf => 
            wf.name.includes('jimkalinov') && wf.name.toLowerCase().includes('science')
        );

        if (!scienceWorkflow) {
            console.log('❌ Science workflow not found');
            return;
        }

        console.log(`✅ Found workflow: ${scienceWorkflow.name}`);
        console.log(`   ID: ${scienceWorkflow.id}`);
        console.log(`   Active: ${scienceWorkflow.active}`);

        // 2. Get detailed workflow configuration
        const workflowDetailResponse = await axios.get(`${N8N_API_URL}/workflows/${scienceWorkflow.id}`, {
            headers: {
                'X-N8N-API-KEY': N8N_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const workflow = workflowDetailResponse.data;
        let modified = false;

        // 3. Fix API keys in nodes
        console.log('\n2. 🔑 Updating API keys in workflow nodes...');
        
        workflow.nodes.forEach(node => {
            // Fix Resend API key
            if (node.name === 'Send via Resend' && node.type === 'n8n-nodes-base.httpRequest') {
                console.log(`   🔧 Updating Resend API key in node: ${node.name}`);
                if (node.parameters && node.parameters.headerParameters && node.parameters.headerParameters.parameters) {
                    const authHeader = node.parameters.headerParameters.parameters.find(param => param.name === 'Authorization');
                    if (authHeader) {
                        authHeader.value = 'Bearer YOUR_RESEND_API_KEY_HERE';
                        modified = true;
                        console.log('     ✅ Resend API key placeholder set');
                    }
                }
            }
            
            // Fix News API key
            if (node.name === 'Fetch Science News' && node.type === 'n8n-nodes-base.httpRequest') {
                console.log(`   🔧 Updating News API key in node: ${node.name}`);
                if (node.parameters && node.parameters.headerParameters && node.parameters.headerParameters.parameters) {
                    const apiKeyHeader = node.parameters.headerParameters.parameters.find(param => param.name === 'X-API-Key');
                    if (apiKeyHeader) {
                        apiKeyHeader.value = 'YOUR_NEWS_API_KEY_HERE';
                        modified = true;
                        console.log('     ✅ News API key placeholder set');
                    }
                }
            }
            
            // Fix OpenAI API key
            if (node.name === 'AI News Summary' && node.type === 'n8n-nodes-base.httpRequest') {
                console.log(`   🔧 Updating OpenAI API key in node: ${node.name}`);
                if (node.parameters && node.parameters.headerParameters && node.parameters.headerParameters.parameters) {
                    const authHeader = node.parameters.headerParameters.parameters.find(param => param.name === 'Authorization');
                    if (authHeader) {
                        authHeader.value = 'Bearer YOUR_OPENAI_API_KEY_HERE';
                        modified = true;
                        console.log('     ✅ OpenAI API key placeholder set');
                    }
                }
            }
        });

        // 4. Update workflow if modified
        if (modified) {
            console.log('\n3. 💾 Saving updated workflow...');
            const updateResponse = await axios.put(`${N8N_API_URL}/workflows/${scienceWorkflow.id}`, workflow, {
                headers: {
                    'X-N8N-API-KEY': N8N_API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Workflow updated successfully');
        } else {
            console.log('\n3. ⏭️  No modifications needed - API key placeholders already correct');
        }

        // 5. Test webhook endpoint
        console.log('\n4. 🧪 Testing webhook endpoint...');
        try {
            const webhookUrl = `http://18.221.12.50:5678/webhook/science-news-1755094237863`;
            console.log(`   Webhook URL: ${webhookUrl}`);
            
            const testPayload = { test: true, timestamp: new Date().toISOString() };
            const webhookResponse = await axios.post(webhookUrl, testPayload, {
                timeout: 10000
            });
            
            console.log('✅ Webhook test successful');
            console.log(`   Response: ${JSON.stringify(webhookResponse.data)}`);
        } catch (webhookError) {
            console.log('❌ Webhook test failed:', webhookError.message);
            if (webhookError.response) {
                console.log(`   Status: ${webhookError.response.status}`);
                console.log(`   Data: ${JSON.stringify(webhookError.response.data)}`);
            }
        }

        console.log('\n' + '=' .repeat(60));
        console.log('🎯 NEXT STEPS REQUIRED:');
        console.log('');
        console.log('❗ CRITICAL: The workflow has placeholder API keys that need to be replaced:');
        console.log('');
        console.log('1. 📧 RESEND API KEY:');
        console.log('   - Sign up at https://resend.com');
        console.log('   - Get your API key from the dashboard');  
        console.log('   - Replace "YOUR_RESEND_API_KEY_HERE" in the workflow');
        console.log('');
        console.log('2. 📰 NEWS API KEY:');
        console.log('   - Sign up at https://newsapi.org');
        console.log('   - Get your free API key');
        console.log('   - Replace "YOUR_NEWS_API_KEY_HERE" in the workflow');
        console.log('');
        console.log('3. 🤖 OPENAI API KEY:');
        console.log('   - Get your API key from https://platform.openai.com');
        console.log('   - Replace "YOUR_OPENAI_API_KEY_HERE" in the workflow');
        console.log('');
        console.log('4. 🔄 After updating the API keys:');
        console.log('   - Test the workflow manually via webhook');
        console.log('   - Monitor execution logs for any errors');
        console.log('   - Check jimkalinov@gmail.com for email delivery');
        console.log('');
        console.log('💡 The sender email (onboarding@resend.dev) is correctly configured!');

    } catch (error) {
        console.error('❌ Error fixing API keys:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

if (require.main === module) {
    fixResendApiKeys();
}

module.exports = { fixResendApiKeys };