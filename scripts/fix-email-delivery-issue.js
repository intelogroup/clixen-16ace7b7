#!/usr/bin/env node

const axios = require('axios');

// Configuration
const N8N_BASE_URL = 'http://18.221.12.50:5678';
const N8N_API_URL = `${N8N_BASE_URL}/api/v1`;
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// User details
const USER_EMAIL = 'jimkalinov@gmail.com';
const WORKFLOW_NAME_PATTERN = 'Science News';

async function diagnoseProblem() {
    console.log('🔍 Diagnosing Email Delivery Issue for jimkalinov@gmail.com...');
    console.log('=' .repeat(70));
    
    const diagnosis = {
        serverAccessible: false,
        workflowExists: false,
        workflowActive: false,
        credentialsValid: false,
        recentExecutions: [],
        issues: [],
        recommendations: []
    };
    
    try {
        // 1. Test n8n server connectivity
        console.log('\\n1. 🌐 Testing n8n server connectivity...');
        
        try {
            const healthResponse = await axios.get(`${N8N_BASE_URL}/healthz`, {
                timeout: 5000
            });
            console.log('✅ n8n server is accessible');
            diagnosis.serverAccessible = true;
        } catch (error) {
            console.log('❌ n8n server is NOT accessible');
            console.log(`   Error: ${error.message}`);
            diagnosis.issues.push('n8n server is down or inaccessible at http://18.221.12.50:5678');
            diagnosis.recommendations.push('Restart n8n service or check network connectivity');
            
            // Try to get more info about the server issue
            try {
                await axios.get(N8N_BASE_URL, { timeout: 3000 });
            } catch (webError) {
                console.log('   Web interface also inaccessible');
                diagnosis.issues.push('n8n web interface is also down');
            }
        }
        
        // If server is not accessible, we can't proceed with other checks
        if (!diagnosis.serverAccessible) {
            console.log('\\n⚠️  Cannot proceed with further diagnostics - server is down');
            return diagnosis;
        }
        
        // 2. Check for Science News workflows
        console.log('\\n2. 📋 Checking for Science News workflows...');
        
        try {
            const workflowsResponse = await axios.get(`${N8N_API_URL}/workflows`, {
                headers: {
                    'X-N8N-API-KEY': N8N_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            const allWorkflows = workflowsResponse.data.data;
            const scienceWorkflows = allWorkflows.filter(wf => 
                (wf.name.toLowerCase().includes('science') || wf.name.toLowerCase().includes('news')) &&
                (wf.name.toLowerCase().includes('jimkalinov') || wf.name.toLowerCase().includes('usr-'))
            );
            
            console.log(`   Found ${scienceWorkflows.length} Science News workflow(s):`);
            
            scienceWorkflows.forEach((wf, index) => {
                console.log(`   ${index + 1}. "${wf.name}" (ID: ${wf.id}) - Active: ${wf.active ? '✅' : '❌'}`);
                if (index === 0) {
                    diagnosis.workflowExists = true;
                    diagnosis.workflowActive = wf.active;
                }
            });
            
            if (scienceWorkflows.length === 0) {
                diagnosis.issues.push('No Science News workflow found for jimkalinov@gmail.com');
                diagnosis.recommendations.push('Create or deploy the Science News workflow');
            } else if (!scienceWorkflows[0].active) {
                diagnosis.issues.push('Science News workflow exists but is not active');
                diagnosis.recommendations.push('Activate the Science News workflow');
            }
            
        } catch (error) {
            console.log('❌ Failed to check workflows');
            console.log(`   Error: ${error.message}`);
            diagnosis.issues.push('Cannot access workflow list - API authentication issue');
        }
        
        // 3. Check recent executions
        console.log('\\n3. 📊 Checking recent workflow executions...');
        
        try {
            const executionsResponse = await axios.get(`${N8N_API_URL}/executions?limit=10`, {
                headers: {
                    'X-N8N-API-KEY': N8N_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            const executions = executionsResponse.data.data;
            console.log(`   Found ${executions.length} recent executions`);
            
            // Look for recent Science News executions
            const recentScienceExecs = executions.filter(exec => 
                exec.workflowData && 
                (exec.workflowData.name.toLowerCase().includes('science') || 
                 exec.workflowData.name.toLowerCase().includes('news'))
            );
            
            console.log(`   Science News executions: ${recentScienceExecs.length}`);
            
            recentScienceExecs.forEach((exec, index) => {
                const status = exec.finished ? 'Completed' : exec.stoppedAt ? 'Failed' : 'Running';
                const startTime = new Date(exec.startedAt).toLocaleString();
                console.log(`   ${index + 1}. ${status} - ${startTime} (ID: ${exec.id})`);
                
                diagnosis.recentExecutions.push({
                    id: exec.id,
                    status: status,
                    startTime: startTime,
                    finished: exec.finished
                });
            });
            
            if (recentScienceExecs.length === 0) {
                diagnosis.issues.push('No recent Science News workflow executions found');
                diagnosis.recommendations.push('Manually trigger the workflow to test execution');
            } else {
                const failedExecs = recentScienceExecs.filter(exec => !exec.finished && exec.stoppedAt);
                if (failedExecs.length > 0) {
                    diagnosis.issues.push(`${failedExecs.length} recent workflow executions failed`);
                    diagnosis.recommendations.push('Check execution logs for specific error details');
                }
            }
            
        } catch (error) {
            console.log('⚠️  Could not check executions');
            console.log(`   Error: ${error.message}`);
        }
        
        // 4. Test API credentials (basic connectivity)
        console.log('\\n4. 🔑 Testing API endpoints (without credentials)...');
        
        const apiTests = [
            { name: 'News API', url: 'https://newsapi.org/v2/top-headlines?country=us&pageSize=1' },
            { name: 'OpenAI API', url: 'https://api.openai.com/v1/models' },
            { name: 'Resend API', url: 'https://api.resend.com/domains' }
        ];
        
        for (const test of apiTests) {
            try {
                await axios.get(test.url, { timeout: 5000 });
                console.log(`   ✅ ${test.name}: Endpoint accessible`);
            } catch (error) {
                const statusCode = error.response?.status;
                if (statusCode === 401 || statusCode === 403) {
                    console.log(`   ✅ ${test.name}: Endpoint accessible (auth required)`);
                } else {
                    console.log(`   ❌ ${test.name}: Endpoint issue (${statusCode || 'timeout'})`);
                    if (test.name === 'Resend API') {
                        diagnosis.issues.push(`${test.name} endpoint not accessible - may affect email delivery`);
                    }
                }
            }
        }
        
        return diagnosis;
        
    } catch (error) {
        console.error('🚨 Unexpected error during diagnosis:', error.message);
        diagnosis.issues.push(`Unexpected error: ${error.message}`);
        return diagnosis;
    }
}

async function provideSolution(diagnosis) {
    console.log('\\n' + '=' .repeat(70));
    console.log('🎯 EMAIL DELIVERY ISSUE DIAGNOSIS SUMMARY');
    console.log('=' .repeat(70));
    
    console.log(`\\n📧 Target: ${USER_EMAIL}`);
    console.log(`🎯 Workflow: Science News Daily Email`);
    
    console.log('\\n📊 Status Check:');
    console.log(`   🌐 n8n Server: ${diagnosis.serverAccessible ? '✅ Accessible' : '❌ Down/Inaccessible'}`);
    console.log(`   📋 Workflow Exists: ${diagnosis.workflowExists ? '✅ Found' : '❌ Missing'}`);
    console.log(`   🔄 Workflow Active: ${diagnosis.workflowActive ? '✅ Active' : '❌ Inactive'}`);
    console.log(`   📊 Recent Executions: ${diagnosis.recentExecutions.length} found`);
    
    console.log('\\n🚨 Issues Identified:');
    if (diagnosis.issues.length === 0) {
        console.log('   ✅ No major issues found');
    } else {
        diagnosis.issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ❌ ${issue}`);
        });
    }
    
    console.log('\\n🛠️  Recommended Actions:');
    if (diagnosis.recommendations.length === 0) {
        console.log('   ✅ System appears healthy');
        console.log('   💡 Issue may be with API credentials - check n8n credential configuration');
    } else {
        diagnosis.recommendations.forEach((rec, index) => {
            console.log(`   ${index + 1}. 🔧 ${rec}`);
        });
    }
    
    // Specific solution based on primary issue
    console.log('\\n🎯 PRIMARY SOLUTION:');
    
    if (!diagnosis.serverAccessible) {
        console.log('   🔴 CRITICAL: n8n server is down');
        console.log('   📋 Immediate action needed:');
        console.log('      1. Check if n8n process is running');
        console.log('      2. Restart n8n service');
        console.log('      3. Check server logs for errors');
        console.log('      4. Verify network connectivity to 18.221.12.50:5678');
    } else if (!diagnosis.workflowExists) {
        console.log('   🟡 SETUP: Science News workflow missing');
        console.log('   📋 Action needed:');
        console.log('      1. Deploy the Science News workflow for jimkalinov@gmail.com');
        console.log('      2. Configure proper API credentials');
        console.log('      3. Activate the workflow');
    } else if (diagnosis.recentExecutions.length === 0) {
        console.log('   🟠 EXECUTION: Workflow not running');
        console.log('   📋 Likely cause: Invalid API credentials');
        console.log('   📋 Action needed:');
        console.log('      1. Check n8n credentials for News API, OpenAI, and Resend');
        console.log('      2. Replace placeholder values with real API keys');
        console.log('      3. Test manual workflow execution');
    } else {
        console.log('   🟡 CREDENTIALS: API authentication likely failing');
        console.log('   📋 Action needed:');
        console.log('      1. Update n8n credentials with valid API keys:');
        console.log('         - News API: Get from https://newsapi.org/register');
        console.log('         - OpenAI: Get from https://platform.openai.com/api-keys');
        console.log('         - Resend: Get from https://resend.com/api-keys');
        console.log('      2. Test workflow execution');
        console.log('      3. Monitor jimkalinov@gmail.com for email delivery');
    }
    
    console.log('\\n📧 Expected Result:');
    console.log('   Once fixed, jimkalinov@gmail.com should receive:');
    console.log('   - Daily science news emails at 8:00 AM');
    console.log('   - AI-enhanced summaries of top science stories');
    console.log('   - Professionally formatted HTML emails via Resend');
}

async function main() {
    try {
        const diagnosis = await diagnoseProblem();
        await provideSolution(diagnosis);
        
        console.log('\\n' + '=' .repeat(70));
        console.log('🔍 Diagnosis completed. Follow the recommended actions to fix email delivery.');
        
    } catch (error) {
        console.error('❌ Diagnosis failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { diagnoseProblem, provideSolution };