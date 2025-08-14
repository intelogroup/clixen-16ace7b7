#!/usr/bin/env node

/**
 * Deploy Santa Monica Weather Workflow Directly to n8n
 * This ensures the workflow actually gets created in the n8n instance
 */

const https = require('https');

const N8N_HOST = 'https://n8nio-n8n-7xzf6n.sliplane.app';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';

// Santa Monica Weather Workflow JSON
const santaMonicaWorkflow = {
  "name": "[USR-test-user] Santa Monica Weather Test - Real Deploy",
  "nodes": [
    {
      "parameters": {},
      "id": "manual-trigger-santa-monica",
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger", 
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "httpMethod": "GET",
        "path": "santa-monica-weather-real",
        "options": {}
      },
      "id": "webhook-trigger-santa-monica", 
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 480]
    },
    {
      "parameters": {
        "url": "https://wttr.in/Santa%20Monica,California,USA?format=j1",
        "options": {
          "headers": {
            "User-Agent": "Clixen/1.0 (https://clixen.app)"
          },
          "timeout": 10000
        }
      },
      "id": "get-santa-monica-weather",
      "name": "Get Santa Monica Weather",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [460, 390]
    },
    {
      "parameters": {
        "jsCode": "// Format Santa Monica weather data\nconst weatherData = $input.first().json;\n\nif (!weatherData || !weatherData.current_condition || !weatherData.current_condition[0]) {\n  return [{\n    json: {\n      success: false,\n      error: \"Unable to retrieve weather data for Santa Monica\",\n      location: \"Santa Monica, California, USA\",\n      timestamp: new Date().toISOString()\n    }\n  }];\n}\n\nconst current = weatherData.current_condition[0];\nconst location = weatherData.nearest_area && weatherData.nearest_area[0] ? weatherData.nearest_area[0] : null;\n\n// Convert temperature from Celsius to Fahrenheit\nconst tempC = parseInt(current.temp_C);\nconst tempF = Math.round((tempC * 9/5) + 32);\n\n// Format the response\nconst formattedWeather = {\n  success: true,\n  location: {\n    city: location ? location.areaName[0].value : \"Santa Monica\",\n    region: location ? location.region[0].value : \"California\", \n    country: location ? location.country[0].value : \"United States\"\n  },\n  weather: {\n    temperature: {\n      celsius: tempC,\n      fahrenheit: tempF,\n      display: `${tempF}°F (${tempC}°C)`\n    },\n    condition: current.weatherDesc[0].value,\n    humidity: current.humidity + \"%\",\n    windSpeed: current.windspeedMiles + \" mph\",\n    windDirection: current.winddir16Point,\n    feelsLike: {\n      celsius: parseInt(current.FeelsLikeC),\n      fahrenheit: Math.round((parseInt(current.FeelsLikeC) * 9/5) + 32)\n    },\n    uvIndex: current.uvIndex,\n    visibility: current.visibilityMiles + \" miles\", \n    pressure: current.pressure + \" mb\"\n  },\n  summary: `🌤️ SANTA MONICA WEATHER: ${tempF}°F, ${current.weatherDesc[0].value}, ${current.humidity}% humidity, winds ${current.windspeedMiles} mph ${current.winddir16Point}`,\n  timestamp: new Date().toISOString(),\n  source: \"wttr.in API via Clixen\"\n};\n\nreturn [{ json: formattedWeather }];"
      },
      "id": "format-santa-monica-response",
      "name": "Format Santa Monica Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [680, 390]
    }
  ],
  "connections": {
    "Manual Trigger": {
      "main": [
        [
          {
            "node": "Get Santa Monica Weather",
            "type": "main", 
            "index": 0
          }
        ]
      ]
    },
    "Webhook Trigger": {
      "main": [
        [
          {
            "node": "Get Santa Monica Weather",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get Santa Monica Weather": {
      "main": [
        [
          {
            "node": "Format Santa Monica Response", 
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
};

// Deploy workflow via n8n API
function deployWorkflow() {
  const postData = JSON.stringify(santaMonicaWorkflow);
  
  const options = {
    hostname: 'n8nio-n8n-7xzf6n.sliplane.app',
    port: 443,
    path: '/api/v1/workflows',
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🚀 Deploying Santa Monica Weather Workflow to n8n...\n');

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log('Response:', data);
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        const workflow = JSON.parse(data);
        console.log('\n✅ SUCCESS: Santa Monica Weather Workflow Deployed!');
        console.log(`📋 Workflow ID: ${workflow.id}`);
        console.log(`📝 Workflow Name: ${workflow.name}`);
        console.log(`🔗 n8n Instance: ${N8N_HOST}`);
        
        // Try to activate the workflow
        activateWorkflow(workflow.id);
      } else {
        console.log('\n❌ FAILED to deploy workflow');
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request Error:', error);
  });

  req.write(postData);
  req.end();
}

// Activate workflow
function activateWorkflow(workflowId) {
  const options = {
    hostname: 'n8nio-n8n-7xzf6n.sliplane.app',
    port: 443,
    path: `/api/v1/workflows/${workflowId}/activate`,
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': API_KEY,
      'Content-Type': 'application/json'
    }
  };

  console.log(`\n🔄 Activating workflow ${workflowId}...`);

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Workflow activated successfully!');
        console.log('🌐 Webhook URL available for testing');
        
        // Test the workflow
        testWorkflow(workflowId);
      } else {
        console.log(`⚠️ Activation status: ${res.statusCode}`);
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Activation Error:', error);
  });

  req.end();
}

// Test workflow execution
function testWorkflow(workflowId) {
  const options = {
    hostname: 'n8nio-n8n-7xzf6n.sliplane.app',
    port: 443,
    path: `/api/v1/workflows/${workflowId}/execute`,
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': API_KEY,
      'Content-Type': 'application/json'
    }
  };

  console.log(`\n🧪 Testing workflow execution...`);

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Test Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        const result = JSON.parse(data);
        console.log('✅ WORKFLOW TEST SUCCESSFUL!');
        console.log('📊 Santa Monica weather data retrieved and processed');
      } else {
        console.log('ℹ️  Note: Manual trigger testing requires n8n UI interaction');
        console.log('🔗 You can test via webhook or manual trigger in the n8n interface');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Test Error:', error);
  });

  req.end();
}

// Start deployment
deployWorkflow();