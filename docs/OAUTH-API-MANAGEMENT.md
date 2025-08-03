# OAuth & Centralized API Management System

## Overview

The Clixen platform implements a sophisticated dual-layer API management system:
1. **OAuth-based services**: User-specific permissions for services like Google, Microsoft, Dropbox
2. **Centralized APIs**: Platform-managed services like WhatsApp, Twilio, OpenAI

## Architecture

### OAuth Flow
```
User → Workflow Creation → Permission Detection → OAuth Modal → Service Auth → Token Storage → Workflow Execution
```

### Centralized API Flow
```
User → Workflow Creation → API Detection → Quota Check → API Call → Usage Tracking → Cost Calculation
```

## Components

### 1. OAuthManager (`src/lib/oauth/OAuthManager.ts`)
- Detects required OAuth scopes from workflow descriptions
- Manages OAuth flow initiation and callback handling
- Stores and refreshes tokens securely
- Checks existing permissions

**Key Methods:**
- `detectRequiredScopes(workflowDescription)`: Analyzes workflow to determine needed permissions
- `initiateOAuthFlow(userId, service, scopes)`: Starts OAuth authentication
- `handleOAuthCallback(code, state)`: Processes OAuth callback
- `getValidToken(userId, service)`: Retrieves valid access token

### 2. CentralizedAPIManager (`src/lib/api/CentralizedAPIManager.ts`)
- Manages platform-wide API keys
- Implements rate limiting per API
- Tracks usage and enforces quotas
- Provides service-specific helper methods

**Key Methods:**
- `callAPI(apiName, userId, endpoint, options)`: Generic API caller with rate limiting
- `checkUserQuota(userId, apiName)`: Verifies user hasn't exceeded limits
- `sendWhatsAppMessage()`: WhatsApp-specific helper
- `createOpenAICompletion()`: OpenAI-specific helper
- `sendTwilioSMS()`: Twilio-specific helper

### 3. PermissionModal (`src/components/PermissionModal.tsx`)
- User-friendly permission request interface
- Shows exactly what permissions are needed and why
- Handles OAuth flow in popup windows
- Displays platform services that don't need auth

### 4. Database Schema

#### user_oauth_tokens
```sql
- id: UUID
- user_id: UUID (references auth.users)
- service: TEXT (google, microsoft, dropbox, etc.)
- access_token: TEXT (encrypted)
- refresh_token: TEXT (encrypted)
- expires_at: TIMESTAMP
- scopes: TEXT[]
```

#### api_usage
```sql
- id: UUID
- user_id: UUID
- api_name: TEXT
- usage_count: INTEGER
- tokens_used: INTEGER
- period_start: TIMESTAMP
- period_end: TIMESTAMP
```

#### api_quotas
```sql
- tier: TEXT (free, pro, enterprise)
- api_name: TEXT
- monthly_limit: INTEGER
- daily_limit: INTEGER
- rate_limit_per_minute: INTEGER
```

## Setup Guide

### 1. Database Migration
Run the migration to create necessary tables:
```bash
psql $DATABASE_URL < supabase/migrations/002_oauth_and_api_management.sql
```

### 2. OAuth Application Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable necessary APIs (Gmail, Drive, Sheets, etc.)
4. Create OAuth 2.0 credentials
5. Add redirect URI: `https://your-domain.com/auth/callback`
6. Copy Client ID and Secret to `.env`

#### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com)
2. Register new application
3. Add redirect URI: `https://your-domain.com/auth/callback`
4. Create client secret
5. Copy Application ID and Secret to `.env`

#### Dropbox OAuth
1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Create new app
3. Add redirect URI
4. Copy App key and Secret to `.env`

### 3. Centralized API Setup

#### WhatsApp Business
1. Create Meta Business account
2. Set up WhatsApp Business API
3. Get access token and phone number ID
4. Add to `.env`

#### Twilio
1. Sign up at [Twilio](https://www.twilio.com)
2. Get Account SID and Auth Token
3. Purchase phone number
4. Add credentials to `.env`

#### SendGrid
1. Sign up at [SendGrid](https://sendgrid.com)
2. Create API key
3. Verify sender domain
4. Add API key to `.env`

### 4. Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

## Usage Examples

### Detecting Required Permissions
```typescript
const orchestrator = new OrchestratorAgent(context);
const permissions = await orchestrator.detectRequiredPermissions(
  "Send emails from Gmail when Google Sheets is updated"
);
// Returns: 
// {
//   oauthServices: Map { 'google' => ['gmail.send', 'sheets.read'] },
//   centralizedAPIs: [],
//   allPermissionsGranted: false
// }
```

### Checking User Quotas
```typescript
const hasQuota = await CentralizedAPIManager.checkUserQuota(userId, 'whatsapp');
if (!hasQuota) {
  throw new Error('Monthly WhatsApp message limit exceeded');
}
```

### Sending WhatsApp Message
```typescript
await CentralizedAPIManager.sendWhatsAppMessage(
  userId,
  '+1234567890',
  'Your workflow has completed successfully!'
);
```

## Security Considerations

1. **Token Encryption**: All OAuth tokens are encrypted at rest in the database
2. **Scope Limitation**: Only request minimum necessary scopes
3. **Token Refresh**: Automatic refresh before expiration
4. **Rate Limiting**: Prevents API abuse and cost overruns
5. **Quota Management**: Per-user limits based on subscription tier
6. **Audit Logging**: All API usage is tracked for compliance

## Quota Tiers

### Free Tier
- WhatsApp: 100 messages/month
- OpenAI: 1000 requests/month
- Twilio: 50 SMS/month
- SendGrid: 100 emails/day

### Pro Tier
- WhatsApp: 1000 messages/month
- OpenAI: 10000 requests/month
- Twilio: 500 SMS/month
- SendGrid: 1000 emails/day

### Enterprise Tier
- Unlimited usage
- Priority support
- Custom rate limits
- Dedicated infrastructure

## Troubleshooting

### OAuth Issues
1. **Invalid redirect URI**: Ensure callback URL matches exactly in OAuth provider settings
2. **Expired tokens**: Check if refresh token exists and is valid
3. **Missing scopes**: User may need to re-authenticate with additional permissions

### API Rate Limiting
1. **429 errors**: Implement exponential backoff
2. **Quota exceeded**: Check user's tier and usage
3. **Service unavailable**: Check API provider status

### Common Errors
- `"Invalid OAuth state"`: State token expired or invalid
- `"Quota exceeded"`: User hit their monthly/daily limit
- `"Rate limit exceeded"`: Too many requests in short period
- `"API key not configured"`: Missing environment variable

## Best Practices

1. **Progressive Permission Requests**: Only ask for permissions when needed
2. **Clear Explanations**: Tell users exactly why each permission is needed
3. **Graceful Degradation**: Provide alternatives when permissions are denied
4. **Usage Monitoring**: Track API usage to prevent bill surprises
5. **Error Recovery**: Implement retry logic with exponential backoff
6. **Token Management**: Refresh tokens proactively before expiration

## Future Enhancements

1. **More OAuth Providers**: GitHub, Notion, Spotify, etc.
2. **Dynamic Quota Adjustment**: Based on usage patterns
3. **Cost Estimation**: Show estimated costs before workflow execution
4. **Webhook Support**: For real-time OAuth events
5. **Multi-tenant Isolation**: Separate API keys per organization
6. **Advanced Analytics**: Detailed usage reports and insights