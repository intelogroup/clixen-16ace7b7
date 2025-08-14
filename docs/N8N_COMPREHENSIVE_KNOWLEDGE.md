# 📖 n8n Comprehensive Knowledge Base

**Last Updated**: August 14, 2025  
**Purpose**: Complete n8n understanding for reliable workflow generation in Clixen

---

## 🔄 Core Workflow Components

### 1. Trigger Nodes (Workflow Starters)

#### Webhook Trigger
```javascript
{
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 1.1,
  "parameters": {
    "httpMethod": "POST",
    "path": "webhook-path",
    "authentication": "none", // or "basicAuth", "headerAuth", "jwtAuth"
    "responseMode": "onReceived", // "lastNode", "responseNode"
    "responseCode": 200,
    "responseData": "allEntries" // "firstEntryJson", "firstEntryBinary", "noData"
  }
}
```
**Key Features**:
- Test URL vs Production URL
- 16MB max payload (configurable)
- Path parameters support: `/:variable/path/:variable2`
- CORS configuration
- IP whitelist option

#### Schedule Trigger (Cron)
```javascript
{
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.1,
  "parameters": {
    "rule": {
      "interval": [
        {
          "triggerInterval": "cronExpression",
          "expression": "0 9 * * 1-5" // 9 AM weekdays
        }
      ]
    }
  }
}
```
**Intervals**: Seconds, Minutes, Hours, Days, Weeks, Months, Custom (Cron)
**Note**: 6-part cron (includes seconds): `* * * * * *`

#### Email Trigger (IMAP)
```javascript
{
  "type": "n8n-nodes-base.emailTrigger",
  "parameters": {
    "mailbox": "INBOX",
    "postProcessAction": "nothing", // or "read"
    "downloadAttachments": true,
    "format": "resolved" // "raw", "simple"
  }
}
```

### Other Common Triggers
- **Manual Trigger**: For testing (`n8n-nodes-base.manualTrigger`)
- **Execute Workflow Trigger**: For sub-workflows
- **Error Trigger**: For error handling workflows
- **Form Trigger**: Web forms
- **SSE Trigger**: Server-sent events

---

## 🔀 Flow Control Nodes

### IF Node (Conditional)
```javascript
{
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "parameters": {
    "conditions": {
      "options": {
        "caseSensitive": true,
        "leftValue": "",
        "typeValidation": "strict"
      },
      "combinator": "and", // or "or"
      "conditions": [
        {
          "leftValue": "={{ $json.status }}",
          "rightValue": "active",
          "operator": {
            "type": "string",
            "operation": "equals"
          }
        }
      ]
    }
  }
}
```

### Switch Node (Multiple Paths)
```javascript
{
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3,
  "parameters": {
    "mode": "expression",
    "output": "all", // or "firstMatch"
    "rules": [
      {
        "outputKey": "high",
        "condition": "={{ $json.priority === 'high' }}"
      },
      {
        "outputKey": "medium",
        "condition": "={{ $json.priority === 'medium' }}"
      }
    ]
  }
}
```

### Loop Over Items
```javascript
{
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3,
  "parameters": {
    "batchSize": 10,
    "options": {
      "reset": false
    }
  }
}
```

### Merge Node
```javascript
{
  "type": "n8n-nodes-base.merge",
  "typeVersion": 3,
  "parameters": {
    "mode": "combine", // "append", "keepKeyMatches", "mergeByIndex", "multiplex"
    "options": {
      "clashHandling": {
        "values": "preferInput2"
      }
    }
  }
}
```

---

## 📊 Data Manipulation

### Variables & Expressions

