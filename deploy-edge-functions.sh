#!/bin/bash

# Deployment script for Supabase Edge Functions
# Run this script to deploy all AI chat functions

echo "🚀 Deploying Supabase Edge Functions..."

# Set environment variables
export SUPABASE_URL="https://zfbgdixbzezpxllkoyfc.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig"
export OPENAI_API_KEY="${OPENAI_API_KEY:-your-openai-api-key-here}"

# Deploy each function
echo "Deploying ai-chat-system..."
supabase functions deploy ai-chat-system --project-ref zfbgdixbzezpxllkoyfc
echo "Deploying ai-chat-sessions..."
supabase functions deploy ai-chat-sessions --project-ref zfbgdixbzezpxllkoyfc
echo "Deploying ai-chat-stream..."
supabase functions deploy ai-chat-stream --project-ref zfbgdixbzezpxllkoyfc

echo "✅ All functions deployed successfully!"
echo "📋 Available endpoints:"
echo "  - ai-chat-system: https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-system"
echo "  - ai-chat-sessions: https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-sessions"
echo "  - ai-chat-stream: https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-stream"
