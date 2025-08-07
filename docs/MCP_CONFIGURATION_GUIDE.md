# MCP Configuration Guide for Clixen AI Platform

## Overview

This guide documents the Model Context Protocol (MCP) server configuration for the Clixen AI automation platform. The setup includes three MCP servers providing comprehensive access to Netlify and Supabase services.

## Configured MCP Servers

### 1. Netlify MCP Server (`@netlify/mcp`)
**Purpose**: Full Netlify API access for deployment and site management

**Configuration Location**: `/root/repo/claude_desktop_config.json`
```json
{
  "netlify": {
    "command": "npx",
    "args": ["-y", "@netlify/mcp"],
    "env": {
      "NETLIFY_PERSONAL_ACCESS_TOKEN": "nfp_nJDfV7UNE6CQxcHdBpz2HmNc3TFyxcas7a2e"
    }
  }
}
```

**Available Operations**:
- `netlify-user-services`: Get user information and account details
- `netlify-deploy-services`: Deploy sites, get deployment status
- `netlify-project-services`: Manage projects, environment variables, forms
- `netlify-team-services`: Team management operations
- `netlify-extension-services`: Manage Netlify extensions
- `netlify-coding-rules`: Development best practices guidance

**Test Command**:
```bash
export NETLIFY_PERSONAL_ACCESS_TOKEN="nfp_nJDfV7UNE6CQxcHdBpz2HmNc3TFyxcas7a2e"
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npx @netlify/mcp
```

### 2. Official Supabase MCP Server (`@supabase/mcp-server-supabase`)
**Purpose**: Official Supabase project and database management

**Configuration Location**: `/root/repo/claude_desktop_config.json`
```json
{
  "supabase": {
    "command": "npx",
    "args": ["-y", "@supabase/mcp-server-supabase"],
    "env": {
      "SUPABASE_URL": "https://zfbgdixbzezpxllkoyfc.supabase.co",
      "SUPABASE_ACCESS_TOKEN": "sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f",
      "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig"
    }
  }
}
```

**Key Operations** (28 total tools):
- `list_projects`: List all Supabase projects
- `get_project`: Get project details and status
- `execute_sql`: Execute SQL queries on database
- `apply_migration`: Apply database migrations
- `create_project`: Create new Supabase projects
- `create_branch`: Create development branches
- `deploy_edge_function`: Deploy Edge Functions
- `list_tables`: List database tables
- `get_logs`: Get service logs for debugging
- `search_docs`: Search Supabase documentation

**Test Command**:
```bash
export SUPABASE_URL="https://zfbgdixbzezpxllkoyfc.supabase.co"
export SUPABASE_ACCESS_TOKEN="sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f"
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npx @supabase/mcp-server-supabase
```

### 3. Custom Supabase MCP Server (Local)
**Purpose**: Custom authentication and database operations for Clixen platform

**Configuration Location**: `/root/repo/claude_desktop_config.json`
```json
{
  "supabase-custom": {
    "command": "node",
    "args": ["/root/repo/mcp/supabase-mcp-server.js"],
    "env": {
      "SUPABASE_URL": "https://zfbgdixbzezpxllkoyfc.supabase.co",
      "SUPABASE_ACCESS_TOKEN": "sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f",
      "SUPABASE_SERVICE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig"
    }
  }
}
```

**Available Operations**:
- `test-connection`: Test Supabase authentication connection
- `list-users`: List all users in authentication system
- `create-user`: Create new users with metadata
- `delete-user`: Delete users by ID
- `sign-in-user`: Authenticate users with email/password
- `sign-out`: Sign out current user session
- `database-health`: Check database connectivity

**Test Command**:
```bash
export SUPABASE_URL="https://zfbgdixbzezpxllkoyfc.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1N..."
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node /root/repo/mcp/supabase-mcp-server.js
```

### 4. n8n MCP Server
**Purpose**: Expose n8n node metadata and operations to support dynamic prompt guidance, validation, and workflow compatibility checks via MCP.

**Configuration Location**: `/root/repo/claude_desktop_config.json`
```json
{
  "n8n-mcp": {
    "command": "npx",
    "args": ["-y", "@n8n-io/mcp-server-n8n"],
    "env": {
      "N8N_URL": "http://18.221.12.50:5678",
      "N8N_API_KEY": "<YOUR_N8N_API_KEY>"
    }
  }
}
```

