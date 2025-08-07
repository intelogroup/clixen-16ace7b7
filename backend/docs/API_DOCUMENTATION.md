# Clixen MVP REST API Documentation

## Overview

The Clixen MVP provides a comprehensive REST API built on Supabase Edge Functions with production-ready features including authentication, rate limiting, validation, and comprehensive error handling.

## Base URL

```
https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1
```

## Authentication

All API endpoints require authentication using Bearer tokens from Supabase Auth.

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

Get tokens via Supabase Auth:
- Frontend: Use `@supabase/supabase-js` client
- Direct API: Use Supabase Auth API endpoints

## Rate Limiting

Rate limits vary by user tier:

| Tier | Requests/Minute | Requests/Hour | Burst Limit |
|------|-----------------|---------------|-------------|
| Free | 30 | 500 | 50 |
| Pro | 100 | 2000 | 150 |
| Enterprise | 300 | 10000 | 500 |

Rate limit headers in responses:
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when rate limit resets
- `X-RateLimit-Tier`: User's current tier

## Standard Response Format

All endpoints return responses in this format:

```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "error": string,
  "timestamp": string,
  "metadata": {
    "processing_time": number,
    "rate_limit": {
      "remaining": number,
      "reset_time": number,
      "tier": string
    }
  }
}
```

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Validation failed |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 413 | Request Too Large - Body exceeds limits |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 502 | Bad Gateway - External service error |

---

# API Endpoints

## Projects API

Manage user projects containing workflows.

**Base Path:** `/projects-api`

### List Projects

```http
GET /projects-api/projects
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Project",
      "description": "Project description",
      "color": "#3B82F6",
      "workflow_count": 5,
      "deployed_workflows": 3,
      "active_chat_sessions": 1,
      "last_activity_at": "2025-01-08T12:00:00Z",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ]
}
```

### Create Project

```http
POST /projects-api/projects
Content-Type: application/json

{
  "name": "New Project",
  "description": "Optional description",
  "color": "#FF0000"
}
```

### Get Project

```http
GET /projects-api/projects/{id}
```

### Update Project

```http
PUT /projects-api/projects/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "color": "#00FF00"
}
```

### Delete Project

```http
DELETE /projects-api/projects/{id}
```

**Note:** Projects with workflows cannot be deleted.

### Get Project Workflows

```http
GET /projects-api/projects/{id}/workflows
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Workflow",
      "description": "Workflow description",
      "status": "deployed",
      "deployment_status": "deployed",
      "created_at": "2025-01-01T12:00:00Z",
      "last_deployed_at": "2025-01-02T12:00:00Z"
    }
  ]
}
```

---

## Workflows API

Generate and deploy n8n workflows using AI.

**Base Path:** `/workflows-api`

### Generate Workflow

```http
POST /workflows-api/workflows/generate
Content-Type: application/json

{
  "prompt": "Create a workflow that sends an email when a webhook is triggered",
  "project_id": "uuid",
  "name": "Email Notification Workflow",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflow": {
      "id": "uuid",
      "name": "Email Notification Workflow",
      "n8n_workflow_json": { /* n8n workflow object */ },
      "original_prompt": "Create a workflow...",
      "status": "draft",
      "deployment_status": "not_deployed"
    },
    "generated_name": "AI-generated name",
    "generated_description": "AI-generated description",
    "node_count": 3
  }
}
```

### Deploy Workflow

```http
POST /workflows-api/workflows/{id}/deploy
Content-Type: application/json

{
  "activate": true,
  "test_data": { "optional": "test data" }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "n8n_workflow_id": "n8n-id",
    "deployment_url": "http://n8n-url/workflow/id",
    "webhook_urls": ["http://n8n-url/webhook/path"],
    "status": "deployed"
  }
}
```

### Get Workflow Status

```http
GET /workflows-api/workflows/{id}/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflow_id": "uuid",
    "n8n_workflow_id": "n8n-id",
    "status": "deployed",
    "deployment_status": "deployed",
    "deployment_url": "http://n8n-url/workflow/id",
    "execution_count": 42,
    "last_execution_at": "2025-01-08T12:00:00Z",
    "health_score": 95,
    "webhook_urls": ["http://n8n-url/webhook/path"]
  }
}
```

### Get Workflow Details

```http
GET /workflows-api/workflows/{id}
```

---

## Chat API

Manage AI chat sessions and messages.

**Base Path:** `/chat-api`

### Create Chat Session

```http
POST /chat-api/chat/sessions
Content-Type: application/json

{
  "project_id": "uuid",
  "title": "New Chat Session",
  "workflow_id": "uuid" // optional
}
```

### List Chat Sessions

```http
GET /chat-api/chat/sessions?project_id=uuid&limit=20
```

### Get Chat Session

```http
GET /chat-api/chat/sessions/{id}
```

### Update Chat Session

```http
PUT /chat-api/chat/sessions/{id}
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "completed",
  "user_satisfied": true
}
```

### Send Message

