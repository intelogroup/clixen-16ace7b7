# Netlify Environment Variables Configuration

## Required Frontend Environment Variables (VITE_ prefix)

These variables are required for the **frontend build process** and must be set in your Netlify dashboard under **Site settings > Environment variables**.

### 🔧 Supabase Configuration
```
VITE_SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw
```

### 🤖 AI Configuration  
```
VITE_OPENAI_API_KEY=your-openai-api-key-here
```

### ⚙️ n8n Configuration
```
VITE_N8N_API_URL=http://18.221.12.50:5678/api/v1
VITE_N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU
```

## Required Backend Environment Variables (for Netlify Functions)

These are required for serverless functions and are already configured in `netlify.toml`.

### 🗄️ Backend Configuration
```
SUPABASE_URL=https://zfbgdixbzezpxllkoyfc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N10.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig
N8N_API_URL=http://18.221.12.50:5678/api/v1
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU
OPENAI_API_KEY=your-openai-api-key-here
```

---

## 🚀 How to Add Environment Variables to Netlify

### Method 1: Netlify Dashboard
1. Go to your site dashboard on [netlify.com](https://netlify.com)
2. Navigate to **Site settings > Environment variables**
3. Click **Add a variable**
4. Add each variable with the exact name and value above

### Method 2: Netlify CLI
```bash
# Install Netlify CLI if not already installed
npm install -g netlify-cli

# Login to Netlify
netlify login

# Set environment variables (run from your project root)
netlify env:set VITE_SUPABASE_URL "https://zfbgdixbzezpxllkoyfc.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw"
netlify env:set VITE_OPENAI_API_KEY "your-openai-api-key-here"
netlify env:set VITE_N8N_API_URL "http://18.221.12.50:5678/api/v1"
netlify env:set VITE_N8N_API_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU"
```

---

## ✅ What These Variables Fix

1. **VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY**: Enable authentication and database access
2. **VITE_OPENAI_API_KEY**: Enable the multi-agent AI system 
3. **VITE_N8N_API_URL & VITE_N8N_API_KEY**: Enable workflow deployment and management

## ⚠️ Critical Notes

- **VITE_ prefix is required** for frontend variables in Vite/React applications
- **Without these variables**, the app will show demo mode or authentication errors
- **All variables are already configured** in `netlify.toml` for serverless functions
- **Test credentials**: jimkalinov@gmail.com / Jimkali90#

## 🔒 Security

- These API keys are for the Clixen production environment
- The Supabase anon key is safe for client-side use (RLS policies apply)
- The service role key is only used in serverless functions (server-side)

---

**After adding these variables, your next deployment will have full functionality without demo mode restrictions.**