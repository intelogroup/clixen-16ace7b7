#!/bin/bash

# Netlify Backend Environment Variables Setup Script
# Site ID: 25d322b9-42d3-4b1a-b921-ba7ac240ec8b
# Site URL: https://clixen.netlify.app

echo "Setting up Netlify backend environment variables..."
echo "Make sure you're authenticated with: netlify login"

# Site context
SITE_ID="25d322b9-42d3-4b1a-b921-ba7ac240ec8b"

# Backend environment variables (non-VITE_ prefixed for serverless functions)
echo "Setting backend environment variables..."

# Supabase Configuration
netlify env:set SUPABASE_URL "https://zfbgdixbzezpxllkoyfc.supabase.co" --context "all" --site "$SITE_ID"
netlify env:set SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw" --context "all" --site "$SITE_ID"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig" --context "all" --site "$SITE_ID"
netlify env:set SUPABASE_JWT_SECRET "K1DeOU0LsLIZSeK87bTNdRks7cBiHb8NlzJHia59gOS4vgWyeb0bEhgGUgFVYUGLng5wYoG6LZ+0FL1uAZ7A4w==" --context "all" --site "$SITE_ID"
netlify env:set DATABASE_URL "postgresql://postgres.zfbgdixbzezpxllkoyfc:Jimkali90#@aws-0-us-east-2.pooler.supabase.com:5432/postgres" --context "all" --site "$SITE_ID"
netlify env:set SUPABASE_ACCESS_TOKEN "sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f" --context "all" --site "$SITE_ID"

# n8n Configuration
netlify env:set N8N_API_URL "http://18.221.12.50:5678/api/v1" --context "all" --site "$SITE_ID"
netlify env:set N8N_API_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU" --context "all" --site "$SITE_ID"

# OpenAI Configuration
netlify env:set OPENAI_API_KEY "your-openai-api-key-here" --context "all" --site "$SITE_ID"

echo "Backend environment variables have been set!"
echo ""
echo "To verify the variables were set correctly, run:"
echo "netlify env:list --context production --site $SITE_ID"
echo ""
echo "Note: These variables are now available to your Netlify serverless functions"
echo "but NOT to your frontend build process (use VITE_ prefixed versions for frontend)."