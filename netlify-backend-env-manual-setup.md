# Netlify Backend Environment Variables - Manual Setup Guide

## Site Information
- **Site ID**: `25d322b9-42d3-4b1a-b921-ba7ac240ec8b`
- **Site URL**: https://clixen.netlify.app
- **Dashboard URL**: https://app.netlify.com/sites/25d322b9-42d3-4b1a-b921-ba7ac240ec8b/settings/env

## Manual Setup Steps

1. Go to your Netlify dashboard: https://app.netlify.com
2. Navigate to your Clixen site
3. Go to Site settings → Environment variables
4. Add the following variables with "All" scope:

### Backend Environment Variables (for Serverless Functions)

**Supabase Configuration:**
```
Variable: SUPABASE_URL
Value: https://zfbgdixbzezpxllkoyfc.supabase.co
Context: All

Variable: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw
Context: All

Variable: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig
Context: All

Variable: SUPABASE_JWT_SECRET
Value: K1DeOU0LsLIZSeK87bTNdRks7cBiHb8NlzJHia59gOS4vgWyeb0bEhgGUgFVYUGLng5wYoG6LZ+0FL1uAZ7A4w==
Context: All

Variable: DATABASE_URL
Value: postgresql://postgres.zfbgdixbzezpxllkoyfc:Jimkali90#@aws-0-us-east-2.pooler.supabase.com:5432/postgres
Context: All

Variable: SUPABASE_ACCESS_TOKEN
Value: sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f
Context: All
```

**n8n Configuration:**
```
Variable: N8N_API_URL
Value: http://18.221.12.50:5678/api/v1
Context: All

Variable: N8N_API_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU
Context: All
```

**OpenAI Configuration:**
```
Variable: OPENAI_API_KEY
Value: your-openai-api-key-here
Context: All
```

## Important Notes

1. **These are backend variables** (no VITE_ prefix) - they will be available to your Netlify serverless functions but NOT to your frontend build process.

2. **Context: All** - This makes the variables available in production, deploy-preview, and branch-deploy contexts.

3. **Security**: These variables contain sensitive keys. Make sure your Netlify account has proper access controls.

4. **Frontend vs Backend**: 
   - VITE_ prefixed variables = Available to frontend build process
   - Non-VITE_ variables = Available to serverless functions only

## Verification

After setting these variables:

1. Trigger a new deployment to pick up the new environment variables
2. Check your serverless function logs to ensure they can access the variables
3. Test API endpoints that rely on these backend configurations

## CLI Alternative

If you prefer using the CLI, authenticate first and then run:
```bash
./set-netlify-backend-env.sh
```

This will set all the variables programmatically.