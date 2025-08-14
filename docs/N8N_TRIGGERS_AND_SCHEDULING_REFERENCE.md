# N8N Triggers, Scheduling & API Rate Limiting - Reference Guide

> **Research Date**: August 14, 2025  
> **Source**: Official n8n Documentation via Firecrawl  
> **Purpose**: Clixen workflow generation best practices and troubleshooting

---

## 🚀 **Schedule Trigger - Core Configuration**

### **Cron Expression Syntax (CRITICAL)**
```bash
# Format: minute hour day-of-month month day-of-week
"*/30 * * * *"    # Every 30 minutes
"0 9 * * *"       # Daily at 9 AM  
"15 * * * *"      # Every hour at 15 minutes past
"0 8 * * 1-5"     # Weekdays at 8 AM
"*/10 * * * *"    # Every 10 minutes
```

### **⚠️ Critical Limitations**
- **Minimum Interval**: 1 minute (Community Edition)
- **Timezone**: Uses server timezone (UTC typically)
- **Execution Overlap**: New executions start before previous finish
- **Resource Impact**: High-frequency schedules consume server resources

### **🎯 Recommended Intervals by Use Case**
| Use Case | Recommended Interval | Reason |
|----------|---------------------|--------|
| **Weather Data** | 30-60 minutes | APIs update hourly |
| **News Feeds** | 15-30 minutes | Frequent updates |
| **Stock Prices** | 5-15 minutes | Market volatility |
| **Social Media** | 10-30 minutes | Engagement tracking |
| **Heavy Processing** | 4-12 hours | Resource intensive |

---

## 🔧 **Manual vs Webhook Triggers**

### **Manual Trigger Best Practices**
- **Primary Use**: Testing, one-time executions, debugging
- **Position**: Always at [240, 200] for consistency
- **Connection**: Must connect to main workflow logic
- **⚠️ Limitation**: Cannot be triggered programmatically via API

### **Webhook Trigger Configuration**
```json
{
  "parameters": {
    "path": "weather-update-{{$workflow.id}}",
    "httpMethod": "POST", 
    "responseMode": "onReceived",
    "authentication": "none"
  },
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 1
}
```

### **🔒 Webhook Security Guidelines**
- **Unique Paths**: Include workflow ID or random string
- **Authentication**: Enable when possible
- **HTTPS Only**: Never HTTP in production
- **Client Rate Limiting**: Implement throttling

---

## ⚡ **API Rate Limiting & Error Handling**

### **HTTP Request Node with Retry Logic**
```json
{
  "parameters": {
    "url": "https://api.example.com/data",
    "options": {
      "timeout": 30000,
      "retry": {
        "enabled": true,
        "maxRetries": 3,
        "retryOnStatus": [429, 500, 502, 503, 504],
        "retryBackoff": "exponential"
      },
      "headers": {
        "User-Agent": "Clixen-Bot/1.0 (https://clixen.app)"
      }
    }
  },
  "continueOnFail": true,
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3
}
```

### **🚨 Rate Limiting Patterns**
1. **Exponential Backoff**: 1s → 2s → 4s → 8s delays
2. **Status Code Handling**: 
   - **Retry**: 429 (rate limit), 5xx (server errors)
   - **Fail**: 4xx (client errors, except 429)
3. **Timeout Settings**: 30s external APIs, 10s internal
4. **Circuit Breaker**: Stop after 3 consecutive failures

### **🌤️ Weather API Specific Limits**
| API Service | Rate Limit | Monthly Limit | Recommendation |
|-------------|------------|---------------|----------------|
| **OpenWeatherMap** | 60 calls/minute | 1M calls | Every 2-5 minutes max |
| **WeatherAPI** | No rate limit | 1M calls | Every 1-2 minutes |
| **wttr.in** | Unofficial | Unknown | **Every 1 minute MAX** |
| **AccuWeather** | 50 calls/day | Limited | Every 30-60 minutes |

---

## 🛠️ **Error Handling Strategies**

### **Node-Level Error Configuration**
```json
{
  "continueOnFail": true,
  "alwaysOutputData": true, 
  "onError": "continueErrorOutput"
}
```

### **Workflow-Level Error Handling Pattern**
```javascript
// IF Node - Check API Success
const apiResponse = $json;
if (apiResponse.error || !apiResponse.data) {
  // Route to fallback branch
  return [null, [{
    json: {
      error: true,
      fallback: true,
      message: "API failed, using cached data"
    }
  }]];
}
// Route to success branch
return [apiResponse, null];
```

### **⚠️ Common Error Scenarios & Solutions**
| Error Type | HTTP Status | Solution |
|------------|-------------|----------|
| **API Timeout** | No response | Increase timeout to 30s, add retry |
| **Rate Limited** | 429 | Exponential backoff, reduce frequency |
| **Invalid Response** | 200 but bad data | Add response validation |
| **Network Issues** | 5xx | Circuit breaker pattern |
| **Auth Expired** | 401/403 | Token refresh logic |

