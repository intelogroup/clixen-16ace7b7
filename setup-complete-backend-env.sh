#!/bin/bash

# Complete Backend Environment Variables Setup Script for Clixen
# This script sets ALL required environment variables for full backend functionality

echo "================================================"
echo "🚀 COMPLETE BACKEND ENVIRONMENT SETUP"
echo "================================================"
echo ""
echo "Setting up all Netlify environment variables..."
echo "Make sure you're authenticated with: netlify login"
echo ""

# Site context
SITE_ID="25d322b9-42d3-4b1a-b921-ba7ac240ec8b"

echo "📦 Setting Supabase Core Variables..."
# Supabase Core Configuration
netlify env:set SUPABASE_URL "https://zfbgdixbzezpxllkoyfc.supabase.co" --context all --site "$SITE_ID"
netlify env:set VITE_SUPABASE_URL "https://zfbgdixbzezpxllkoyfc.supabase.co" --context all --site "$SITE_ID"

netlify env:set SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw" --context all --site "$SITE_ID"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw" --context all --site "$SITE_ID"

netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig" --context all --site "$SITE_ID"
netlify env:set VITE_SUPABASE_SERVICE_ROLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig" --context all --site "$SITE_ID"

netlify env:set SUPABASE_JWT_SECRET "K1DeOU0LsLIZSeK87bTNdRks7cBiHb8NlzJHia59gOS4vgWyeb0bEhgGUgFVYUGLng5wYoG6LZ+0FL1uAZ7A4w==" --context all --site "$SITE_ID"

echo "🗄️ Setting Database Connection Strings..."
# Database Connections
netlify env:set DATABASE_URL "postgresql://postgres.zfbgdixbzezpxllkoyfc:Jimkali90#@aws-0-us-east-2.pooler.supabase.com:5432/postgres" --context all --site "$SITE_ID"
netlify env:set DATABASE_URL_DIRECT "postgresql://postgres:Jimkali90#@db.zfbgdixbzezpxllkoyfc.supabase.co:5432/postgres" --context all --site "$SITE_ID"
netlify env:set DATABASE_URL_TRANSACTION "postgresql://postgres.zfbgdixbzezpxllkoyfc:Jimkali90#@aws-0-us-east-2.pooler.supabase.com:6543/postgres" --context all --site "$SITE_ID"

echo "☁️ Setting Supabase S3 Storage Variables..."
# Supabase S3 Storage Configuration
netlify env:set SUPABASE_S3_ACCESS_KEY_ID "a7fd4d8859b3570c887c08691c1fb043" --context all --site "$SITE_ID"
netlify env:set SUPABASE_S3_SECRET_ACCESS_KEY "f96397de70f40bdba5373cbec513da1014487419e34695f3e2b776c04a8fd986" --context all --site "$SITE_ID"
netlify env:set SUPABASE_S3_REGION "us-east-2" --context all --site "$SITE_ID"
netlify env:set SUPABASE_S3_ENDPOINT "https://zfbgdixbzezpxllkoyfc.storage.supabase.co/storage/v1/s3" --context all --site "$SITE_ID"

echo "🔑 Setting Access Tokens..."
# Access Tokens
netlify env:set SUPABASE_ACCESS_TOKEN "sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f" --context all --site "$SITE_ID"
netlify env:set NETLIFY_ACCESS_TOKEN "nfp_nJDfV7UNE6CQxcHdBpz2HmNc3TFyxcas7a2e" --context all --site "$SITE_ID"

echo "🔄 Setting n8n Configuration..."
# n8n Configuration
netlify env:set N8N_API_URL "http://18.221.12.50:5678/api/v1" --context all --site "$SITE_ID"
netlify env:set VITE_N8N_API_URL "http://18.221.12.50:5678/api/v1" --context all --site "$SITE_ID"
netlify env:set N8N_API_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU" --context all --site "$SITE_ID"
netlify env:set VITE_N8N_API_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU" --context all --site "$SITE_ID"

echo "🤖 Setting OpenAI Configuration..."
# OpenAI Configuration
# IMPORTANT: Replace with your actual OpenAI API key
netlify env:set OPENAI_API_KEY "your-openai-api-key-here" --context all --site "$SITE_ID"
netlify env:set VITE_OPENAI_API_KEY "your-openai-api-key-here" --context all --site "$SITE_ID"

echo ""
echo "================================================"
echo "✅ ALL ENVIRONMENT VARIABLES HAVE BEEN SET!"
echo "================================================"
echo ""
echo "📊 Total Variables Set: 24"
echo ""
echo "To verify the variables were set correctly, run:"
echo "netlify env:list --context all --site $SITE_ID"
echo ""
echo "To trigger a new deployment with these variables:"
echo "netlify deploy --build --site $SITE_ID"
echo ""
echo "🧪 To test the backend after deployment:"
echo "node test-backend-complete.cjs"
echo ""