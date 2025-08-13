#!/usr/bin/env node

const axios = require('axios');

// Configuration
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

async function deployCorrectedWorkflow() {
    try {
        console.log('🚀 Deploying Corrected Science News Workflow with Proper Credentials...');
        console.log('=' .repeat(80));

        // First, let's deactivate the old workflow
        console.log('\\n1. 🔄 Deactivating old workflow...');
        try {
            const workflowsResponse = await axios.get(`${N8N_API_URL}/workflows`, {
                headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' }
            });
            
            const oldWorkflow = workflowsResponse.data.data.find(wf => 
                wf.name.includes('jimkalinov') && wf.name.toLowerCase().includes('science')
            );
            
            if (oldWorkflow && oldWorkflow.active) {
                await axios.patch(`${N8N_API_URL}/workflows/${oldWorkflow.id}`, 
                    { active: false },
                    { headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' }}
                );
                console.log('✅ Old workflow deactivated');
            }
        } catch (error) {
            console.log('⚠️  Could not deactivate old workflow:', error.message);
        }

        // 2. Create new workflow with proper credential configuration
        console.log('\\n2. 🏗️  Creating new workflow with proper credential references...');
        
        const newWorkflow = {
            "name": "[USR-jimkalinov] Science News - Credentials Fixed",
            "active": false,
            "nodes": [
                {
                    "id": "cron-trigger",
                    "name": "Daily at 8 AM",
                    "type": "n8n-nodes-base.cron",
                    "typeVersion": 1,
                    "position": [100, 300],
                    "parameters": {
                        "rule": {
                            "hour": 8,
                            "minute": 0,
                            "dayOfMonth": "*",
                            "month": "*",
                            "dayOfWeek": "*"
                        }
                    }
                },
                {
                    "id": "webhook-trigger",
                    "name": "Manual Trigger",
                    "type": "n8n-nodes-base.webhook",
                    "typeVersion": 2,
                    "position": [100, 500],
                    "parameters": {
                        "httpMethod": "POST",
                        "path": "science-news-corrected-" + Date.now(),
                        "responseMode": "responseNode"
                    }
                },
                {
                    "id": "news-api",
                    "name": "Fetch Science News",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4,
                    "position": [350, 400],
                    "parameters": {
                        "url": "https://newsapi.org/v2/top-headlines",
                        "method": "GET",
                        "authentication": "genericCredentialType",
                        "genericAuthType": "httpHeaderAuth",
                        "sendQuery": true,
                        "queryParameters": {
                            "parameters": [
                                {"name": "category", "value": "science"},
                                {"name": "country", "value": "us"},
                                {"name": "pageSize", "value": "10"},
                                {"name": "sortBy", "value": "publishedAt"}
                            ]
                        },
                        "options": {
                            "response": {
                                "response": {
                                    "responseFormat": "json"
                                }
                            }
                        }
                    },
                    "credentials": {
                        "httpHeaderAuth": "news-api-credentials"
                    }
                },
                {
                    "id": "process-news",
                    "name": "Process News Articles",
                    "type": "n8n-nodes-base.set",
                    "typeVersion": 3,
                    "position": [600, 400],
                    "parameters": {
                        "values": {
                            "values": [
                                {"name": "total_articles", "value": "={{ $json.totalResults }}"},
                                {"name": "articles_data", "value": "={{ JSON.stringify($json.articles) }}"},
                                {"name": "top_headlines", "value": "={{ $json.articles.slice(0, 5).map(article => ({ title: article.title, description: article.description, url: article.url, source: article.source.name, publishedAt: article.publishedAt })) }}"},
                                {"name": "timestamp", "value": "={{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}"}
                            ]
                        }
                    }
                },
                {
                    "id": "openai-summary",
                    "name": "AI News Summary",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4,
                    "position": [850, 400],
                    "parameters": {
                        "url": "https://api.openai.com/v1/chat/completions",
                        "method": "POST",
                        "authentication": "genericCredentialType",
                        "genericAuthType": "httpHeaderAuth",
                        "sendBody": true,
                        "bodyParameters": {
                            "parameters": [
                                {"name": "model", "value": "gpt-3.5-turbo"},
                                {"name": "messages", "value": "[{\\\"role\\\": \\\"system\\\", \\\"content\\\": \\\"You are a science news curator. Create an engaging, informative summary of today's top science news for a daily newsletter. Keep it professional but accessible.\\\"}, {\\\"role\\\": \\\"user\\\", \\\"content\\\": \\\"Please create a compelling daily science news summary from these articles: {{ $('Process News Articles').item.json.articles_data }}\\\"}]"},
                                {"name": "max_tokens", "value": 800},
                                {"name": "temperature", "value": 0.7}
                            ]
                        },
                        "options": {
                            "response": {
                                "response": {
                                    "responseFormat": "json"
                                }
                            }
                        }
                    },
                    "credentials": {
                        "httpHeaderAuth": "openai-api-credentials"
                    }
                },
                {
                    "id": "format-email",
                    "name": "Format Email Content",
                    "type": "n8n-nodes-base.set",
                    "typeVersion": 3,
                    "position": [1100, 400],
                    "parameters": {
                        "values": {
                            "values": [
                                {"name": "email_subject", "value": "🔬 Daily Science News - {{ $now.toFormat('MMMM dd, yyyy') }}"},
                                {"name": "ai_summary", "value": "={{ $('AI News Summary').item.json.choices[0].message.content }}"},
                                {"name": "article_count", "value": "={{ $('Process News Articles').item.json.total_articles }}"},
                                {"name": "email_html", "value": "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Daily Science News</title></head><body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;'><div style='background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'><h1 style='color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;'>🔬 Daily Science News</h1><p style='color: #34495e; font-size: 16px;'><strong>{{ $now.toFormat('EEEE, MMMM dd, yyyy') }}</strong></p><div style='background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;'><h2 style='color: #2c3e50; margin-top: 0;'>🤖 AI Summary</h2><p style='color: #34495e; line-height: 1.6;'>{{ $('AI News Summary').item.json.choices[0].message.content }}</p></div><div style='background: #34495e; color: white; padding: 15px; border-radius: 5px; margin-top: 30px; text-align: center;'><p style='margin: 0;'>📧 Powered by AI | 🔬 Science News Daily | 📅 {{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}</p></div></div></body></html>"}
                            ]
                        }
                    }
                },
                {
                    "id": "send-resend-email",
                    "name": "Send via Resend",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4,
                    "position": [1350, 400],
                    "parameters": {
                        "url": "https://api.resend.com/emails",
                        "method": "POST",
                        "authentication": "genericCredentialType",
                        "genericAuthType": "httpHeaderAuth",
                        "sendBody": true,
                        "bodyParameters": {
                            "parameters": [
                                {"name": "from", "value": "onboarding@resend.dev"},
                                {"name": "to", "value": ["jimkalinov@gmail.com"]},
                                {"name": "subject", "value": "={{ $('Format Email Content').item.json.email_subject }}"},
                                {"name": "html", "value": "={{ $('Format Email Content').item.json.email_html }}"}
                            ]
                        },
                        "options": {
                            "response": {
                                "response": {
                                    "responseFormat": "json"
                                }
                            }
                        }
                    },
                    "credentials": {
                        "httpHeaderAuth": "resend-api-credentials"
                    }
                },
                {
                    "id": "log-results",
                    "name": "Log Execution Results",
                    "type": "n8n-nodes-base.set",
                    "typeVersion": 3,
                    "position": [1600, 400],
                    "parameters": {
                        "values": {
                            "values": [
                                {"name": "execution_status", "value": "success"},
                                {"name": "email_sent_to", "value": "jimkalinov@gmail.com"},
                                {"name": "email_id", "value": "={{ $('Send via Resend').item.json.id }}"},
                                {"name": "articles_processed", "value": "={{ $('Process News Articles').item.json.total_articles }}"},
                                {"name": "timestamp", "value": "={{ $now.toISO() }}"},
                                {"name": "resend_response", "value": "={{ JSON.stringify($('Send via Resend').item.json) }}"}
                            ]
                        }
                    }
                },
                {
                    "id": "webhook-response",
                    "name": "API Response",
                    "type": "n8n-nodes-base.respondToWebhook",
                    "typeVersion": 1,
                    "position": [1600, 600],
                    "parameters": {
                        "respondWith": "json",
                        "responseBody": "{\\\"success\\\":true,\\\"message\\\":\\\"Daily science news sent successfully\\\",\\\"recipient\\\":\\\"jimkalinov@gmail.com\\\",\\\"timestamp\\\":\\\"{{ $now.toISO() }}\\\",\\\"articles_count\\\":\\\"={{ $('Process News Articles').item.json.total_articles }}\\\",\\\"email_id\\\":\\\"={{ $('Send via Resend').item.json.id }}\\\"}"
                    }
                }
            ],
            "connections": {
                "Daily at 8 AM": {"main": [[{"node": "Fetch Science News", "type": "main", "index": 0}]]},
                "Manual Trigger": {"main": [[{"node": "Fetch Science News", "type": "main", "index": 0}]]},
                "Fetch Science News": {"main": [[{"node": "Process News Articles", "type": "main", "index": 0}]]},
                "Process News Articles": {"main": [[{"node": "AI News Summary", "type": "main", "index": 0}]]},
                "AI News Summary": {"main": [[{"node": "Format Email Content", "type": "main", "index": 0}]]},
                "Format Email Content": {"main": [[{"node": "Send via Resend", "type": "main", "index": 0}]]},
                "Send via Resend": {"main": [[{"node": "Log Execution Results", "type": "main", "index": 0}, {"node": "API Response", "type": "main", "index": 0}]]}
            },
            "settings": {
                "executionOrder": "v1"
            },
            "staticData": null,
            "tags": []
        };

        // 3. Deploy the new workflow
        const createResponse = await axios.post(`${N8N_API_URL}/workflows`, newWorkflow, {
            headers: {
                'X-N8N-API-KEY': N8N_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ New workflow created successfully!');
        console.log(`   Workflow ID: ${createResponse.data.id}`);
        console.log(`   Workflow Name: ${createResponse.data.name}`);

        // 4. Activate the workflow
        console.log('\\n3. 🔄 Activating new workflow...');
        await axios.patch(`${N8N_API_URL}/workflows/${createResponse.data.id}`, 
            { active: true },
            { headers: { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' }}
        );
        console.log('✅ Workflow activated successfully!');

        // 5. Get the webhook URL for testing
        const webhookNode = newWorkflow.nodes.find(node => node.type === 'n8n-nodes-base.webhook');
        const webhookPath = webhookNode.parameters.path;
        const webhookUrl = `http://18.221.12.50:5678/webhook/${webhookPath}`;

        console.log('\\n4. 🧪 Testing new workflow...');
        console.log(`   Webhook URL: ${webhookUrl}`);

        // Wait a moment for activation to complete
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const testResponse = await axios.post(webhookUrl, 
                { 
                    test: true, 
                    trigger: 'credential_fix_test',
                    timestamp: new Date().toISOString() 
                }, 
                { timeout: 45000 }
            );
            
            console.log('✅ Workflow test successful!');
            console.log(`   Response: ${JSON.stringify(testResponse.data)}`);
            
        } catch (testError) {
            console.log('⚠️  Workflow test status:', testError.message);
            if (testError.response) {
                console.log(`   Status: ${testError.response.status}`);
                console.log(`   Response: ${JSON.stringify(testError.response.data)}`);
            }
        }

        console.log('\\n' + '=' .repeat(80));
        console.log('🎉 WORKFLOW DEPLOYMENT COMPLETE!');
        console.log('');
        console.log('📋 What was created:');
        console.log(`✅ New workflow: ${createResponse.data.name}`);
        console.log(`✅ Workflow ID: ${createResponse.data.id}`);
        console.log(`✅ Status: Active and ready`);
        console.log(`✅ Webhook URL: ${webhookUrl}`);
        console.log('');
        console.log('🔑 Required Credentials (must exist in n8n):');
        console.log('1. "news-api-credentials" (HTTP Header Auth with X-API-Key)');
        console.log('2. "openai-api-credentials" (HTTP Header Auth with Authorization: Bearer)');
        console.log('3. "resend-api-credentials" (HTTP Header Auth with Authorization: Bearer)');
        console.log('');
        console.log('📧 Expected Result:');
        console.log('- If credentials are configured correctly, jimkalinov@gmail.com should receive emails');
        console.log('- Check n8n execution logs for detailed status');
        console.log('- Monitor the webhook endpoint for manual testing');

        return {
            workflowId: createResponse.data.id,
            webhookUrl: webhookUrl,
            success: true
        };

    } catch (error) {
        console.error('❌ Error deploying corrected workflow:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        return { success: false, error: error.message };
    }
}

if (require.main === module) {
    deployCorrectedWorkflow();
}

module.exports = { deployCorrectedWorkflow };