---

## 🎯 **Production Scheduling Best Practices**

### **Scheduling Guidelines**
1. **Weather Updates**: Every 30-60 minutes during active hours (6 AM - 10 PM)
2. **API Quota Management**: Monitor daily/monthly usage limits
3. **Off-Peak Processing**: Schedule heavy tasks during low-traffic hours (2-6 AM)
4. **Timezone Consistency**: Always use UTC for scheduling
5. **Holiday/Weekend Logic**: Reduce frequency on non-business days

### **Resource Optimization**
```json
{
  "settings": {
    "executionTimeout": 300,
    "maxExecutionTime": "5m",
    "saveDataErrorExecution": "all",
    "saveDataSuccessExecution": "none"
  }
}
```

### **Performance Limits**
- **Item Processing**: Max 1000 items per node
- **Memory Management**: Clear unnecessary data between nodes  
- **Batch Processing**: Use SplitInBatches for large datasets

---

## 🚨 **Community Edition Limitations**

### **Known Restrictions**
- **No Built-in Rate Limiting**: Must implement retry logic manually
- **Limited Execution History**: 100 executions maximum
- **Basic Error Handling**: Manual configuration required
- **No Advanced Monitoring**: Custom logging needed
- **Timezone Support**: Server timezone only
- **Concurrent Executions**: Limited queue management

### **Workarounds**
1. **Rate Limiting**: Implement exponential backoff in HTTP nodes
2. **Monitoring**: Use webhook notifications for failures
3. **Logging**: Add function nodes for custom error logging
4. **Execution Management**: Use workflow static data for counters

---

## 🔧 **Clixen Workflow Generation Rules**

### **🚀 MANDATORY Trigger Configuration**
```json
// Always include BOTH triggers
{
  "nodes": [
    {
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "position": [240, 200]
    },
    {
      "name": "Schedule Trigger", 
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{"field": "cronExpression", "cronExpression": "*/30 * * * *"}]
        }
      },
      "position": [240, 350]
    }
  ]
}
```

### **🛡️ MANDATORY Error Handling**
```javascript
// Add to all HTTP Request nodes
if (!$json || $json.error) {
  return [{
    json: {
      success: false,
      error: $json.error || "API request failed",
      fallback: true,
      timestamp: new Date().toISOString()
    }
  }];
}
```

### **✅ Required Headers for External APIs**
```json
{
  "headers": {
    "User-Agent": "Clixen/1.0 (https://clixen.app)",
    "Accept": "application/json",
    "Cache-Control": "no-cache"
  }
}
```

---

## 📊 **Santa Monica Weather Workflow - Specific Fixes**

### **Root Cause Analysis**
- **2-minute intervals**: Too aggressive for wttr.in API
- **Missing User-Agent**: Causing request blocking
- **No retry logic**: Single failure stops entire workflow
- **No error handling**: Workflow dies on first API failure

### **✅ Corrected Schedule Configuration**
```json
{
  "parameters": {
    "rule": {
      "interval": [{"field": "cronExpression", "cronExpression": "*/30 * * * *"}]
    }
  },
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.1
}
```

### **✅ Corrected HTTP Request**
```json
{
  "parameters": {
    "url": "http://wttr.in/Santa Monica,CA?format=j1",
    "options": {
      "timeout": 15000,
      "retry": {
        "enabled": true,
        "maxRetries": 2,
        "retryOnStatus": [429, 500, 502, 503, 504]
      },
      "headers": {
        "User-Agent": "Clixen-Weather-Bot/1.0"
      }
    }
  },
  "continueOnFail": true
}
```

---

## 🎯 **Key Takeaways for All Clixen Workflows**

### **✅ ALWAYS Include:**
1. **Dual Triggers**: Manual (testing) + Schedule/Webhook (production)
2. **Retry Logic**: 3 retries with exponential backoff
3. **Error Branches**: Handle API failures gracefully  
4. **Reasonable Intervals**: 30-60 minutes for most APIs
5. **User-Agent Headers**: Identify your application
6. **Response Validation**: Check API response structure
7. **Fallback Data**: Provide default values on failure
8. **Execution Logging**: Track success/failure rates

### **⚠️ NEVER Do:**
1. **Sub-minute scheduling** for external APIs
2. **Missing error handling** in HTTP requests
3. **Hard-coded credentials** in workflows
4. **Unlimited retry loops** without backoff
5. **Missing timeout settings** on HTTP requests
6. **Ignoring API rate limits** and quotas

This reference guide should prevent future scheduling and rate limiting issues in all Clixen-generated workflows.