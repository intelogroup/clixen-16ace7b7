# API Operations Edge Function Guide

## Overview

The API Operations Edge Function is a comprehensive solution for managing n8n workflows through the Clixen platform. It provides enterprise-grade features including rate limiting, quota management, batch operations, and seamless integration with the multi-agent system.

## 🚀 Deployment

### Quick Deploy
```bash
./deploy-api-operations.sh
```

### Manual Deployment
```bash
# Install Supabase CLI
npm install -g supabase

# Login with access token
supabase login --token sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f

# Link to project
supabase link --project-ref zfbgdixbzezpxllkoyfc

# Deploy function
supabase functions deploy api-operations --project-ref zfbgdixbzezpxllkoyfc

# Set environment variables
supabase secrets set --project-ref zfbgdixbzezpxllkoyfc \
  SUPABASE_URL="https://zfbgdixbzezpxllkoyfc.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="[service-role-key]" \
  N8N_API_URL="http://18.221.12.50:5678/api/v1" \
  N8N_API_KEY="[n8n-api-key]"
```

## 🌐 API Endpoints

### Base URL
- **Production**: `https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/api-operations`
- **Netlify**: `/.netlify/functions/api-operations`

### Authentication
All endpoints (except `/health`) require authentication:
```
Authorization: Bearer <supabase-jwt-token>
```

## 📊 Available Endpoints

### Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "healthy",
  "n8n": true,
  "database": true,
  "timestamp": "2025-08-04T12:00:00Z"
}
```

### Workflows

#### List Workflows
```http
GET /workflows
```

#### Get Specific Workflow
```http
GET /workflows/{id}
```

#### Create Workflow
```http
POST /workflows
Content-Type: application/json

{
  "name": "My Workflow",
  "active": false,
  "nodes": [...],
  "connections": {...}
}
```

#### Update Workflow
```http
PUT /workflows/{id}
Content-Type: application/json

{
  "name": "Updated Workflow",
  "settings": {...}
}
```

#### Delete Workflow
```http
DELETE /workflows/{id}
```

#### Toggle Workflow (Activate/Deactivate)
```http
POST /workflows/{id}/toggle
Content-Type: application/json

{
  "active": true
}
```

#### Execute Workflow
```http
POST /workflows/{id}/execute
Content-Type: application/json

{
  "data": {
    "input": "value"
  }
}
```

### Executions

#### List Executions
```http
GET /executions?workflowId={id}&limit=20
```

### Batch Operations

#### Execute Multiple Operations
```http
POST /batch
Content-Type: application/json

{
  "operations": [
    {
      "operation": "create",
      "data": { "name": "Workflow 1", ... }
    },
    {
      "operation": "update",
      "workflowId": "workflow-id",
      "data": { "name": "Updated Name" }
    },
    {
      "operation": "toggle",
      "workflowId": "workflow-id",
      "data": { "active": true }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "results": [
      {
        "operation": "create",
        "success": true,
        "data": { ... }
      },
      ...
    ],
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0,
      "processing_time": 1250
    }
  }
}
```

## 🛡️ Rate Limiting & Quotas

### User Tiers

| Tier | Requests/Min | Requests/Hour | Burst Limit |
|------|--------------|---------------|-------------|
| Free | 10 | 100 | 15 |
| Pro | 30 | 1,000 | 50 |
| Enterprise | 100 | 10,000 | 200 |

### Rate Limit Headers
When rate limited, you'll receive:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "error": "Rate limit exceeded",
  "reset_time": 1722772800000,
  "tier": "free"
}
```

## 📈 API Usage Tracking

All API calls are automatically tracked in the `api_usage` table with:
- User ID
- API name (`n8n`)
- Endpoint called
- Usage count
- Cost units
- Metadata (operation details)

## 🔧 Multi-Agent Integration

### Using with TypeScript Client
```typescript
import { apiOperationsClient } from '@/lib/api/ApiOperationsClient';

// Get all workflows
const workflows = await apiOperationsClient.getWorkflows();

// Safe deployment
const result = await apiOperationsClient.deployWorkflowSafely({
  name: "AI Generated Workflow",
  active: true,
  nodes: [...],
  connections: {...}
});

// Validate before execution
const validation = await apiOperationsClient.validateWorkflowBeforeExecution(workflowId);
if (!validation.valid) {
  console.log('Issues:', validation.issues);
}
```

