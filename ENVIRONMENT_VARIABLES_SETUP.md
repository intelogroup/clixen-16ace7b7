# 🔧 Supabase Environment Variables Configuration Guide

**CRITICAL**: These environment variables MUST be set in Supabase Dashboard for production to work

## 📋 Required Environment Variables

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/zfbgdixbzezpxllkoyfc
2. Navigate to: **Settings** → **Edge Functions** → **Environment Variables**

### Step 2: Add the Following Variables

```bash
# OpenAI API Key (CRITICAL - without this, workflow creation fails)
OPENAI_API_KEY=sk-[YOUR-PRODUCTION-OPENAI-KEY-HERE]

# n8n API Configuration
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU
N8N_API_URL=http://18.221.12.50:5678/api/v1

# Resend Email API (for email workflows)
RESEND_API_KEY=re_eP6sgKMF_ELjbAvaFyFEsSbnj3pzFUJm2

# Additional Service Keys (already configured but verify)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig
```

### Step 3: Verify Configuration
After adding the variables, test with:

```bash
curl -X POST "https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-simple" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw" \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "projectId": "test-project"}'
```

Expected: Should return a response within 45 seconds (not hang indefinitely)

## ⚠️ IMPORTANT NOTES

1. **OPENAI_API_KEY**: Get your production key from https://platform.openai.com/api-keys
2. **Security**: Never commit these keys to git
3. **Edge Functions**: May need to redeploy functions after setting environment variables
4. **Verification**: Test each Edge Function after configuration

## 📊 Impact of Missing Variables

| Variable | Impact if Missing | Symptoms |
|----------|------------------|-----------|
| OPENAI_API_KEY | 100% workflow creation failure | Infinite loading, 500 errors |
| N8N_API_KEY | Cannot deploy workflows | Workflow deployment fails |
| N8N_API_URL | Cannot connect to n8n | No workflow execution |
| RESEND_API_KEY | Email delivery fails | No email notifications |

## ✅ Success Verification

Once configured, all Edge Functions should:
- Respond within 45 seconds
- Not return 500 errors about missing keys
- Successfully create and deploy workflows
- Send email notifications

---

**Created**: August 13, 2025
**Priority**: CRITICAL - Production Blocker
**Time Required**: 15 minutes in Supabase Dashboard