#!/usr/bin/env node

/**
 * Deploy Enhanced Santa Monica Weather Workflow with Auto-Scheduler
 * Features:
 * - Manual trigger starts 5-minute cycle
 * - Auto-triggers every minute for 5 minutes total
 * - Tracks execution count and timing
 * - Stops automatically after 5 executions
 */

const https = require('https');

const N8N_HOST = 'n8nio-n8n-7xzf6n.sliplane.app';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiN2ZmZWU5My04YTBlLTQwYTItYmMyYi0xOGE1NDliODAwZDYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MTAzNzc1fQ.mXnHtIvlmj-93EjwXZqBwzmUx9uUIddS4fO3TGMRCZ0';

// Enhanced Santa Monica Weather Workflow with Auto-Scheduler
const santaMonicaSchedulerWorkflow = {
  "name": "[USR-test-user] Santa Monica Weather - Auto Scheduler",
  "nodes": [
    {
      "parameters": {},
      "id": "manual-trigger-scheduler",
      "name": "Manual Trigger Start",
      "type": "n8n-nodes-base.manualTrigger", 
      "typeVersion": 1,
      "position": [240, 200]
    },
    {
      "parameters": {
        "httpMethod": "GET",
        "path": "santa-monica-scheduler",
        "options": {}
      },
      "id": "webhook-trigger-scheduler", 
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 380]
    },
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "value": "*/1 * * * *"
            }
          ]
        }
      },
      "id": "cron-every-minute",
      "name": "Cron Every Minute",
      "type": "n8n-nodes-base.cron",
      "typeVersion": 1,
      "position": [240, 560]
    },
    {
      "parameters": {
        "jsCode": "// Initialize or check scheduler state\nconst currentTime = new Date();\nconst staticData = $workflow.staticData;\n\n// Check if manual trigger was pressed or if this is a cron execution\nconst isManualTrigger = $node.name === 'Manual Trigger Start';\nconst isWebhook = $node.name === 'Webhook Trigger';\nconst isCron = $node.name === 'Cron Every Minute';\n\n// Initialize scheduler state on manual trigger\nif (isManualTrigger || isWebhook) {\n  staticData.schedulerActive = true;\n  staticData.startTime = currentTime.toISOString();\n  staticData.executionCount = 0;\n  staticData.maxExecutions = 5;\n  staticData.intervalMinutes = 1;\n  \n  console.log('🚀 SCHEDULER STARTED: 5-minute cycle initiated');\n  console.log(`⏰ Start Time: ${currentTime.toLocaleString()}`);\n  console.log('📋 Will execute every minute for 5 minutes total');\n  \n  return [{\n    json: {\n      action: 'start_cycle',\n      schedulerActive: true,\n      startTime: staticData.startTime,\n      executionCount: 0,\n      maxExecutions: 5,\n      message: '🚀 Scheduler cycle started - fetching initial weather data'\n    }\n  }];\n}\n\n// Handle cron execution\nif (isCron) {\n  // Check if scheduler is active\n  if (!staticData.schedulerActive) {\n    console.log('⏸️  Scheduler not active - skipping cron execution');\n    return [];\n  }\n  \n  // Check if we've exceeded the time limit (5 minutes + 30 second buffer)\n  const startTime = new Date(staticData.startTime);\n  const elapsedMinutes = (currentTime - startTime) / (1000 * 60);\n  \n  if (elapsedMinutes > 5.5) {\n    staticData.schedulerActive = false;\n    console.log('⏹️  SCHEDULER STOPPED: 5-minute cycle completed');\n    console.log(`📊 Total executions: ${staticData.executionCount}`);\n    console.log(`⏰ Total runtime: ${Math.round(elapsedMinutes * 10) / 10} minutes`);\n    return [];\n  }\n  \n  // Check execution count limit\n  if (staticData.executionCount >= staticData.maxExecutions) {\n    staticData.schedulerActive = false;\n    console.log('⏹️  SCHEDULER STOPPED: Maximum executions reached');\n    console.log(`📊 Completed ${staticData.executionCount} executions`);\n    return [];\n  }\n  \n  // Continue with execution\n  staticData.executionCount = (staticData.executionCount || 0) + 1;\n  \n  console.log(`🔄 SCHEDULED EXECUTION #${staticData.executionCount}`);\n  console.log(`⏰ Elapsed: ${Math.round(elapsedMinutes * 10) / 10} minutes`);\n  console.log(`📋 Remaining: ${staticData.maxExecutions - staticData.executionCount} executions`);\n  \n  return [{\n    json: {\n      action: 'scheduled_execution',\n      executionCount: staticData.executionCount,\n      maxExecutions: staticData.maxExecutions,\n      elapsedMinutes: Math.round(elapsedMinutes * 10) / 10,\n      remainingExecutions: staticData.maxExecutions - staticData.executionCount,\n      message: `🔄 Scheduled execution #${staticData.executionCount} - fetching weather data`\n    }\n  }];\n}\n\n// Default fallback\nreturn [{\n  json: {\n    action: 'unknown',\n    message: 'Unknown trigger type',\n    timestamp: currentTime.toISOString()\n  }\n}];"
      },
      "id": "scheduler-manager",
      "name": "Scheduler Manager",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [460, 380]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.action }}",
              "operation": "notEqual",
              "value2": "unknown"
            }
          ]
        }
      },
      "id": "check-should-execute",
      "name": "Should Execute?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [660, 380]
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
      "id": "get-santa-monica-weather-scheduled",
      "name": "Get Santa Monica Weather",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [860, 300]
    },
    {
      "parameters": {
        "jsCode": "// Format Santa Monica weather data with scheduler info\nconst weatherData = $input.first().json;\nconst schedulerData = $input.last().json;\n\nif (!weatherData || !weatherData.current_condition || !weatherData.current_condition[0]) {\n  return [{\n    json: {\n      success: false,\n      error: \"Unable to retrieve weather data for Santa Monica\",\n      location: \"Santa Monica, California, USA\",\n      timestamp: new Date().toISOString(),\n      scheduler: schedulerData\n    }\n  }];\n}\n\nconst current = weatherData.current_condition[0];\nconst location = weatherData.nearest_area && weatherData.nearest_area[0] ? weatherData.nearest_area[0] : null;\n\n// Convert temperature from Celsius to Fahrenheit\nconst tempC = parseInt(current.temp_C);\nconst tempF = Math.round((tempC * 9/5) + 32);\n\n// Format the enhanced response with scheduler info\nconst formattedWeather = {\n  success: true,\n  scheduler: {\n    executionType: schedulerData.action,\n    executionNumber: schedulerData.executionCount || 'initial',\n    maxExecutions: schedulerData.maxExecutions || 5,\n    elapsedMinutes: schedulerData.elapsedMinutes || 0,\n    remainingExecutions: schedulerData.remainingExecutions || 'N/A',\n    isScheduled: schedulerData.action === 'scheduled_execution'\n  },\n  location: {\n    city: location ? location.areaName[0].value : \"Santa Monica\",\n    region: location ? location.region[0].value : \"California\", \n    country: location ? location.country[0].value : \"United States\"\n  },\n  weather: {\n    temperature: {\n      celsius: tempC,\n      fahrenheit: tempF,\n      display: `${tempF}°F (${tempC}°C)`\n    },\n    condition: current.weatherDesc[0].value,\n    humidity: current.humidity + \"%\",\n    windSpeed: current.windspeedMiles + \" mph\",\n    windDirection: current.winddir16Point,\n    feelsLike: {\n      celsius: parseInt(current.FeelsLikeC),\n      fahrenheit: Math.round((parseInt(current.FeelsLikeC) * 9/5) + 32)\n    },\n    uvIndex: current.uvIndex,\n    visibility: current.visibilityMiles + \" miles\", \n    pressure: current.pressure + \" mb\"\n  },\n  summary: `🌤️ SANTA MONICA [${schedulerData.action === 'scheduled_execution' ? `AUTO #${schedulerData.executionCount}` : 'MANUAL'}]: ${tempF}°F, ${current.weatherDesc[0].value}, ${current.humidity}% humidity`,\n  timestamp: new Date().toISOString(),\n  source: \"wttr.in API via Clixen Auto-Scheduler\"\n};\n\nreturn [{ json: formattedWeather }];"
      },
      "id": "format-scheduled-response",
      "name": "Format Scheduled Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1060, 300]
    },
    {
      "parameters": {
        "jsCode": "// Create detailed scheduler report\nconst data = $input.first().json;\n\nif (!data.success) {\n  return [{\n    json: {\n      display: `❌ Error: ${data.error}`,\n      result: data\n    }\n  }];\n}\n\n// Create execution type indicator\nconst typeIndicator = data.scheduler.isScheduled \n  ? `🔄 AUTO EXECUTION #${data.scheduler.executionNumber}/${data.scheduler.maxExecutions}` \n  : '🚀 MANUAL START';\n\n// Create timing info\nconst timingInfo = data.scheduler.isScheduled \n  ? `⏰ Elapsed: ${data.scheduler.elapsedMinutes}min | Remaining: ${data.scheduler.remainingExecutions} executions`\n  : '⏰ Scheduler: Started 5-minute cycle';\n\n// Create formatted display\nconst display = `\n🌤️ SANTA MONICA WEATHER - AUTO SCHEDULER\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${typeIndicator}\n${timingInfo}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📍 Location: ${data.location.city}, ${data.location.region}\n🌡️  Temperature: ${data.weather.temperature.display}\n☁️  Conditions: ${data.weather.condition}\n💧 Humidity: ${data.weather.humidity}\n💨 Wind: ${data.weather.windSpeed} ${data.weather.windDirection}\n👥 Feels Like: ${data.weather.feelsLike.fahrenheit}°F\n☀️  UV Index: ${data.weather.uvIndex}\n👁️  Visibility: ${data.weather.visibility}\n📊 Pressure: ${data.weather.pressure}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 Status: ${data.scheduler.isScheduled ? 'SCHEDULED EXECUTION' : 'CYCLE STARTED'}\n⏰ Retrieved: ${new Date(data.timestamp).toLocaleString()}\n🔗 Data Source: ${data.source}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;\n\nconsole.log('='.repeat(60));\nconsole.log('SANTA MONICA WEATHER - AUTO SCHEDULER');\nconsole.log('='.repeat(60));\nconsole.log(typeIndicator);\nconsole.log(timingInfo);\nconsole.log('='.repeat(60));\nconsole.log(data.summary);\nconsole.log('='.repeat(60));\n\nreturn [{\n  json: {\n    display: display,\n    summary: data.summary,\n    weatherData: data,\n    schedulerInfo: data.scheduler,\n    testStatus: \"PASSED\",\n    executionTime: new Date().toISOString()\n  }\n}];\n"
      },
      "id": "display-scheduler-results",
      "name": "Display Scheduler Results",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1260, 300]
    }
  ],
  "connections": {
    "Manual Trigger Start": {
      "main": [
        [
          {
            "node": "Scheduler Manager",
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
            "node": "Scheduler Manager",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Cron Every Minute": {
      "main": [
        [
          {
            "node": "Scheduler Manager",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Scheduler Manager": {
      "main": [
        [
          {
            "node": "Should Execute?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Should Execute?": {
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
            "node": "Format Scheduled Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Format Scheduled Response": {
      "main": [
        [
          {
            "node": "Display Scheduler Results",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "saveDataErrorExecution": "all",
    "saveDataSuccessExecution": "all",
    "executionTimeout": 300
  }
};

// Deploy workflow via n8n API
function deploySchedulerWorkflow() {
  const postData = JSON.stringify(santaMonicaSchedulerWorkflow);
  
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

  console.log('🚀 Deploying Santa Monica Weather Auto-Scheduler to n8n...\n');

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status Code: ${res.statusCode}`);
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        const workflow = JSON.parse(data);
        console.log('\n✅ SUCCESS: Santa Monica Weather Auto-Scheduler Deployed!');
        console.log(`📋 Workflow ID: ${workflow.id}`);
        console.log(`📝 Workflow Name: ${workflow.name}`);
        console.log(`🔗 n8n Instance: https://${N8N_HOST}`);
        
        console.log('\n🎯 AUTO-SCHEDULER FEATURES:');
        console.log('• ▶️  Manual Trigger: Starts 5-minute cycle');
        console.log('• 🔄 Auto-trigger: Every 1 minute for 5 minutes');
        console.log('• ⏹️  Auto-stop: After 5 executions or 5 minutes');
        console.log('• 📊 Execution tracking: Counts and timing');
        console.log('• 🌐 Webhook trigger: Also starts cycle');
        
        // Activate the workflow
        activateSchedulerWorkflow(workflow.id);
      } else {
        console.log('\n❌ FAILED to deploy scheduler workflow');
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
function activateSchedulerWorkflow(workflowId) {
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

  console.log(`\n🔄 Activating auto-scheduler workflow ${workflowId}...`);

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Auto-scheduler workflow activated successfully!');
        console.log('🌐 Webhook URL: https://n8nio-n8n-7xzf6n.sliplane.app/webhook/santa-monica-scheduler');
        console.log('⏰ Cron scheduler: Active (every minute when cycle is running)');
        
        console.log('\n🧪 TEST INSTRUCTIONS:');
        console.log('1. Click "Manual Trigger Start" to begin 5-minute cycle');
        console.log('2. Watch console for scheduled executions every minute');
        console.log('3. Cycle automatically stops after 5 minutes');
        console.log('4. Click manual trigger again to restart cycle');
        
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

// Start deployment
deploySchedulerWorkflow();