#### Core Variables
```javascript
// Current node input
$json                    // Current item's JSON data
$binary                   // Current item's binary data
$input.item              // Current input item
$input.all()             // All input items
$input.first()           // First input item
$input.last()            // Last input item

// Output from other nodes
$('NodeName').item       // Specific node's current item
$('NodeName').all()      // All items from specific node
$('NodeName').first()    // First item from specific node
$('NodeName').last()     // Last item from specific node
$('NodeName').params     // Node's parameters

// Workflow & execution
$workflow.name           // Workflow name
$workflow.id             // Workflow ID
$execution.id            // Execution ID
$execution.mode          // "manual", "trigger", etc.
$execution.resumeUrl     // Resume URL for wait nodes

// Environment
$env['VAR_NAME']         // Environment variable
$vars.varName            // Workflow variable

// Position & iteration
$itemIndex               // Current item index
$runIndex                // Current run index (in loops)
$nodeContext            // Node-specific context
```

#### Expression Examples
```javascript
// String manipulation
{{ $json.name.toUpperCase() }}
{{ $json.email.split('@')[0] }}

// Conditional
{{ $json.age >= 18 ? 'adult' : 'minor' }}

// Date handling
{{ DateTime.now().toISO() }}
{{ DateTime.fromISO($json.date).plus({days: 7}).toISO() }}

// Number formatting
{{ Number($json.price).toFixed(2) }}
{{ Math.round($json.value * 100) / 100 }}

// Array operations
{{ $json.items.map(item => item.name).join(', ') }}
{{ $json.tags.filter(tag => tag.active) }}

// Object access with fallback
{{ $json.user?.email || 'no-email@example.com' }}
```

### Data Transformation Nodes

#### Set/Edit Fields
```javascript
{
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "parameters": {
    "mode": "manual",
    "fields": {
      "values": [
        {
          "name": "processedAt",
          "value": "={{ DateTime.now().toISO() }}"
        },
        {
          "name": "status",
          "value": "processed"
        }
      ]
    }
  }
}
```

#### Code Node
```javascript
{
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "parameters": {
    "mode": "runOnceForEachItem", // or "runOnceForAllItems"
    "language": "javaScript", // or "python"
    "jsCode": `
      // Access input
      const item = $input.item.json;
      
      // Process data
      const processed = {
        ...item,
        timestamp: new Date().toISOString(),
        calculated: item.value * 2
      };
      
      // Return must be array of objects
      return processed;
    `
  }
}
```

#### Other Data Nodes
- **Aggregate**: Group items together
- **Sort**: Order items
- **Limit**: Restrict number of items
- **Remove Duplicates**: Filter unique items
- **Split Out**: Expand arrays into items
- **Summarize**: Create pivot table-like summaries

---

## 🔐 Authentication & Credentials

### Authentication Types

#### Basic Auth
```javascript
{
  "type": "httpBasicAuth",
  "properties": {
    "user": "username",
    "password": "password"
  }
}
```

#### Header Auth
```javascript
{
  "type": "httpHeaderAuth",
  "properties": {
    "name": "Authorization",
    "value": "Bearer token_value"
  }
}
```

#### OAuth2
```javascript
{
  "type": "oAuth2Api",
  "properties": {
    "grantType": "authorizationCode",
    "authUrl": "https://api.example.com/oauth/authorize",
    "accessTokenUrl": "https://api.example.com/oauth/token",
    "clientId": "client_id",
    "clientSecret": "client_secret",
    "scope": "read write",
    "authQueryParameters": "",
    "authentication": "header"
  }
}
```

#### API Key
```javascript
{
  "type": "httpQueryAuth",
  "properties": {
    "name": "api_key",
    "value": "your_api_key"
  }
}
```

---

## ⚠️ Error Handling

### Error Workflow Setup
```javascript
// Error trigger node (must be first)
{
  "type": "n8n-nodes-base.errorTrigger",
  "typeVersion": 1,
  "position": [250, 300]
}

// Error data structure received
{
  "execution": {
    "id": "231",
    "url": "https://n8n.example.com/execution/231",
    "retryOf": "34",
    "error": {
      "message": "Error message",
      "stack": "Stack trace"
    },
    "lastNodeExecuted": "Node Name",
    "mode": "manual"
  },
  "workflow": {
    "id": "1",
    "name": "Workflow Name"
  }
}
```

