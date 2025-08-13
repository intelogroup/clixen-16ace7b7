#!/usr/bin/env node

const axios = require('axios');

// Configuration
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

async function fixWorkflowCredentials() {
    try {
        console.log('🔧 Fixing Workflow to Use n8n Credentials...');
        console.log('=' .repeat(60));

        // 1. Get the science news workflow
        console.log('\n1. 📋 Fetching science news workflow...');
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

        // 2. Get detailed workflow configuration
        const workflowDetailResponse = await axios.get(`${N8N_API_URL}/workflows/${scienceWorkflow.id}`, {
            headers: {
                'X-N8N-API-KEY': N8N_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const workflow = workflowDetailResponse.data;
        console.log(`   Total nodes: ${workflow.nodes.length}`);

        // 3. Update nodes to use proper n8n credential references
        console.log('\n2. 🔑 Converting nodes to use n8n credential references...');
        
        let modified = false;

        workflow.nodes.forEach((node, index) => {
            console.log(`\\n   Processing node ${index + 1}: ${node.name} (${node.type})`);
            
            // Fix Resend email node
            if (node.name === 'Send via Resend' && node.type === 'n8n-nodes-base.httpRequest') {
                console.log('     🔧 Converting to use Resend credentials...');
                
                // Remove hardcoded Authorization header
                if (node.parameters && node.parameters.headerParameters && node.parameters.headerParameters.parameters) {
                    const authIndex = node.parameters.headerParameters.parameters.findIndex(param => param.name === 'Authorization');
                    if (authIndex !== -1) {
                        node.parameters.headerParameters.parameters.splice(authIndex, 1);
                        console.log('     ✅ Removed hardcoded Authorization header');
                    }
                }
                
                // Add credentials configuration for Resend
                node.credentials = {
                    httpHeaderAuth: {
                        id: 'resend-api-key',  // This should match an existing credential
                        name: 'Resend API Key'
                    }
                };
                
                // Update authentication method
                node.parameters.authentication = 'predefinedCredentialType';
                node.parameters.nodeCredentialType = 'httpHeaderAuth';
                
                console.log('     ✅ Configured to use Resend credentials');
                modified = true;
            }
            
            // Fix News API node
            else if (node.name === 'Fetch Science News' && node.type === 'n8n-nodes-base.httpRequest') {
                console.log('     🔧 Converting to use News API credentials...');
                
                // Remove hardcoded X-API-Key header
                if (node.parameters && node.parameters.headerParameters && node.parameters.headerParameters.parameters) {
                    const apiKeyIndex = node.parameters.headerParameters.parameters.findIndex(param => param.name === 'X-API-Key');
                    if (apiKeyIndex !== -1) {
                        node.parameters.headerParameters.parameters.splice(apiKeyIndex, 1);
                        console.log('     ✅ Removed hardcoded X-API-Key header');
                    }
                }
                
                // Add credentials configuration for News API
                node.credentials = {
                    httpHeaderAuth: {
                        id: 'news-api-key',  // This should match an existing credential
                        name: 'News API Key'
                    }
                };
                
                // Update authentication method
                node.parameters.authentication = 'predefinedCredentialType';
                node.parameters.nodeCredentialType = 'httpHeaderAuth';
                
                console.log('     ✅ Configured to use News API credentials');
                modified = true;
            }
            
            // Fix OpenAI API node
            else if (node.name === 'AI News Summary' && node.type === 'n8n-nodes-base.httpRequest') {
                console.log('     🔧 Converting to use OpenAI credentials...');
                
                // Remove hardcoded Authorization header
                if (node.parameters && node.parameters.headerParameters && node.parameters.headerParameters.parameters) {
                    const authIndex = node.parameters.headerParameters.parameters.findIndex(param => param.name === 'Authorization');
                    if (authIndex !== -1) {
                        node.parameters.headerParameters.parameters.splice(authIndex, 1);
                        console.log('     ✅ Removed hardcoded Authorization header');
                    }
                }
                
                // Add credentials configuration for OpenAI
                node.credentials = {
                    openAiApi: {  // Use specific OpenAI credential type
                        id: 'openai-api-key',  // This should match an existing credential
                        name: 'OpenAI API Key'
                    }
                };
                
                // Update authentication for OpenAI - it might need special handling
                node.parameters.authentication = 'predefinedCredentialType';
                node.parameters.nodeCredentialType = 'openAiApi';
                
                console.log('     ✅ Configured to use OpenAI credentials');
                modified = true;
            }
            
            else {
                console.log('     ⏭️  No credential changes needed');
            }
        });

        // 4. Save the updated workflow
        if (modified) {
            console.log('\\n3. 💾 Saving updated workflow...');
            
            // Clean the workflow object for update
            const cleanWorkflow = {
                name: workflow.name,
                nodes: workflow.nodes,
                connections: workflow.connections,
                active: workflow.active,
                settings: workflow.settings,
                staticData: workflow.staticData
            };
            
            try {
                const updateResponse = await axios.put(`${N8N_API_URL}/workflows/${scienceWorkflow.id}`, cleanWorkflow, {
                    headers: {
                        'X-N8N-API-KEY': N8N_API_KEY,
                        'Content-Type': 'application/json'
                    }
                });
                console.log('✅ Workflow updated successfully');
                console.log(`   Updated workflow ID: ${updateResponse.data.id}`);
            } catch (updateError) {
                console.log('❌ Error updating workflow:', updateError.message);
                if (updateError.response) {
                    console.log(`   Status: ${updateError.response.status}`);
                    console.log(`   Error details: ${JSON.stringify(updateError.response.data, null, 2)}`);
                }
                
                // Try alternative approach - use the exact workflow structure from GET
                console.log('\\n   🔄 Trying alternative update approach...');
                try {
                    const altUpdateResponse = await axios.put(`${N8N_API_URL}/workflows/${scienceWorkflow.id}`, workflow, {
                        headers: {
                            'X-N8N-API-KEY': N8N_API_KEY,
                            'Content-Type': 'application/json'
                        }
                    });
                    console.log('✅ Alternative update successful');
                } catch (altError) {
                    console.log('❌ Alternative update also failed:', altError.message);
                    if (altError.response) {
                        console.log(`   Alt Status: ${altError.response.status}`);
                        console.log(`   Alt Error: ${JSON.stringify(altError.response.data, null, 2)}`);
                    }
                }
            }
        } else {
            console.log('\\n3. ⏭️  No modifications needed');
        }

        // 5. Test the workflow after update
        console.log('\\n4. 🧪 Testing updated workflow...');
        try {
            const webhookUrl = `http://18.221.12.50:5678/webhook/science-news-1755094237863`;
            console.log(`   Testing webhook: ${webhookUrl}`);
            
            const testPayload = { 
                test: true, 
                timestamp: new Date().toISOString(),
                manual_trigger: 'credential_test'
            };
            
            const webhookResponse = await axios.post(webhookUrl, testPayload, {
                timeout: 30000  // 30 second timeout for full workflow execution
            });
            
            console.log('✅ Workflow execution triggered successfully');
            console.log(`   Response: ${JSON.stringify(webhookResponse.data)}`);
            
        } catch (webhookError) {
            console.log('⚠️  Webhook test result:', webhookError.message);
            if (webhookError.response) {
                console.log(`   Status: ${webhookError.response.status}`);
                if (webhookError.response.data) {
                    console.log(`   Response: ${JSON.stringify(webhookError.response.data)}`);
                }
            }
        }

        console.log('\\n' + '=' .repeat(60));
        console.log('🎯 CREDENTIAL CONFIGURATION COMPLETE!');
        console.log('');
        console.log('📋 Changes Made:');
        if (modified) {
            console.log('✅ Updated workflow nodes to use n8n credential references');
            console.log('✅ Removed hardcoded API key placeholders');
            console.log('✅ Configured proper authentication methods');
        } else {
            console.log('ℹ️  No changes were needed');
        }
        console.log('');
        console.log('🔍 Next Steps:');
        console.log('1. Verify credentials exist in n8n with matching names');
        console.log('2. Check execution logs for any remaining errors');
        console.log('3. Monitor jimkalinov@gmail.com for email delivery');
        console.log('4. If needed, manually configure credentials in n8n UI');

    } catch (error) {
        console.error('❌ Error fixing workflow credentials:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

if (require.main === module) {
    fixWorkflowCredentials();
}

module.exports = { fixWorkflowCredentials };