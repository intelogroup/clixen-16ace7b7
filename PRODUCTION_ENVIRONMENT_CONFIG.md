# Clixen MVP Production Environment Configuration

## ⚠️ CRITICAL SECURITY REQUIREMENTS

### Step 1: Netlify Environment Variables
**Location**: Netlify Dashboard → Site Settings → Environment Variables

**Required Variables** (MUST be configured before deployment):
```bash
# Frontend Environment Variables (VITE_ prefix for client-side)
VITE_SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw
VITE_N8N_API_URL=http://18.221.12.50:5678/api/v1
VITE_N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU
```

### Step 2: Supabase Edge Functions Environment Variables  
**Location**: Supabase Dashboard → Settings → Edge Functions

**Required Variables**:
```bash
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU
N8N_API_URL=http://18.221.12.50:5678/api/v1
OPENAI_API_KEY=[PRODUCTION_KEY_REQUIRED]
```

## 🔐 Security Verification Checklist

### ✅ Completed Security Fixes:
- [x] Removed .env from git tracking
- [x] Replaced hardcoded API keys in Edge Functions
- [x] Updated .gitignore to prevent future secret commits  
- [x] Created .env.example template
- [x] Removed hardcoded credentials from test files

### ⚠️ Manual Configuration Required:
- [ ] Set Netlify environment variables
- [ ] Set Supabase Edge Function secrets
- [ ] Configure production OpenAI API key
- [ ] Verify all Edge Functions have proper environment access

## 🚀 Deployment Commands

### Frontend Deployment (Netlify):
```bash
# Automatic deployment via git push
git push origin feature/n8n-integration-secure

# Manual deployment check
npm --prefix frontend install && npm --prefix frontend run build
```

### Backend Deployment (Supabase Edge Functions):
```bash
cd backend/supabase
supabase functions deploy --project-ref zfbgdixbzezpxllkoyfc
```

## 📊 Production Monitoring URLs

- **Frontend**: http://18.221.12.50 (Netlify deployment)
- **Supabase**: https://supabase.com/dashboard/project/zfbgdixbzezpxllkoyfc  
- **n8n**: http://18.221.12.50:5678
- **Edge Functions**: https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/

## 🧪 Production Verification Tests

### 1. Authentication Test:
- Navigate to http://18.221.12.50
- Sign up with test email: test@clixen-beta.com  
- Verify email confirmation flow
- Test login/logout functionality

### 2. Workflow Creation Test:  
- Create new project: "Beta Test Project"
- Enter chat prompt: "Send me a daily weather report"
- Verify GPT processing and n8n workflow generation
- Check workflow deployment status

### 3. Security Isolation Test:
- Create second user account
- Verify dashboard only shows user's own workflows
- Check n8n workflows have [USR-{userId}] prefixes

### 4. Performance Test:
- Check page load times < 3 seconds
- Verify bundle size < 200KB gzipped  
- Test mobile responsiveness

## ⚠️ Known Production Limitations (50-User MVP)

1. **n8n Admin Access**: Admin panel shows all workflows (users can't access)
2. **Execution Logs**: Global logs with user prefixes for identification  
3. **Resource Limits**: Shared across all users (monitoring for abuse)
4. **OpenAI Rate Limits**: Shared API key across all users

## 📈 MVP Success Metrics to Monitor

- **User Onboarding**: ≥70% complete first workflow within 10 minutes
- **Workflow Persistence**: ≥90% of generated workflows saved and retrievable  
- **Deployment Success**: ≥80% of workflows successfully deployed to n8n
- **System Uptime**: ≥99% availability during beta period
- **Error Rate**: <5% of user interactions result in errors

## 🆘 Emergency Procedures

### If Production Goes Down:
1. Check Netlify deployment status
2. Verify Supabase service health  
3. Check n8n container status at 18.221.12.50
4. Roll back to previous deployment if needed

### If Security Incident:
1. Immediately rotate all API keys
2. Review user activity logs in Supabase
3. Check for unauthorized n8n workflow creation
4. Notify beta users of any data concerns