### Stop And Error Node
```javascript
{
  "type": "n8n-nodes-base.stopAndError",
  "parameters": {
    "errorMessage": "Custom error: {{ $json.reason }}"
  }
}
```

### Try-Catch Pattern
```javascript
// Main branch with potential error
// → IF node checking for error condition
// → True: Stop And Error
// → False: Continue processing
```

---

## 🗄️ Database Operations

### Common Database Nodes
```javascript
// PostgreSQL
{
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2.5,
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT * FROM users WHERE active = true",
    "options": {
      "queryBatching": "transaction",
      "largeNumbersOutput": "numbers"
    }
  }
}

// MySQL
{
  "type": "n8n-nodes-base.mySql",
  "parameters": {
    "operation": "executeQuery",
    "query": "INSERT INTO logs (message, timestamp) VALUES (?, NOW())",
    "options": {
      "queryBatching": "independently"
    }
  }
}

// MongoDB
{
  "type": "n8n-nodes-base.mongoDb",
  "parameters": {
    "operation": "find",
    "collection": "users",
    "query": "{ \"status\": \"active\" }",
    "options": {
      "limit": 100,
      "sort": "{ \"createdAt\": -1 }"
    }
  }
}
```

---

## 🌐 HTTP & API Operations

### HTTP Request Node
```javascript
{
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "parameters": {
    "method": "POST",
    "url": "https://api.example.com/endpoint",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "data",
          "value": "={{ JSON.stringify($json) }}"
        }
      ]
    },
    "options": {
      "timeout": 10000,
      "batching": {
        "batch": {
          "batchSize": 10,
          "batchInterval": 1000
        }
      },
      "pagination": {
        "pagination": {
          "paginationMode": "responseContainsNextURL",
          "nextURL": "={{ $response.body.next }}",
          "paginationCompleteWhen": "receiveSpecificStatusCodes",
          "statusCodes": "404"
        }
      }
    }
  }
}
```

---

## 📁 File Operations

### Read/Write Binary Files
```javascript
// Read Binary File
{
  "type": "n8n-nodes-base.readBinaryFile",
  "parameters": {
    "filePath": "/path/to/file.pdf",
    "dataPropertyName": "data"
  }
}

// Write Binary File
{
  "type": "n8n-nodes-base.writeBinaryFile",
  "parameters": {
    "fileName": "/output/file.pdf",
    "dataPropertyName": "data",
    "options": {
      "append": false
    }
  }
}
```

### Spreadsheet Operations
```javascript
// Read from file
{
  "type": "n8n-nodes-base.spreadsheetFile",
  "parameters": {
    "operation": "fromFile",
    "fileFormat": "csv",
    "options": {
      "headerRow": true,
      "delimiter": ",",
      "fromLine": 1,
      "maxRowCount": 1000
    }
  }
}

// Write to file
{
  "type": "n8n-nodes-base.spreadsheetFile",
  "parameters": {
    "operation": "toFile",
    "fileFormat": "xlsx",
    "options": {
      "headerRow": true,
      "fileName": "export.xlsx"
    }
  }
}
```

---

## 🔧 Node Connection Types

