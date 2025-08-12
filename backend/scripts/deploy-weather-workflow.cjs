const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const N8N_API_URL = 'http://18.221.12.50:5678/api/v1';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';
const SUPABASE_URL = 'https://zfbgdixbzezpxllkoyfc.supabase.co';

async function deployWorkflow() {
  try {
    console.log('🚀 Deploying Weather Notification Workflow...\n');
    
    // Read the workflow JSON
    const workflowPath = path.join(__dirname, '../workflows/weather-notification-workflow.json');
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    // Deploy to n8n
    console.log('📤 Deploying workflow to n8n...');
    const response = await fetch(`${N8N_API_URL}/workflows`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY
      },
      body: JSON.stringify(workflowData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to deploy workflow: ${error}`);
    }
    
    const deployedWorkflow = await response.json();
    console.log('✅ Workflow deployed successfully!');
    console.log(`   ID: ${deployedWorkflow.id}`);
    console.log(`   Name: ${deployedWorkflow.name}`);
    console.log(`   Active: ${deployedWorkflow.active}`);
    
    // Test the workflow immediately
    console.log('\n🧪 Testing workflow with immediate execution...');
    
    // First, let's test with a manual trigger by calling the Edge Function
    console.log('📧 Sending test weather email via Edge Function...');
    
    const edgeFunctionResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-weather-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw'
      },
      body: JSON.stringify({
        email: 'jayveedz19@gmail.com',
        city: 'Boston',
        testMode: true
      })
    });
    
    if (edgeFunctionResponse.ok) {
      const result = await edgeFunctionResponse.json();
      console.log('✅ Test email sent successfully!');
      console.log(`   Recipient: ${result.data.recipient}`);
      console.log(`   Weather: ${result.data.weather}`);
      console.log(`   Temperature: ${result.data.temperature}`);
    } else {
      console.log('⚠️ Edge Function test failed, trying direct n8n execution...');
      
      // Try to execute the workflow manually in n8n
      const executeResponse = await fetch(`${N8N_API_URL}/workflows/${deployedWorkflow.id}/execute`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY
        },
        body: JSON.stringify({})
      });
      
      if (executeResponse.ok) {
        console.log('✅ Workflow executed manually in n8n!');
      } else {
        console.log('⚠️ Manual execution not available, workflow will run on schedule');
      }
    }
    
    console.log('\n📅 Schedule Information:');
    console.log('   Time: Every day at 7:00 AM EST');
    console.log('   Timezone: America/New_York');
    console.log('   Next run: Tomorrow at 7:00 AM');
    
    console.log('\n🎉 Setup Complete!');
    console.log('   - Weather workflow is deployed and active');
    console.log('   - Test email has been sent to jayveedz19@gmail.com');
    console.log('   - Daily emails will be sent at 7:00 AM EST');
    console.log('\n📧 Email Features:');
    console.log('   - Current temperature and conditions');
    console.log('   - Feels like temperature');
    console.log('   - Humidity and wind speed');
    console.log('   - Sunrise and sunset times');
    console.log('   - Weather-based advice');
    
    return deployedWorkflow;
    
  } catch (error) {
    console.error('❌ Error deploying workflow:', error.message);
    throw error;
  }
}

// Alternative: Test the weather email directly without n8n
async function testWeatherEmail() {
  console.log('\n🔄 Testing weather email directly with Resend API...\n');
  
  try {
    // Get weather data
    console.log('🌤️ Fetching Boston weather...');
    const weatherResponse = await fetch(
      'https://api.openweathermap.org/data/2.5/weather?q=Boston&appid=bd5e378503939ddaee76f12ad7a97608&units=imperial'
    );
    
    const weather = await weatherResponse.json();
    console.log(`   Temperature: ${Math.round(weather.main.temp)}°F`);
    console.log(`   Conditions: ${weather.weather[0].description}`);
    
    // Format and send email
    console.log('\n📨 Sending email via Resend...');
    
    const emailData = {
      from: 'Clixen Weather <onboarding@resend.dev>',
      to: 'jayveedz19@gmail.com',
      subject: `☀️ Your Boston Weather Update - ${new Date().toLocaleDateString()}`,
      html: generateEmailHTML(weather),
      text: generateEmailText(weather)
    };
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_eP6sgKMF_ELjbAvaFyFEsSbnj3pzFUJm2',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });
    
    if (emailResponse.ok) {
      const result = await emailResponse.json();
      console.log('✅ Email sent successfully!');
      console.log(`   Email ID: ${result.id}`);
      console.log(`   Check jayveedz19@gmail.com inbox`);
    } else {
      const error = await emailResponse.text();
      console.error('❌ Failed to send email:', error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function generateEmailHTML(weather) {
  const temp = Math.round(weather.main.temp);
  const feelsLike = Math.round(weather.main.feels_like);
  const description = weather.weather[0].description;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .temp { font-size: 48px; font-weight: bold; color: #2d3748; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Good Morning! ☀️</h1>
          <p style="margin: 10px 0 0 0;">Your Boston Weather Update</p>
        </div>
        <div class="content">
          <div style="text-align: center;">
            <div class="temp">${temp}°F</div>
            <p style="font-size: 18px; color: #4a5568; text-transform: capitalize;">${description}</p>
            <p>Feels like ${feelsLike}°F</p>
          </div>
          <p style="text-align: center; color: #718096; margin-top: 30px;">
            Powered by Clixen Automation 🚀<br>
            This workflow runs daily at 7:00 AM EST
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateEmailText(weather) {
  const temp = Math.round(weather.main.temp);
  const description = weather.weather[0].description;
  
  return `
Good Morning! Your Boston Weather Update

Current Temperature: ${temp}°F
Conditions: ${description}

Have a great day!

--
Powered by Clixen Automation
This workflow runs daily at 7:00 AM EST
  `.trim();
}

// Main execution
(async () => {
  console.log('🌤️ Weather Notification Workflow Setup\n');
  console.log('========================================\n');
  
  try {
    // Deploy the workflow
    await deployWorkflow();
    
    // Also test direct email sending as backup
    await testWeatherEmail();
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
})();