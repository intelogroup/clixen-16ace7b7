# 🚀 Deploy Clixen to Existing Netlify Site

## Site Information
- **Site ID**: sparkly-kitten-5c6fd9
- **Admin URL**: https://app.netlify.com/projects/sparkly-kitten-5c6fd9/
- **Expected Live URL**: https://sparkly-kitten-5c6fd9.netlify.app

## 📋 Deployment Steps

### Step 1: Repository Connection
1. Go to: https://app.netlify.com/projects/sparkly-kitten-5c6fd9/settings/deploys
2. Under "Repository", click "Link repository"
3. Select GitHub and authorize if needed
4. Choose repository: `intelogroup/clixen`
5. Set branch: `terragon/test-app-frontend-netlify-supabase-mcp`

### Step 2: Build Settings
Configure these settings in the "Build settings" section:

```
Base directory: (leave empty)
Build command: npm install && npm run build
Publish directory: dist
Functions directory: netlify/functions
```

### Step 3: Environment Variables
Go to: https://app.netlify.com/projects/sparkly-kitten-5c6fd9/settings/env

Add these variables:

```bash
# Frontend Build Variables
VITE_SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw
VITE_N8N_API_URL=http://18.221.12.50:5678/api/v1
VITE_N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU

# Function Runtime Variables
SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig
N8N_API_URL=http://18.221.12.50:5678/api/v1
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU

# Build Environment
NODE_VERSION=20

# Optional: Add your OpenAI API key for full AI agent functionality
VITE_OPENAI_API_KEY=your-openai-api-key-here
```

### Step 4: Deploy
1. Go to: https://app.netlify.com/projects/sparkly-kitten-5c6fd9/deploys
2. Click "Trigger deploy" → "Deploy site"
3. Wait for build to complete (~2-3 minutes)

## ✅ What You'll Get

**🌐 Live Application**: https://sparkly-kitten-5c6fd9.netlify.app

**🤖 Features**:
- Multi-agent AI chat interface
- Supabase authentication (test with jayveedz19@gmail.com / Jimkali90#)
- n8n workflow automation
- Real-time agent coordination
- Production-ready serverless functions

**📊 Performance**:
- ~300KB optimized bundle
- Global CDN delivery
- Sub-second load times
- Auto-scaling serverless functions

## 🧪 Test Endpoints

After deployment, test these:

```bash
# Frontend app
https://sparkly-kitten-5c6fd9.netlify.app

# API health check
https://sparkly-kitten-5c6fd9.netlify.app/.netlify/functions/api-proxy?endpoint=health

# Environment verification
https://sparkly-kitten-5c6fd9.netlify.app/.netlify/functions/api-proxy?endpoint=env-check
```

## 🎯 Expected Build Output

```
✓ 2173 modules transformed.
✓ built in ~45s
dist/index.html                     1.46 kB
dist/assets/index-[hash].css        28.49 kB │ gzip: 5.74 kB
dist/assets/index-[hash].js         303.14 kB │ gzip: 84.26 kB
```

Your Clixen AI platform will be live and fully operational!