**Available Operations**:
- `list-nodes`: Retrieve list of all available n8n nodes and versions
- `get-node-parameters`: Get detailed parameter definitions for a specified node
- `list-node-actions`: List supported operations for a given node type
- `validate-workflow`: Validate a proposed workflow JSON against node schemas
- `test-connection`: Test connectivity to the n8n instance

## Credentials and Access Tokens

### Netlify Access Token
- **Token**: `nfp_nJDfV7UNE6CQxcHdBpz2HmNc3TFyxcas7a2e`
- **Account**: jimkalinov@gmail.com (intelogroup)
- **Permissions**: Full API access, 9 sites available
- **Last Login**: 2025-07-23

### Supabase Credentials
- **Project URL**: `https://zfbgdixbzezpxllkoyfc.supabase.co`
- **Project ID**: `zfbgdixbzezpxllkoyfc`
- **Access Token**: `sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT token)
- **Status**: ACTIVE_HEALTHY
- **Region**: us-east-2
- **Database**: PostgreSQL 17.4.1.054

## Testing and Verification

### Automated Test Script
Run the comprehensive test script to verify all MCP servers:

```bash
cd /root/repo
node test-mcp-setup.js
```

This script tests:
- ✅ Netlify MCP server functionality and user access
- ✅ Supabase MCP server project listing and operations
- ✅ Custom Supabase MCP server tools and connection
- ✅ Claude Desktop configuration validity

### Manual Testing Commands

**Test Netlify user info**:
```bash
export NETLIFY_PERSONAL_ACCESS_TOKEN="nfp_nJDfV7UNE6CQxcHdBpz2HmNc3TFyxcas7a2e"
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "netlify-user-services", "arguments": {"selectSchema": {"operation": "get-user", "params": {}}}}}' | npx @netlify/mcp
```

**Test Supabase projects**:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f"
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "list_projects", "arguments": {}}}' | npx @supabase/mcp-server-supabase
```

## Integration with Clixen AI Platform

### Frontend Integration Points
The MCP servers integrate with the Clixen AI platform frontend for:

1. **Netlify Operations**:
   - Automated deployment of generated n8n workflows
   - Site management and configuration
   - Environment variable management for API keys

2. **Supabase Operations**:
   - Database operations for workflow storage
   - User authentication and management
   - Real-time updates for workflow execution status

3. **Development Workflow**:
   - Database migrations and schema updates
   - Edge Function deployment for custom logic
   - API testing and debugging

### Usage in Claude Code
These MCP servers can be used directly in Claude Code sessions for:

```bash
# Deploy Clixen frontend to Netlify
netlify-deploy-services -> deploy-site

# Execute database queries for debugging
supabase -> execute_sql

# Manage user authentication
supabase-custom -> list-users, create-user

# Get project status and logs
supabase -> get_project, get_logs
```

## Security Considerations

### Token Security
- All tokens are environment-specific and configured in Claude Desktop config
- Service role key provides admin-level database access
- Access tokens are scoped to specific operations

### Best Practices
1. Regular token rotation (quarterly recommended)
2. Monitor API usage and access logs
3. Use least-privilege access patterns
4. Backup critical configurations before changes

## Troubleshooting

### Common Issues

**MCP Server Not Found**:
```bash
# Reinstall MCP servers globally
npm install --global @netlify/mcp @supabase/mcp-server-supabase
```

**Authentication Failures**:
```bash
# Verify tokens are correctly set
echo $NETLIFY_PERSONAL_ACCESS_TOKEN
echo $SUPABASE_ACCESS_TOKEN
```

**Custom Server Dependencies**:
```bash
# Install dependencies in mcp directory
cd /root/repo/mcp
npm install @modelcontextprotocol/sdk @supabase/supabase-js
```

### Debug Commands
```bash
# Test individual MCP server connectivity
npx @netlify/mcp --help
npx @supabase/mcp-server-supabase --help

# Check Claude Desktop config syntax
cat /root/repo/claude_desktop_config.json | jq .
```

## Maintenance Schedule

- **Weekly**: Run `node test-mcp-setup.js` to verify all connections
- **Monthly**: Review API usage and performance
- **Quarterly**: Rotate access tokens and update documentation
- **As Needed**: Update MCP server versions when available

## Related Documentation

- [Clixen Project Overview](../CLAUDE.md)
- [Production Deployment Guide](./production-deployment-checklist.md)
- [Netlify Integration Guide](./netlify-deployment-guide.md)
- [Development Handoff](../devhandoff.md)

---

**Last Updated**: August 4, 2025  
**Configuration Status**: ✅ Fully Operational  
**Test Status**: ✅ All Tests Passing
