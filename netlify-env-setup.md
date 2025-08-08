# Netlify Environment Variables Setup

## Required Environment Variables

To complete the deployment, you need to set the following environment variables in your Netlify dashboard:

### Step 1: Access Netlify Dashboard
1. Go to https://app.netlify.com/
2. Navigate to your site settings
3. Go to "Environment Variables" section

### Step 2: Add Required Variables

Set the following environment variables:

```bash
VITE_SUPABASE_URL="https://zfbgdixbzezpxllkoyfc.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw"
VITE_N8N_API_URL="http://18.221.12.50:5678/api/v1"
VITE_N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU"
VITE_OPENAI_API_KEY="your-openai-api-key-here"
```

### Step 3: Deploy Contexts
Set these variables for all deploy contexts:
- **Production**
- **Deploy Previews** 
- **Branch Deploys**

### Step 4: Trigger Redeploy
After setting the environment variables, trigger a new deploy by pushing to main branch or using the "Trigger deploy" button in Netlify dashboard.

## Security Note
These variables are now stored securely in Netlify's environment variable system instead of being hardcoded in the repository, which resolves the secrets scanning issue.