### Agent Integration Example
```typescript
// In DeploymentAgent.ts
import { apiOperationsClient } from '@/lib/api/ApiOperationsClient';

class DeploymentAgent extends BaseAgent {
  async deployWorkflow(workflow: N8nWorkflow) {
    try {
      // Validate first
      const validation = await apiOperationsClient.validateWorkflowBeforeExecution(workflow.id);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.issues.join(', ')}`
        };
      }

      // Deploy safely
      const result = await apiOperationsClient.deployWorkflowSafely(workflow);
      
      if (result.success) {
        // Get metrics
        const metrics = await apiOperationsClient.getWorkflowMetrics(result.workflowId!);
        
        return {
          success: true,
          workflowId: result.workflowId,
          metrics
        };
      } else {
        return result;
      }
    } catch (error) {
      if (apiOperationsClient.isRateLimited(error)) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.'
        };
      }
      
      throw error;
    }
  }
}
```

## 🧪 Testing

### Run Test Suite
```bash
# Install dependencies if needed
npm install @supabase/supabase-js

# Run comprehensive tests
./test-api-operations.mjs
```

### Test Coverage
- ✅ Health check
- ✅ Authentication & authorization
- ✅ Rate limiting
- ✅ All CRUD operations
- ✅ Batch operations
- ✅ Error handling
- ✅ Invalid requests

## 🚨 Error Handling

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Authentication required | Missing or invalid JWT token |
| 429 | Rate limit exceeded | Too many requests for user tier |
| 404 | Endpoint not found | Invalid API endpoint |
| 400 | Invalid request | Malformed request body |
| 500 | Internal server error | n8n API or database error |

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-08-04T12:00:00Z"
}
```

## 🔍 Monitoring & Debugging

### Health Monitoring
The `/health` endpoint provides real-time status:
- n8n API connectivity
- Database connectivity
- Overall system health

### Logging
All operations are logged with:
- User ID
- Operation type
- Success/failure status
- Processing time
- Error details (if any)

### Performance Metrics
- Average response time
- Success rate
- Rate limit hit rate
- Cost per operation

## 🛠️ Maintenance

### Environment Variables
Required environment variables:
```bash
SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[key]
N8N_API_URL=http://18.221.12.50:5678/api/v1
N8N_API_KEY=[key]
```

### Database Dependencies
- `api_usage` table for usage tracking
- `api_quotas` table for tier management
- `auth.users` for user tier information

### Scaling Considerations
- In-memory rate limiting (upgrade to Redis for production scale)
- Connection pooling for n8n API
- Batch operation limits
- Database query optimization

## 🔗 Integration Examples

### React Component
```typescript
import { useState, useEffect } from 'react';
import { apiOperationsClient } from '@/lib/api/ApiOperationsClient';

function WorkflowManager() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkflows() {
      try {
        const data = await apiOperationsClient.getWorkflows();
        setWorkflows(data);
      } catch (error) {
        console.error('Failed to load workflows:', error);
      } finally {
        setLoading(false);
      }
    }

    loadWorkflows();
  }, []);

  const handleDeploy = async (workflow) => {
    const result = await apiOperationsClient.deployWorkflowSafely(workflow);
    if (result.success) {
      // Refresh workflow list
      const updated = await apiOperationsClient.getWorkflows();
      setWorkflows(updated);
    }
  };

  return (
    <div>
      {loading ? (
        <div>Loading workflows...</div>
      ) : (
        <div>
          {workflows.map(workflow => (
            <div key={workflow.id}>
              <h3>{workflow.name}</h3>
              <button onClick={() => handleDeploy(workflow)}>
                Deploy
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Multi-Agent Workflow
```typescript
// 1. Orchestrator identifies need for workflow
// 2. WorkflowDesigner creates workflow definition
// 3. DeploymentAgent uses API Operations to deploy
// 4. System monitors via health checks and metrics

const orchestratedDeployment = async (userRequirement: string) => {
  // Orchestrator processes requirement
  const workflowSpec = await orchestratorAgent.processRequirement(userRequirement);
  
  // Workflow Designer creates workflow
  const workflow = await workflowDesignerAgent.createWorkflow(workflowSpec);
  
  // Deployment Agent deploys via API Operations
  const deployment = await deploymentAgent.deploy(workflow);
  
  return deployment;
};
```

## 📚 Additional Resources

- [n8n API Documentation](https://docs.n8n.io/api/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Multi-Agent System Architecture](./multi-agent-architecture.md)
- [Rate Limiting Best Practices](./rate-limiting-guide.md)