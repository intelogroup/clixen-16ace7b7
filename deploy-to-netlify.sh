#!/bin/bash

# Clixen AI Platform - Netlify Deployment Script
# Run this script after authenticating with: netlify login

set -e

echo "🚀 Deploying Clixen AI Platform to Netlify..."

# Build the application
echo "📦 Building application..."
npm run build

# Deploy to Netlify
echo "🌐 Creating new Netlify site..."
netlify deploy --build --prod \
  --site-name "clixen-ai-platform" \
  --functions netlify/functions \
  --dir dist

# Set environment variables
echo "⚙️ Setting environment variables..."
netlify env:set VITE_SUPABASE_URL "https://zfbgdixbzezpxllkoyfc.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig"
netlify env:set VITE_N8N_API_URL "http://18.221.12.50:5678/api/v1"
netlify env:set VITE_N8N_API_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU"

echo "✅ Deployment complete!"
echo "🌐 Your site should be available at the URL shown above"
echo ""
echo "📝 Don't forget to:"
echo "   1. Add your OpenAI API key: netlify env:set VITE_OPENAI_API_KEY your-key"
echo "   2. Set a webhook secret: netlify env:set WEBHOOK_SECRET your-secret"
echo "   3. Configure any custom domain if needed"
echo ""
echo "🔍 Check deployment status: netlify status"
echo "📊 View site info: netlify open"