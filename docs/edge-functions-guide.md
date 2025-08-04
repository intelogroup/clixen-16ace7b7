# AI Chat System Edge Functions

## Overview

This project includes three Supabase Edge Functions for a comprehensive AI chat system:

### 1. ai-chat-system
**Endpoint**: `https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-system`

Main multi-agent AI chat function supporting:
- Multi-agent coordination (Orchestrator, Workflow Designer, Deployment, System agents)
- OpenAI GPT-4 integration
- Conversation history management
- Agent state persistence
- Error handling and recovery

**Request Format**:
```json
{
  "message": "Your message here",
  "user_id": "uuid",
  "session_id": "uuid" (optional),
  "agent_type": "orchestrator" (optional)
}
```

**Response Format**:
```json
{
  "response": "AI response",
  "agent_type": "orchestrator",
  "message_id": "uuid",
  "session_id": "uuid",
  "processing_time": 1500,
  "tokens_used": 150,
  "conversation_context": {},
  "next_agent": "workflow_designer" (optional)
}
```

### 2. ai-chat-sessions
**Endpoint**: `https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-sessions`

Session management endpoints:
- `GET /ai-chat-sessions?user_id=uuid` - List user sessions
- `POST /ai-chat-sessions` - Create new session
- `PUT /ai-chat-sessions/update-title` - Update session title
- `PUT /ai-chat-sessions/archive` - Archive session
- `DELETE /ai-chat-sessions?session_id=uuid&user_id=uuid` - Delete session

### 3. ai-chat-stream
**Endpoint**: `https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-stream`

Streaming chat responses using Server-Sent Events:
- Real-time response streaming
- Agent-specific streaming prompts
- Automatic conversation storage
- Error handling during streaming

**Usage**:
```javascript
const eventSource = new EventSource(`${SUPABASE_URL}/functions/v1/ai-chat-stream`, {
  method: 'POST',
  body: JSON.stringify({
    message: 'Hello',
    user_id: 'uuid',
    session_id: 'uuid'
  })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'chunk') {
    console.log(data.content);
  }
};
```

## Environment Variables

The following environment variables are required:
- `SUPABASE_URL`: https://zfbgdixbzezpxllkoyfc.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: [Service role key]
- `OPENAI_API_KEY`: [OpenAI API key]

## Database Schema

The functions use these database tables:
- `ai_chat_sessions`: Chat session management
- `ai_chat_messages`: Message storage
- `ai_agent_states`: Agent state persistence
- `openai_configurations`: OpenAI settings

## Deployment

1. Run the setup: `node scripts/setup-edge-functions.js`
2. Deploy functions: `./deploy-edge-functions.sh`
3. Test functions: `node test-edge-functions.js`

## Security

- All functions use Row Level Security (RLS)
- Service role key required for admin operations
- User isolation enforced at database level
- CORS properly configured for frontend access
