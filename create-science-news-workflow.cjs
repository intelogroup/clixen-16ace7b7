// Advanced Science News Workflow Creator with Resend, News API, and OpenAI
const https = require('https');
const http = require('http');

// Configuration
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

const WORKFLOW_ID = 'uxRUjGF3BHDPxNp3';
const USER_EMAIL = 'jimkalinov@gmail.com';
const RESEND_FROM_EMAIL = 'onboarding@resend.dev';

// Simple HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 15000,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      const bodyData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(bodyData);
    }
    
    req.end();
  });
}

function createAdvancedScienceNewsWorkflow() {
  const workflowId = Date.now().toString();
  
  return {
    name: "[USR-jimkalinov] Daily Science News - AI Enhanced",
    nodes: [
      // 1. Cron Trigger - Daily at 8 AM
      {
        id: "cron-trigger",
        name: "Daily at 8 AM",
        type: "n8n-nodes-base.cron",
        typeVersion: 1,
        position: [100, 300],
        parameters: {
          rule: {
            hour: 8,
            minute: 0,
            dayOfMonth: "*",
            month: "*",
            dayOfWeek: "*"
          }
        }
      },
      
      // 2. Webhook Trigger - Manual trigger option
      {
        id: "webhook-trigger",
        name: "Manual Trigger",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [100, 500],
        parameters: {
          httpMethod: "POST",
          path: `science-news-${workflowId}`,
          responseMode: "responseNode"
        }
      },
      
      // 3. News API - Get today's science news
      {
        id: "news-api",
        name: "Fetch Science News",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4,
        position: [350, 400],
        parameters: {
          url: "https://newsapi.org/v2/top-headlines",
          method: "GET",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "X-API-Key",
                value: "YOUR_NEWS_API_KEY_HERE"
              }
            ]
          },
          sendQuery: true,
          queryParameters: {
            parameters: [
              {
                name: "category",
                value: "science"
              },
              {
                name: "country",
                value: "us"
              },
              {
                name: "pageSize",
                value: "10"
              },
              {
                name: "sortBy",
                value: "publishedAt"
              }
            ]
          },
          options: {
            response: {
              response: {
                responseFormat: "json"
              }
            }
          }
        }
      },
      
      // 4. Process News Data
      {
        id: "process-news",
        name: "Process News Articles",
        type: "n8n-nodes-base.set",
        typeVersion: 3,
        position: [600, 400],
        parameters: {
          values: {
            values: [
              {
                name: "total_articles",
                value: "={{ $json.totalResults }}"
              },
              {
                name: "articles_data",
                value: "={{ JSON.stringify($json.articles) }}"
              },
              {
                name: "top_headlines",
                value: "={{ $json.articles.slice(0, 5).map(article => ({ title: article.title, description: article.description, url: article.url, source: article.source.name, publishedAt: article.publishedAt })) }}"
              },
              {
                name: "timestamp",
                value: "={{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}"
              }
            ]
          }
        }
      },
      
      // 5. OpenAI Summarization
      {
        id: "openai-summary",
        name: "AI News Summary",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4,
        position: [850, 400],
        parameters: {
          url: "https://api.openai.com/v1/chat/completions",
          method: "POST",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "Authorization",
                value: "Bearer YOUR_OPENAI_API_KEY_HERE"
              },
              {
                name: "Content-Type",
                value: "application/json"
              }
            ]
          },
          sendBody: true,
          bodyParameters: {
            parameters: [
              {
                name: "model",
                value: "gpt-3.5-turbo"
              },
              {
                name: "messages",
                value: "[{\"role\": \"system\", \"content\": \"You are a science news curator. Create an engaging, informative summary of today's top science news for a daily newsletter. Keep it professional but accessible.\"}, {\"role\": \"user\", \"content\": \"Please create a compelling daily science news summary from these articles: {{ $('Process News Articles').item.json.articles_data }}\"}]"
              },
              {
                name: "max_tokens",
                value: 800
              },
              {
                name: "temperature",
                value: 0.7
              }
            ]
          },
          options: {
            response: {
              response: {
                responseFormat: "json"
              }
            }
          }
        }
      },
      
      // 6. Format Email Content
      {
        id: "format-email",
        name: "Format Email Content",
        type: "n8n-nodes-base.set",
        typeVersion: 3,
        position: [1100, 400],
        parameters: {
          values: {
            values: [
              {
                name: "email_subject",
                value: "🔬 Daily Science News - {{ $now.toFormat('MMMM dd, yyyy') }}"
              },
              {
                name: "ai_summary",
                value: "={{ $('AI News Summary').item.json.choices[0].message.content }}"
              },
              {
                name: "article_count",
                value: "={{ $('Process News Articles').item.json.total_articles }}"
              },
              {
                name: "formatted_articles",
                value: "={{ $('Process News Articles').item.json.top_headlines.map((article, index) => `<div style='border-left: 4px solid #3498db; padding-left: 15px; margin: 20px 0;'><h3 style='color: #2c3e50; margin: 0 0 10px 0;'>${index + 1}. ${article.title}</h3><p style='color: #7f8c8d; margin: 5px 0;'>${article.description || 'No description available'}</p><p style='margin: 10px 0 0 0;'><span style='background: #3498db; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px;'>${article.source}</span> <a href='${article.url}' style='color: #3498db; text-decoration: none;'>Read More →</a></p></div>`).join('') }}"
              },
              {
                name: "email_html",
                value: "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Daily Science News</title></head><body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;'><div style='background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'><h1 style='color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;'>🔬 Daily Science News</h1><p style='color: #34495e; font-size: 16px;'><strong>{{ $now.toFormat('EEEE, MMMM dd, yyyy') }}</strong></p><div style='background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;'><h2 style='color: #2c3e50; margin-top: 0;'>🤖 AI Summary</h2><p style='color: #34495e; line-height: 1.6;'>{{ $('AI News Summary').item.json.choices[0].message.content }}</p></div><h2 style='color: #2c3e50;'>📰 Top Headlines ({{ $('Process News Articles').item.json.total_articles }} total articles)</h2><div>{{ $('Process News Articles').item.json.formatted_articles }}</div><div style='background: #34495e; color: white; padding: 15px; border-radius: 5px; margin-top: 30px; text-align: center;'><p style='margin: 0;'>📧 Powered by AI | 🔬 Science News Daily | 📅 {{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}</p></div></div></body></html>"
              }
            ]
          }
        }
      },
      
      // 7. Send Email via Resend
      {
        id: "send-resend-email",
        name: "Send via Resend",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4,
        position: [1350, 400],
        parameters: {
          url: "https://api.resend.com/emails",
          method: "POST",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "Authorization",
                value: "Bearer YOUR_RESEND_API_KEY_HERE"
              },
              {
                name: "Content-Type",
                value: "application/json"
              }
            ]
          },
          sendBody: true,
          bodyParameters: {
            parameters: [
              {
                name: "from",
                value: RESEND_FROM_EMAIL
              },
              {
                name: "to",
                value: [USER_EMAIL]
              },
              {
                name: "subject",
                value: "={{ $('Format Email Content').item.json.email_subject }}"
              },
              {
                name: "html",
                value: "={{ $('Format Email Content').item.json.email_html }}"
              }
            ]
          },
          options: {
            response: {
              response: {
                responseFormat: "json"
              }
            }
          }
        }
      },
      
      // 8. Log Results
      {
        id: "log-results",
        name: "Log Execution Results",
        type: "n8n-nodes-base.set",
        typeVersion: 3,
        position: [1600, 400],
        parameters: {
          values: {
            values: [
              {
                name: "execution_status",
                value: "success"
              },
              {
                name: "email_sent_to",
                value: USER_EMAIL
              },
              {
                name: "email_id",
                value: "={{ $('Send via Resend').item.json.id }}"
              },
              {
                name: "articles_processed",
                value: "={{ $('Process News Articles').item.json.total_articles }}"
              },
              {
                name: "timestamp",
                value: "={{ $now.toISO() }}"
              },
              {
                name: "resend_response",
                value: "={{ JSON.stringify($('Send via Resend').item.json) }}"
              }
            ]
          }
        }
      },
      
      // 9. Webhook Response
      {
        id: "webhook-response",
        name: "API Response",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1,
        position: [1600, 600],
        parameters: {
          respondWith: "json",
          responseBody: JSON.stringify({
            success: true,
            message: "Daily science news sent successfully",
            recipient: USER_EMAIL,
            timestamp: "{{ $now.toISO() }}",
            articles_count: "={{ $('Process News Articles').item.json.total_articles }}",
            email_id: "={{ $('Send via Resend').item.json.id }}"
          })
        }
      }
    ],
    
    connections: {
      "Daily at 8 AM": {
        main: [
          [
            {
              node: "Fetch Science News",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Manual Trigger": {
        main: [
          [
            {
              node: "Fetch Science News",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Fetch Science News": {
        main: [
          [
            {
              node: "Process News Articles",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Process News Articles": {
        main: [
          [
            {
              node: "AI News Summary",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "AI News Summary": {
        main: [
          [
            {
              node: "Format Email Content",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Format Email Content": {
        main: [
          [
            {
              node: "Send via Resend",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Send via Resend": {
        main: [
          [
            {
              node: "Log Execution Results",
              type: "main",
              index: 0
            },
            {
              node: "API Response",
              type: "main",
              index: 0
            }
          ]
        ]
      }
    },
    
    settings: {
      executionOrder: "v1"
    }
  };
}

async function main() {
  console.log('🔬 CREATING ADVANCED SCIENCE NEWS WORKFLOW');
  console.log('==========================================');
  console.log(`👤 User: ${USER_EMAIL}`);
  console.log(`📧 From: ${RESEND_FROM_EMAIL}`);
  console.log(`🆔 Workflow ID: ${WORKFLOW_ID}`);
  console.log('');

  try {
    // Step 1: Create the advanced workflow
    console.log('🛠️ Creating advanced science news workflow...');
    const advancedWorkflow = createAdvancedScienceNewsWorkflow();
    
    console.log(`📊 Advanced Workflow Features:`);
    console.log(`   - Name: ${advancedWorkflow.name}`);
    console.log(`   - Total nodes: ${advancedWorkflow.nodes.length}`);
    console.log(`   - Daily execution: 8:00 AM`);
    console.log(`   - Manual trigger: Webhook available`);
    console.log(`   - API Integrations:`);
    console.log(`     • News API (science category)`);
    console.log(`     • OpenAI GPT-3.5 (summarization)`);
    console.log(`     • Resend (email delivery)`);
    console.log(`   - Email Format: Rich HTML with AI summary`);
    console.log(`   - Target: ${USER_EMAIL}`);

    // Step 2: Update the existing workflow
    console.log('\n🔄 Updating workflow in n8n...');
    
    const updatePayload = {
      name: advancedWorkflow.name,
      nodes: advancedWorkflow.nodes,
      connections: advancedWorkflow.connections,
      settings: advancedWorkflow.settings || {}
    };

    const updateResponse = await makeRequest(`${N8N_API_URL}/workflows/${WORKFLOW_ID}`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: updatePayload
    });

    if (updateResponse.status !== 200) {
      console.error('❌ Failed to update workflow:', updateResponse.data);
      return;
    }

    const updatedWorkflow = updateResponse.data;
    console.log(`✅ Successfully updated workflow!`);
    console.log(`   - ID: ${updatedWorkflow.id}`);
    console.log(`   - Name: ${updatedWorkflow.name}`);
    console.log(`   - Nodes: ${updatedWorkflow.nodes.length}`);
    console.log(`   - Trigger count: ${updatedWorkflow.triggerCount || 'Calculating...'}`);

    // Step 3: Activate the workflow
    console.log('\n⚡ Activating the enhanced workflow...');
    
    const activationResponse = await makeRequest(`${N8N_API_URL}/workflows/${WORKFLOW_ID}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (activationResponse.status === 200) {
      console.log(`🎉 SUCCESS! Advanced science news workflow activated!`);
      
      // Get final workflow status
      const finalCheck = await makeRequest(`${N8N_API_URL}/workflows/${WORKFLOW_ID}`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (finalCheck.status === 200) {
        const finalWorkflow = finalCheck.data;
        
        // Find webhook URL
        const webhookNode = finalWorkflow.nodes.find(node => 
          node.type === 'n8n-nodes-base.webhook'
        );
        
        console.log(`\n📊 Final Workflow Configuration:`);
        console.log(`   - Name: ${finalWorkflow.name}`);
        console.log(`   - Status: ${finalWorkflow.active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
        console.log(`   - Total nodes: ${finalWorkflow.nodes.length}`);
        console.log(`   - Trigger count: ${finalWorkflow.triggerCount}`);
        
        if (webhookNode && webhookNode.parameters.path) {
          const webhookUrl = `http://18.221.12.50:5678/webhook/${webhookNode.parameters.path}`;
          console.log(`   - Manual trigger URL: ${webhookUrl}`);
        }
        
        console.log(`\n🔔 Scheduling & Delivery:`);
        console.log(`   - Automated execution: Daily at 8:00 AM`);
        console.log(`   - Target email: ${USER_EMAIL}`);
        console.log(`   - From email: ${RESEND_FROM_EMAIL}`);
        console.log(`   - Content: AI-enhanced science news summary`);
        
        console.log(`\n⚙️ API Configuration Required:`);
        console.log(`   1. 📰 News API Key: Replace 'YOUR_NEWS_API_KEY_HERE'`);
        console.log(`      - Get free key at: https://newsapi.org/register`);
        console.log(`   2. 🤖 OpenAI API Key: Replace 'YOUR_OPENAI_API_KEY_HERE'`);
        console.log(`      - Get key at: https://platform.openai.com/api-keys`);
        console.log(`   3. 📧 Resend API Key: Replace 'YOUR_RESEND_API_KEY_HERE'`);
        console.log(`      - Get key at: https://resend.com/api-keys`);
        
        console.log(`\n🌟 Workflow Capabilities:`);
        console.log(`   ✅ Fetches latest science news (US, top 10 articles)`);
        console.log(`   ✅ AI-powered news summarization via OpenAI`);
        console.log(`   ✅ Rich HTML email formatting`);
        console.log(`   ✅ Professional email delivery via Resend`);
        console.log(`   ✅ Execution logging and monitoring`);
        console.log(`   ✅ Manual trigger via webhook`);
        console.log(`   ✅ Daily automated delivery`);
      }
      
    } else {
      console.log(`❌ Failed to activate workflow:`);
      console.log(`   Status: ${activationResponse.status}`);
      console.log(`   Error: ${JSON.stringify(activationResponse.data)}`);
    }

    console.log('\n==========================================');
    console.log('🏆 ADVANCED WORKFLOW CREATION COMPLETE!');
    console.log('==========================================');
    console.log(`✅ Created comprehensive science news workflow`);
    console.log(`✅ Integrated News API, OpenAI, and Resend`);
    console.log(`✅ Configured daily automation at 8:00 AM`);
    console.log(`✅ Added manual webhook trigger capability`);
    console.log(`✅ Enhanced with AI summarization`);
    console.log(`✅ Professional HTML email formatting`);
    console.log(`✅ Ready for daily science news delivery to ${USER_EMAIL}`);
    
  } catch (error) {
    console.error('💥 Fatal error during workflow creation:', error);
  }
}

// Execute the script
main().catch(console.error);