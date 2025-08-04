#!/bin/bash

# Deploy API Operations Edge Function to Supabase
# This script deploys the comprehensive API operations function

echo "🚀 Deploying API Operations Edge Function to Supabase..."

# Set environment variables
export SUPABASE_ACCESS_TOKEN="sbp_b23d39d9adc897d932f1444da2dd24a00f0f149f"
export SUPABASE_PROJECT_REF="zfbgdixbzezpxllkoyfc"

# Function name
FUNCTION_NAME="api-operations"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Login to Supabase (if not already logged in)
echo "🔐 Logging in to Supabase..."
supabase login --token $SUPABASE_ACCESS_TOKEN

# Link to the project
echo "🔗 Linking to Supabase project..."
supabase link --project-ref $SUPABASE_PROJECT_REF

# Deploy the function
echo "📦 Deploying $FUNCTION_NAME function..."
supabase functions deploy $FUNCTION_NAME --project-ref $SUPABASE_PROJECT_REF

# Set environment variables for the function
echo "⚙️ Setting environment variables..."
supabase secrets set --project-ref $SUPABASE_PROJECT_REF \
  SUPABASE_URL="https://zfbgdixbzezpxllkoyfc.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig" \
  N8N_API_URL="http://18.221.12.50:5678/api/v1" \
  N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU"

echo "✅ API Operations function deployed successfully!"
echo ""
echo "🌐 Function URL: https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/api-operations"
echo ""
echo "📚 Available endpoints:"
echo "  GET  /health - Health check"
echo "  GET  /workflows - List all workflows"
echo "  GET  /workflows/{id} - Get specific workflow"
echo "  POST /workflows - Create new workflow"
echo "  PUT  /workflows/{id} - Update workflow"
echo "  DELETE /workflows/{id} - Delete workflow"
echo "  POST /workflows/{id}/toggle - Activate/deactivate workflow"
echo "  POST /workflows/{id}/execute - Execute workflow"
echo "  GET  /executions - List executions"
echo "  POST /batch - Batch operations"
echo ""
echo "🔑 Authentication: Include 'Authorization: Bearer <supabase-jwt-token>' header"
echo "🛡️ Features: Rate limiting, quota management, API usage tracking"