```http
POST /chat-api/chat/sessions/{id}/messages
Content-Type: application/json

{
  "message": "Create a webhook workflow for Slack notifications",
  "agent_type": "workflow_designer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_message": {
      "id": "uuid",
      "content": "Create a webhook workflow...",
      "role": "user",
      "created_at": "2025-01-08T12:00:00Z"
    },
    "ai_response": {
      "id": "uuid",
      "content": "I'll create a Slack notification workflow...",
      "role": "assistant",
      "agent_type": "workflow_designer",
      "tokens_used": 150,
      "processing_time_ms": 2500
    },
    "session": { /* updated session object */ }
  }
}
```

### Get Chat History

```http
GET /chat-api/chat/sessions/{id}/messages?limit=50
```

Alternative endpoint:
```http
GET /chat-api/chat/{sessionId}/history?limit=50
```

---

## Telemetry API

Log events and view analytics.

**Base Path:** `/telemetry-api`

### Log Event

```http
POST /telemetry-api/telemetry/events
Content-Type: application/json

{
  "event_type": "workflow_created",
  "event_category": "workflow",
  "project_id": "uuid",
  "workflow_id": "uuid",
  "event_data": {
    "workflow_name": "My Workflow",
    "node_count": 5
  },
  "duration_ms": 1500,
  "success": true
}
```

### Get User Events

```http
GET /telemetry-api/telemetry/events?category=workflow&limit=100&offset=0
```

### Get Dashboard Analytics

```http
GET /telemetry-api/analytics/dashboard
```

**Response:** (Enterprise tier gets full analytics, others get limited view)
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_users": 1250,
      "total_projects": 890,
      "total_workflows": 3200,
      "total_deployments": 1850,
      "active_sessions": 45
    },
    "recent_activity": {
      "signups_last_7_days": 25,
      "workflows_created_last_7_days": 150,
      "deployments_last_7_days": 85,
      "chat_sessions_last_7_days": 200
    },
    "user_engagement": {
      "avg_workflows_per_user": 2.56,
      "avg_deployments_per_user": 1.48,
      "workflow_success_rate": 89.5,
      "deployment_success_rate": 92.3
    }
  }
}
```

---

## Legacy n8n Operations API

Direct n8n API proxy for advanced operations.

**Base Path:** `/api-operations`

### Health Check

```http
GET /api-operations/health
```

### Direct n8n Proxy

```http
POST /api-operations
Content-Type: application/json

{
  "action": "n8n-request",
  "endpoint": "/workflows",
  "method": "GET"
}
```

### Workflow Operations

```http
GET /api-operations/workflows
GET /api-operations/workflows/{id}
POST /api-operations/workflows
PUT /api-operations/workflows/{id}
DELETE /api-operations/workflows/{id}
POST /api-operations/workflows/{id}/toggle
POST /api-operations/workflows/{id}/execute
```

### Execution History

```http
GET /api-operations/executions?workflowId={id}&limit=20
```

### Batch Operations

```http
POST /api-operations/batch
Content-Type: application/json

{
  "operations": [
    {
      "operation": "create",
      "data": { /* workflow object */ }
    },
    {
      "operation": "activate",
      "workflowId": "workflow-id"
    }
  ]
}
```

---

## Validation Rules

### Common Validations

- **UUIDs**: Must be valid UUID format
- **Names**: 1-255 characters, non-empty
- **Descriptions**: 0-2000 characters
- **Colors**: Valid hex format (#RRGGBB)
- **Messages**: 1-10000 characters for chat
- **Prompts**: 10-5000 characters for workflow generation

### Request Size Limits

- General APIs: 100KB max request body
- Workflow APIs: 500KB max (for large n8n JSON)
- File uploads: 5MB max

### Security Features

- **Input Sanitization**: HTML tags and scripts removed
- **XSS Protection**: Event handlers and JavaScript protocols blocked
- **Security Headers**: CSP, HSTS, and other security headers
- **CORS**: Properly configured for frontend domains

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zfbgdixbzezpxllkoyfc.supabase.co',
  'your-anon-key'
);

// Authenticate
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Make API call
const response = await fetch(
  'https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/projects-api/projects',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
```

### cURL

```bash
# Get projects
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/projects-api/projects

# Create project
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"My Project","color":"#3B82F6"}' \
     https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/projects-api/projects

# Generate workflow
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"Send email on webhook","project_id":"uuid"}' \
     https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/workflows-api/workflows/generate
```

---

## Environment Setup

Required environment variables in Supabase Edge Functions:

```bash
SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
N8N_API_URL=http://18.221.12.50:5678/api/v1
N8N_API_KEY=your-n8n-api-key
OPENAI_API_KEY=your-openai-key  # Optional fallback
```

## Deployment

Deploy functions using Supabase CLI:

```bash
# Deploy all functions
supabase functions deploy --project-ref zfbgdixbzezpxllkoyfc

# Deploy specific function
supabase functions deploy projects-api --project-ref zfbgdixbzezpxllkoyfc
```

## Support

For issues or questions:
1. Check error responses for detailed error messages
2. Review rate limiting headers if getting 429 errors
3. Ensure proper authentication tokens
4. Validate request format against this documentation

---

**Last Updated:** January 8, 2025
**API Version:** MVP 1.0
**Status:** Production Ready ✅