### Connection Structure
```javascript
{
  "connections": {
    "Start": {
      "main": [
        [
          {
            "node": "HTTP Request",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "IF": {
      "main": [
        // Output 0 (true branch)
        [
          {
            "node": "Set True",
            "type": "main",
            "index": 0
          }
        ],
        // Output 1 (false branch)
        [
          {
            "node": "Set False",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### Connection Rules
1. **Main connections**: Standard data flow
2. **Error connections**: Error output (red line)
3. **Multiple outputs**: IF/Switch nodes have multiple branches
4. **Multiple inputs**: Merge nodes accept multiple inputs

---

## 🚀 Performance Optimization

### Batching
```javascript
{
  "options": {
    "batching": {
      "batch": {
        "batchSize": 100,
        "batchInterval": 1000 // ms
      }
    }
  }
}
```

### Pagination
```javascript
{
  "options": {
    "pagination": {
      "pagination": {
        "paginationMode": "off", // "responseContainsNextURL", "setParametersValue"
        "limitPagesFetched": true,
        "maxRequests": 10
      }
    }
  }
}
```

### Rate Limiting
```javascript
{
  "options": {
    "rateLimiting": {
      "rateLimit": {
        "limit": 10,
        "interval": 1000 // ms
      }
    }
  }
}
```

---

## 🔒 Security Best Practices

### 1. Credential Management
- Never hardcode credentials in workflow JSON
- Use credential references: `"credentials": { "httpHeaderAuth": { "id": "1", "name": "API Auth" }}`
- Implement least privilege access

### 2. Input Validation
```javascript
// Always validate external input
if (!$json.email || !$json.email.includes('@')) {
  throw new Error('Invalid email format');
}
```

### 3. SQL Injection Prevention
```javascript
// Use parameterized queries
"query": "SELECT * FROM users WHERE id = $1",
"additionalFields": {
  "queryParams": ["{{ $json.userId }}"]
}
```

### 4. Error Handling
- Implement error workflows
- Don't expose sensitive data in error messages
- Log errors securely

### 5. Webhook Security
- Use authentication (Basic, Header, JWT)
- Implement IP whitelisting
- Validate webhook signatures
- Use HTTPS only

---

## 📈 Workflow Settings & Configuration

### Workflow Settings
```javascript
{
  "settings": {
    "executionOrder": "v1",
    "saveExecutionProgress": true,
    "saveDataSuccessExecution": "all",
    "saveDataErrorExecution": "all",
    "saveManualExecutions": true,
    "callerPolicy": "workflowsFromSameOwner",
    "errorWorkflow": "workflow_id",
    "timezone": "America/New_York",
    "timeout": 3600,
    "maxExecutionTime": -1
  }
}
```

### Environment Variables
```javascript
// Access in expressions
{{ $env.MY_ENV_VAR }}

// Common variables
N8N_PAYLOAD_SIZE_MAX=16
N8N_METRICS=true
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
GENERIC_TIMEZONE=America/New_York
```

---

## ✅ Complete Node Type Reference

### Core Nodes
- **Data Transformation**: Set, Code, Function, Function Item
- **Flow Control**: IF, Switch, Merge, Loop Over Items, Split In Batches
- **Error Handling**: Stop And Error, Error Trigger
- **Utility**: No Op, Wait, Execute Command, Execute Workflow
- **Files**: Read/Write Binary File, Spreadsheet File, Read/Write File from Disk
- **Communication**: Send Email, Email Trigger (IMAP), HTTP Request, Webhook, SSE
- **Database**: Postgres, MySQL, MongoDB, Redis, SQLite, MSSQL
- **Scheduling**: Schedule Trigger, Interval
- **Debugging**: Sticky Note

### Common Integration Patterns
1. **API Integration**: Webhook → HTTP Request → Transform → Response
2. **Data Pipeline**: Database → Transform → Filter → Database
3. **Notification**: Trigger → Process → IF → Send Email/Slack
4. **File Processing**: File Trigger → Read → Transform → Write
5. **Scheduled Reports**: Schedule → Query → Aggregate → Email

---

## 🎯 Key Learnings for Clixen

### Essential for Workflow Generation:
1. **Every workflow needs a trigger** (Manual, Webhook, Schedule, etc.)
2. **Connections define flow** - Must properly structure the connections object
3. **Variables use double curly braces** `{{ expression }}`
4. **Error handling is critical** - Always consider failure scenarios
5. **Node versions matter** - Different versions have different parameters
6. **Authentication varies by service** - Must match credential type to node
7. **Data flows as items** - Arrays of JSON objects between nodes
8. **Expressions access data via $** - $json, $node, $workflow, etc.

### Common Pitfalls to Avoid:
1. Missing required parameters in nodes
2. Incorrect expression syntax
3. Wrong node type versions
4. Invalid connection structure
5. Hardcoded credentials
6. Missing error handling
7. Incorrect data type expectations
8. Wrong authentication methods

This comprehensive knowledge enables generating any type of n8n workflow accurately!